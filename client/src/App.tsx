import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Code2, CornerDownLeft, Menu, MessageCircle, RotateCcw, Search, Send, Sparkles, X } from "lucide-react";
import { createTrace, type TraceStep } from "./algorithms";
import { groups, sampleEdges, sampleNodes, topics, type Topic } from "./data";
import GraphCard from "./GraphCard";
import { formatDijkstraTrace, parseGraphPrompt, type StudentGraph } from "./interactiveGraph";

type ChatMessage = { role:"user"|"assistant"; content:string; graph?:StudentGraph };
const STARTER:ChatMessage = {role:"assistant",content:"Hi! I'm your Group 4 study companion. Ask about a concept or request an interactive graph. For Dijkstra, include weighted connections such as A-B: 4."};
const STORAGE_KEY="graphite-course-progress-v1";
const INITIAL_PROGRESS:string[]=[];
function loadProgress():string[]{try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):INITIAL_PROGRESS}catch{return INITIAL_PROGRESS}}
function nodePositions(width=520,height=230):Record<string,[number,number]>{return {A:[50,height/2],B:[width*.34,45],C:[width*.68,45],D:[width*.34,height-45],E:[width*.68,height-45],F:[width-50,height/2]}}
function Graph({step}: {step:TraceStep}) {
  const pos=nodePositions();
  return <svg className="graph-svg" viewBox="0 0 520 230" role="img" aria-label={`Sample graph. Current node: ${step.current||"none"}`}>
    {sampleEdges.map(([a,b,w])=>{const [x1,y1]=pos[a],[x2,y2]=pos[b];const active=step.highlighted?.includes([a,b].sort().join(""));return <g key={a+b}><line x1={x1} y1={y1} x2={x2} y2={y2} className={active?"edge edge-active":"edge"}/>{w>0&&<><rect x={(x1+x2)/2-11} y={(y1+y2)/2-10} width="22" height="18" rx="5" className="weight-bg"/><text x={(x1+x2)/2} y={(y1+y2)/2+4} textAnchor="middle" className="weight">{w}</text></>}</g>})}
    {sampleNodes.map(node=>{const [cx,cy]=pos[node];const current=step.current===node,visited=step.visited.includes(node),waiting=step.waiting.includes(node);const dist=step.distances?.[node];return <g key={node}><circle cx={cx} cy={cy} r="19" className={current?"node node-current":visited?"node node-visited":waiting?"node node-waiting":"node"}/><text x={cx} y={cy+5} textAnchor="middle" className={current?"node-label node-label-active":"node-label"}>{node}</text>{dist!==undefined&&<text x={cx} y={cy+36} textAnchor="middle" className="distance">{dist===Infinity?"∞":dist}</text>}</g>})}
  </svg>;
}
function App() {
  const [topicId,setTopicId]=useState("bfs"),[filter,setFilter]=useState(""),[activeTab,setActiveTab]=useState<"overview"|"code"|"practice">("overview");
  const [completed,setCompleted]=useState<string[]>(loadProgress),[stepIndex,setStepIndex]=useState(0),[sidebarOpen,setSidebarOpen]=useState(false);
  const [messages,setMessages]=useState<ChatMessage[]>([STARTER]),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[activeGraph,setActiveGraph]=useState<StudentGraph|null>(null);
  const [provider,setProvider]=useState<string|null>(null),[apiStatus,setApiStatus]=useState<"checking"|"ready"|"setup">("checking"),[feedback,setFeedback]=useState<{text:string;correct:boolean;selected:number}|null>(null);
  const chatEnd=useRef<HTMLDivElement>(null),graphStart=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null);
  const topic=topics.find(t=>t.id===topicId)??topics[0];
  const trace=useMemo(()=>topic.trace?createTrace(topic.trace):[],[topic.trace]);
  const step=trace[Math.min(stepIndex,trace.length-1)]??{current:null,visited:[],waiting:[],detail:"",label:"",value:""} as TraceStep;
  const filtered=useMemo(()=>{const q=filter.trim().toLowerCase();return topics.filter(t=>!q||(t.title+" "+t.keywords+" "+t.group).toLowerCase().includes(q))},[filter]);
  const count=completed.length;
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(completed))}catch{}},[completed]);
  useEffect(()=>{if(messages[messages.length-1]?.graph)graphStart.current?.scrollIntoView({behavior:"smooth",block:"start"});else chatEnd.current?.scrollIntoView({behavior:"smooth",block:"end"})},[messages.length,busy]);
  useEffect(()=>{fetch("/api/health").then(r=>r.json()).then(d=>{setApiStatus(d.configured?"ready":"setup")}).catch(()=>setApiStatus("setup"))},[]);
  function selectTopic(next:Topic){setTopicId(next.id);setStepIndex(0);setActiveTab("overview");setSidebarOpen(false);setFeedback(null)}
  function ask(text:string){setDraft(text);input.current?.focus()}
  async function submit(e?:FormEvent){e?.preventDefault();const text=draft.trim();if(!text||busy)return;
    const next:ChatMessage[]=[...messages,{role:"user",content:text}];setMessages(next);setDraft("");setProvider(null);
    const parsedGraph=parseGraphPrompt(text,activeGraph);
    if(parsedGraph){
      setActiveGraph(parsedGraph);
      if(parsedGraph.algorithm==="dijkstra"&&parsedGraph.edges.some(edge=>edge.weight<0)){
        setMessages([...next,{role:"assistant",content:"I drew the graph, but Dijkstra cannot process negative edge weights. Change those weights to zero or higher, or ask for Bellman–Ford instead.",graph:parsedGraph}]);return;
      }
      if(parsedGraph.edges.length===0){
        const response=parsedGraph.algorithm==="dijkstra"
          ? `I found ${parsedGraph.nodes.length} vertices: ${parsedGraph.nodes.join(", ")}. I drew them below. Dijkstra also needs the edges and their non-negative weights. Add connections here or send them like A-B: 4, A-C: 2.`
          : `I drew ${parsedGraph.nodes.length} vertices: ${parsedGraph.nodes.join(", ")}. Add connections and weights below, or send them in chat like A-B: 4, A-C: 2.`;
        setMessages([...next,{role:"assistant",content:response,graph:parsedGraph}]);return;
      }
    }
    setBusy(true);
    const messagesForApi=next.slice(-18).map(({role,content})=>({role,content}));
    const graphForContext=parsedGraph??activeGraph;
    const studentGraph=graphForContext?{...graphForContext,traceSummary:formatDijkstraTrace(graphForContext)}:undefined;
    try{const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:messagesForApi,lesson:{title:topic.title,summary:topic.summary,use:topic.use,time:topic.time,space:topic.space},graph:topic.trace?{step:step.detail,label:step.label,value:step.value}:undefined,studentGraph})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||"The tutor couldn't respond. Please try again.");
      setMessages(prev=>[...prev,{role:"assistant",content:payload.reply,graph:parsedGraph??undefined}]);setProvider(payload.provider||null);
    }catch(error){setMessages(prev=>[...prev,{role:"assistant",content:error instanceof Error?error.message:"The tutor is unavailable. Check your connection and try again.",graph:parsedGraph??undefined}])}
    finally{setBusy(false)}
  }
  function keySend(e:KeyboardEvent<HTMLTextAreaElement>){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit()}}
  const progress=()=>{if(!completed.includes(topic.id))setCompleted(prev=>[...prev,topic.id])};
  function nextTopic(delta:number){const i=topics.findIndex(t=>t.id===topic.id);selectTopic(topics[Math.max(0,Math.min(topics.length-1,i+delta))])}
  function resetChat(){if(!busy){setMessages([STARTER]);setActiveGraph(null)}}
  function updateGraph(messageIndex:number,graph:StudentGraph){setActiveGraph(graph);setMessages(current=>current.map((message,index)=>index===messageIndex?{...message,graph}:message))}
  async function copyCode(){try{await navigator.clipboard.writeText(topic.code);return "Copied ✓"}catch{return "Copy unavailable"}}
  const connectionText=apiStatus==="ready"?"Tutor connected":apiStatus==="checking"?"Checking tutor…":"Add API keys to enable the tutor";
  return <div className="app-shell">
    <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setSidebarOpen(v=>!v)} aria-label="Toggle lesson list">{sidebarOpen?<X size={19}/>:<Menu size={19}/>}</button><span className="brand">Group 4 BSCS 3-B</span><span className="top-divider"/><span className="course-label">Algorithms &amp; Complexity</span><div className="top-right"><span className="course-pill"><BookOpen size={13}/> Learning workspace</span></div></header>
    <div className="workspace">
      <aside className={sidebarOpen?"sidebar sidebar-open":"sidebar"}><div className="sidebar-heading"><div><div className="eyebrow">Course content</div><div className="lesson-total">{topics.length} lessons</div></div><ChevronDown size={16} className="collapse-mark"/></div>
        <label className="search-box"><Search size={15}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Find a lesson…" aria-label="Search lessons"/>{filter&&<button className="clear-search" onClick={()=>setFilter("")} aria-label="Clear search"><X size={13}/></button>}</label>
        <nav className="lesson-nav" aria-label="Course lessons">{groups.map(group=>{const groupTopics=filtered.filter(t=>t.group===group);if(!groupTopics.length)return null;return <div className="lesson-group" key={group}><div className="group-label">{group}</div>{groupTopics.map(t=><button key={t.id} onClick={()=>selectTopic(t)} className={topic.id===t.id?"lesson-link selected":"lesson-link"} aria-current={topic.id===t.id?"page":undefined}><span className="lesson-index">{String(topics.indexOf(t)+1).padStart(2,"0")}</span><span className="lesson-name">{t.short}</span>{completed.includes(t.id)&&<Check size={14} className="done-check"/>}</button>)}</div>})}{filtered.length===0&&<p className="empty-search">No lessons match “{filter}”. Try “queue” or “shortest”.</p>}</nav>
        <div className="progress-card"><div className="progress-label"><span>Your progress</span><strong>{count} / {topics.length}</strong></div><div className="progress-track"><span style={{width:`${(count/topics.length)*100}%`}}/></div><span className="progress-hint">A little practice, every day.</span></div>
      </aside>
      <main className="lesson-main"><div className="breadcrumbs">Algorithms &amp; Complexity <ChevronRight size={13}/><span>{topic.group}</span></div>
        <div className="lesson-meta"><span className="topic-badge">{topic.group}</span><span>Lesson {String(topics.indexOf(topic)+1).padStart(2,"0")} of {String(topics.length).padStart(2,"0")}</span></div>
        <h1>{topic.title}</h1><p className="lesson-summary">{topic.summary}</p>
        <div className="tabs" role="tablist" aria-label="Lesson sections">{(["overview","code","practice"] as const).map((tab,index)=><button role="tab" id={`tab-${tab}`} aria-selected={activeTab===tab} aria-controls={tab} tabIndex={activeTab===tab?0:-1} className={activeTab===tab?"tab active":"tab"} key={tab} onClick={()=>setActiveTab(tab)} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const next=(index+(e.key==="ArrowRight"?1:2))%3;setActiveTab((["overview","code","practice"] as const)[next]);document.getElementById(`tab-${(["overview","code","practice"] as const)[next]}`)?.focus()}}}>{tab==="overview"?"Overview":tab==="code"?"Pseudocode":"Quick check"}{tab==="practice"&&<span className="tab-arrow">↗</span>}</button>)}</div>
        {activeTab==="overview"&&<section id="overview" role="tabpanel" aria-labelledby="tab-overview">
          {topic.trace&&<><div className="section-title-row"><h2>Watch the algorithm unfold</h2><span className="subtle">Sample weighted graph · 6 vertices</span></div><div className="visualizer-card"><div className="visualizer-heading"><div><span className="visualizer-title">{topic.short} trace</span><span className="visualizer-subtitle">Starting at node A</span></div><span className="trace-index">{String(stepIndex+1).padStart(2,"0")} <span>/ {trace.length}</span></span></div><div className="graph-wrap"><Graph step={step}/></div><div className="graph-legend"><span><i className="legend-dot"/><span>Unvisited</span></span><span><i className="legend-dot visited"/><span>Visited</span></span><span><i className="legend-dot current"/><span>Current</span></span><span><i className="legend-dot waiting"/><span>Waiting</span></span></div><div className="trace-controls"><button className="control-button" onClick={()=>setStepIndex(0)} aria-label="Reset trace"><RotateCcw size={15}/></button><button className="control-button" onClick={()=>setStepIndex(n=>Math.max(0,n-1))} disabled={stepIndex===0} aria-label="Previous trace step"><ChevronLeft size={17}/></button><button className="next-step" onClick={()=>setStepIndex(n=>Math.min(trace.length-1,n+1))} disabled={stepIndex>=trace.length-1}>Next step <ChevronRight size={15}/></button><span className="step-count">Step {stepIndex+1} of {trace.length}</span></div></div><div className="step-explanation"><div className="step-icon"><Sparkles size={15}/></div><div className="step-copy"><span className="eyebrow">What happens</span><p>{step.detail}</p><div className="step-data"><strong>{step.label}:</strong><code>{step.value}</code></div></div><button className="ask-step" onClick={()=>ask("Explain this graph step: "+step.detail)} title="Ask the tutor about this step"><MessageCircle size={16}/></button></div></>}
          <div className="complexity-grid"><article className="complexity-card"><span className="eyebrow"><Clock3 size={13}/> Time complexity</span><strong>{topic.time}</strong><span className="complexity-caption">{topic.id==="bfs"||topic.id==="dfs"?"With adjacency lists":"Standard implementation"}</span></article><article className="complexity-card"><span className="eyebrow"><Code2 size={13}/> Space complexity</span><strong>{topic.space}</strong><span className="complexity-caption">Auxiliary storage</span></article></div>
          <section className="use-card"><div className="eyebrow">When should you use it?</div><p>{topic.use}</p><button className="text-action" onClick={()=>ask("Explain "+topic.title+" in simple terms")}><Sparkles size={14}/> Explain this lesson</button></section>
        </section>}
        {activeTab==="code"&&<section id="code" role="tabpanel" aria-labelledby="tab-code"><div className="section-title-row"><h2>Follow the logic</h2><button className="copy-button" onClick={async e=>{const label=await copyCode();e.currentTarget.textContent=label;setTimeout(()=>{e.currentTarget.textContent="Copy code"},1800)}}>Copy code</button></div><pre className="code-block"><code>{topic.code}</code></pre><p className="lesson-note">V is the number of vertices and E is the number of edges. Traversal complexity assumes an adjacency-list graph.</p><button className="text-action" onClick={()=>ask("Explain this pseudocode for "+topic.title)}><Sparkles size={14}/> Ask the tutor about this code</button></section>}
          {activeTab==="practice"&&<section id="practice" role="tabpanel" aria-labelledby="tab-practice" className="practice-panel"><div className="section-title-row"><h2>Check your understanding</h2><span className="subtle">One question · no pressure</span></div><p className="quiz-question">{topic.quiz.question}</p><div className="quiz-options">{topic.quiz.options.map((option,i)=><button key={option} className={feedback&&i===topic.quiz.answer?"quiz-option correct":feedback&&i===feedback.selected&&!feedback.correct?"quiz-option incorrect":"quiz-option"} onClick={()=>setFeedback({text:i===topic.quiz.answer?"Exactly right. Nice work.":"Not quite. Give it another try.",correct:i===topic.quiz.answer,selected:i})}><span className="option-letter">{String.fromCharCode(65+i)}</span>{option}{feedback&&i===topic.quiz.answer&&<Check size={16} className="option-check"/>}</button>)}</div>{feedback&&<p className={feedback.correct?"quiz-feedback success":"quiz-feedback"} role="status">{feedback.text}</p>}</section>}
        <div className="lesson-footer"><button className="footer-button" disabled={topics.indexOf(topic)===0} onClick={()=>nextTopic(-1)}><ChevronLeft size={15}/> Previous lesson</button><button className={completed.includes(topic.id)?"footer-button completed":"complete-button"} onClick={progress}>{completed.includes(topic.id)?<><Check size={15}/> Completed</>:<>Mark complete <Check size={15}/></>}</button><button className="footer-button" disabled={topics.indexOf(topic)===topics.length-1} onClick={()=>nextTopic(1)}>Next lesson <ChevronRight size={15}/></button></div>
      </main>
      <aside className="tutor-panel"><div className="tutor-heading"><div className="tutor-heading-top"><span className="bot-mark"><Sparkles size={17}/></span><div><h2>AI study companion</h2><span className={apiStatus==="ready"?"connection-status online":"connection-status"}><i/>{connectionText}</span></div><button className="icon-button reset-chat" onClick={resetChat} disabled={busy} aria-label="Start a new conversation"><RotateCcw size={15}/></button></div><p>Ask why. Explore an example. Learn at your pace.</p></div>
        <div className="lesson-context"><span>READING WITH YOU</span><strong>{topic.short}</strong><button onClick={()=>ask("Explain "+topic.title+" in simple terms")} aria-label="Ask about this lesson"><CircleHelp size={15}/></button></div>
        <div className="chat-scroll"><div className="chat-messages">{messages.map((m,i)=><div key={i} className={m.role==="user"?"chat-message user-message":"chat-message assistant-message"}>{m.role==="assistant"&&<div className="message-author"><Bot size={13}/> GROUP 4 TUTOR{provider&&i===messages.length-1&&<span className="provider-used">via {provider}</span>}</div>}<p>{m.content}</p>{m.graph&&<div ref={i===messages.length-1?graphStart:undefined}><GraphCard graph={m.graph} onChange={graph=>updateGraph(i,graph)} onExplain={()=>ask("Explain this graph and walk me through its Dijkstra trace.")}/></div>}</div>)}{busy&&<div className="chat-message assistant-message"><div className="message-author"><Bot size={13}/> GROUP 4 TUTOR</div><p className="typing"><i/><i/><i/> Thinking through your lesson…</p></div>}<div ref={chatEnd}/></div>{messages.length===1&&<div className="prompt-suggestions"><button onClick={()=>ask("Explain this lesson in simple terms")}>Explain this in simple terms <ChevronRight size={13}/></button><button onClick={()=>ask("Explain the current graph step")}>Walk me through this step <ChevronRight size={13}/></button><button onClick={()=>ask("What is the difference between BFS and DFS?")}>What is the difference between BFS and DFS? <ChevronRight size={13}/></button><button onClick={()=>ask("Draw an undirected graph with vertices A, B, C, D, E and edges A-B: 4, A-C: 2, C-D: 1, D-E: 3. Show Dijkstra from A.")}>Draw a graph and trace Dijkstra <ChevronRight size={13}/></button></div>}</div>
        <form className="chat-composer" onSubmit={submit}><div className="composer-box"><textarea ref={input} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={keySend} placeholder="Ask about this lesson…" aria-label="Ask the AI study companion" maxLength={4000} rows={2}/><div className="composer-bottom"><span><CornerDownLeft size={12}/> Send · Shift + Enter for a new line</span><button className="send-button" disabled={!draft.trim()||busy} aria-label="Send message">{busy?<span className="spinner"/>:<Send size={15}/>}</button></div></div><p className="privacy-note">Messages go to your configured AI providers through the local backend.</p></form>
      </aside>
    </div>
  </div>;
}
export default App;

