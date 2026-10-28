import { edgeKey, formatNumber as fmt, getExample, type GraphEdge, type TraceKind } from './lessonExamples';
export type TraceStep = {
  current: string | null; visited: string[]; waiting: string[]; detail: string;
  label: string; value: string; phase?: string; distances?: Record<string, number>;
  highlighted?: string[]; selectedEdges?: string[]; rejectedEdges?: string[];
  parents?: Record<string, string>; totalWeight?: number; components?: string[][];
  matrix?: number[][]; matrixFocus?: {row:number;col:number;via:number};
  order?: string[]; indegrees?: Record<string,number>; negativeCycle?: boolean;
};
export function createTrace(kind: TraceKind): TraceStep[] {
  const { nodes, edges, directed } = getExample(kind);
  const steps: TraceStep[] = [];
  const key=(a:string,b:string)=>edgeKey(a,b,directed);
  const neighbors=(u:string)=>edges.flatMap(([a,b,w])=>a===u?[{node:b,weight:w}]:!directed&&b===u?[{node:a,weight:w}]:[]).sort((a,b)=>a.node.localeCompare(b.node));
  const push=(detail:string,label:string,value:string,extra:Partial<TraceStep>={})=>steps.push({current:null,visited:[],waiting:[],detail,label,value,...extra});
  if(kind==='bfs'||kind==='dfs') {
    const seen=new Set<string>(), visited:string[]=[], frontier:string[]=['A'];
    push(kind==='bfs'?'Put A in the queue. Neighbors will be explored one level at a time.':'Start at A. Follow one branch until there are no unseen neighbors.',kind==='bfs'?'Queue':'Call stack','A',{waiting:['A']});
    if(kind==='bfs') {
      seen.add('A');
      while(frontier.length) {
        const u=frontier.shift()!;visited.push(u);
        const added=neighbors(u).filter(v=>!seen.has(v.node));
        for(const v of added){seen.add(v.node);frontier.push(v.node)}
        push(`Dequeue ${u}. ${added.length?`Enqueue ${added.map(v=>v.node).join(', ')}.`:'No unseen neighbors remain.'}`,'Queue',frontier.join(' → ')||'empty',{current:u,visited:[...visited],waiting:[...frontier],highlighted:added.map(v=>key(u,v.node))});
      }
    } else {
      const path:string[]=[];
      const visit=(u:string)=>{seen.add(u);visited.push(u);path.push(u);
        push(`Visit ${u}. Keep following unseen neighbors before returning to the previous vertex.`,'Call stack',path.join(' → '),{current:u,visited:[...visited],waiting:[...path]});
        for(const v of neighbors(u))if(!seen.has(v.node))visit(v.node);
        path.pop();if(path.length)push(`Backtrack from ${u} to ${path.at(-1)}; this branch is complete.`,'Call stack',path.join(' → '),{current:path.at(-1)!,visited:[...visited],waiting:[...path]});
      };visit('A');
    }
    push(`Traversal complete. Visit order: ${visited.join(' → ')}.`,'Visit order',visited.join(' → '),{visited:[...visited]});
  } else if(kind==='dijkstra'||kind==='bellman-ford') {
    const dist:Record<string,number>=Object.fromEntries(nodes.map(n=>[n,Infinity]));dist.A=0;
    const parents:Record<string,string>={}, settled=new Set<string>();
    const record=(detail:string,extra:Partial<TraceStep>={})=>push(detail,'Distances',nodes.map(n=>`${n}: ${fmt(dist[n])}`).join(' · '),{distances:{...dist},parents:{...parents},visited:[...settled],waiting:nodes.filter(n=>Number.isFinite(dist[n])&&!settled.has(n)),selectedEdges:Object.entries(parents).map(([v,u])=>key(u,v)),...extra});
    record('Initialize A = 0. All other distances start at ∞.');
    if(kind==='dijkstra') {
      while(settled.size<nodes.length){
        const u=nodes.filter(n=>!settled.has(n)&&Number.isFinite(dist[n])).sort((a,b)=>dist[a]-dist[b]||a.localeCompare(b))[0];if(!u)break;
        settled.add(u);record(`Settle ${u}: ${dist[u]} is the smallest unfinished distance. With non-negative weights it is now final.`,{current:u,phase:'Settle nearest vertex'});
        for(const v of neighbors(u))if(!settled.has(v.node)){
          const old=dist[v.node],candidate=dist[u]+v.weight,improved=candidate<old;
          if(improved){dist[v.node]=candidate;parents[v.node]=u}
          record(`Test ${u} → ${v.node}: ${dist[u]} + ${v.weight} = ${candidate}. ${improved?`Replace ${fmt(old)} with ${candidate}.`:`Keep ${fmt(old)}; this route is not shorter.`}`,{current:u,highlighted:[key(u,v.node)],phase:'Relax an edge'});
        }
      }
      record('Complete. Every reachable vertex has its final shortest distance from A.',{phase:'Shortest paths complete'});
    } else {
      for(let pass=1;pass<nodes.length;pass++){
        let changed=false;
        for(const [u,v,w] of edges){
          const old=dist[v],candidate=dist[u]+w,improved=candidate<old;
          if(improved){dist[v]=candidate;parents[v]=u;changed=true}
          record(!Number.isFinite(dist[u])?`Skip ${u} → ${v}: ${u} is not reachable yet.`:`Test ${u} → ${v}: ${dist[u]} + (${w}) = ${candidate}. ${improved?`Improve ${v} from ${fmt(old)} to ${candidate}.`:`Keep ${v} = ${fmt(old)}.`}`,{current:u,highlighted:[key(u,v)],phase:`Pass ${pass} of ${nodes.length-1}`});
        }
        if(!changed){record('No distances changed in this pass. We can stop relaxing early.');break}
      }
      const negativeCycle=edges.some(([u,v,w])=>Number.isFinite(dist[u])&&dist[u]+w<dist[v]);
      record(negativeCycle?'An extra pass can still improve a distance: a reachable negative cycle exists.':'Extra pass: no edge improves a distance, so there is no reachable negative cycle. Shortest paths are complete.',{phase:'Negative-cycle check',negativeCycle});
    }
  } else if(kind==='floyd-warshall') {
    const matrix=nodes.map((u)=>nodes.map(v=>u===v?0:Infinity));
    const paths=nodes.map((u)=>nodes.map(v=>u===v?[u]:[] as string[]));
    for(const [a,b,w]of edges){const i=nodes.indexOf(a),j=nodes.indexOf(b);matrix[i][j]=w;paths[i][j]=[a,b]}
    const record=(detail:string,extra:Partial<TraceStep>={})=>push(detail,'Matrix','Row = start, column = destination',{matrix:matrix.map(row=>[...row]),...extra});
    record('Initialize the matrix: 0 on the diagonal, direct edge costs elsewhere, and ∞ where no route is known.');
    for(let k=0;k<nodes.length;k++){
      record(`Allow ${nodes[k]} as an intermediate vertex. Test dist[i][${nodes[k]}] + dist[${nodes[k]}][j] for every pair.`,{current:nodes[k],phase:`Via ${nodes[k]}`});
      for(let i=0;i<nodes.length;i++)for(let j=0;j<nodes.length;j++){
        const candidate=matrix[i][k]+matrix[k][j],old=matrix[i][j];
        if(candidate<old){const route=[...paths[i][k],...paths[k][j].slice(1)];matrix[i][j]=candidate;paths[i][j]=route;
          record(`${nodes[i]} → ${nodes[j]} through ${nodes[k]}: ${matrix[i][k]} + ${matrix[k][j]} = ${candidate}, improving ${fmt(old)}. Route: ${route.join(' → ')}.`,{current:nodes[k],matrixFocus:{row:i,col:j,via:k},highlighted:route.slice(1).map((v,x)=>key(route[x],v)),phase:`Via ${nodes[k]}`});
        }
      }
    }
    record('Complete. Each matrix cell now gives the shortest distance from its row vertex to its column vertex.',{phase:'All pairs complete'});
  } else if(kind==='prim'||kind==='kruskal') {
    const chosen:GraphEdge[]=[], rejected:string[]=[], included=new Set<string>(), parent=Object.fromEntries(nodes.map(n=>[n,n]));let total=0;
    const find=(n:string):string=>parent[n]===n?n:find(parent[n]);
    const components=()=>Object.values(nodes.reduce<Record<string,string[]>>((groups,n)=>{(groups[find(n)]??=[]).push(n);return groups},{}));
    const record=(detail:string,extra:Partial<TraceStep>={})=>push(detail,'Tree cost',String(total),{visited:[...included],selectedEdges:chosen.map(([a,b])=>key(a,b)),rejectedEdges:[...rejected],totalWeight:total,...(kind==='kruskal'?{components:components()}:{}),...extra});
    if(kind==='prim'){
      included.add('A');record('Start the tree at A. Choose only edges that connect this tree to a new vertex.');
      while(included.size<nodes.length){
        const candidates=edges.filter(([a,b])=>included.has(a)!==included.has(b)).sort((a,b)=>a[2]-b[2]);
        if(!candidates.length)break;
        record(`Compare the ${candidates.length} edges crossing from the tree to an outside vertex. The cheapest costs ${candidates[0][2]}.`,{waiting:nodes.filter(n=>!included.has(n)&&candidates.some(([a,b])=>a===n||b===n)),highlighted:candidates.map(([a,b])=>key(a,b)),phase:'Compare crossing edges'});
        const edge=candidates[0],[a,b,w]=edge,newNode=included.has(a)?b:a;included.add(newNode);chosen.push(edge);total+=w;
        record(`Add ${a} — ${b} (cost ${w}) and vertex ${newNode}. Total cost = ${total}.`,{current:newNode,highlighted:[key(a,b)],phase:'Grow the tree'});
      }
    } else {
      const sorted=[...edges].sort((a,b)=>a[2]-b[2]);
      record(`Sort all edges by weight: ${sorted.map(([a,b,w])=>`${a}–${b} (${w})`).join(', ')}.`);
      for(const edge of sorted){const [a,b,w]=edge;
        if(find(a)===find(b)){rejected.push(key(a,b));record(`Reject ${a} — ${b} (cost ${w}): its vertices are already in the same component, so it would create a cycle.`,{highlighted:[key(a,b)],phase:'Cycle rejected'});}
        else{parent[find(b)]=find(a);chosen.push(edge);total+=w;included.add(a);included.add(b);record(`Accept ${a} — ${b} (cost ${w}). Merge the two components. Total cost = ${total}.`,{highlighted:[key(a,b)],phase:'Merge components'});}
        if(chosen.length===nodes.length-1)break;
      }
    }
    record(`Minimum spanning tree complete: ${chosen.length} edges connect ${nodes.length} vertices with total cost ${total}.`,{phase:'Minimum spanning tree'});
  } else {
    const indegrees:Record<string,number>=Object.fromEntries(nodes.map(n=>[n,0]));for(const [,b]of edges)indegrees[b]++;
    const queue=nodes.filter(n=>indegrees[n]===0), order:string[]=[];
    const record=(detail:string,extra:Partial<TraceStep>={})=>push(detail,'Ready queue',queue.join(' → ')||'empty',{visited:[...order],waiting:[...queue],order:[...order],indegrees:{...indegrees},...extra});
    record(`Count incoming arrows. ${queue.join(' and ')} have zero prerequisites and enter the queue.`);
    while(queue.length){const u=queue.shift()!;order.push(u);const out=edges.filter(([a])=>a===u);
      for(const [,v]of out){indegrees[v]--;if(indegrees[v]===0)queue.push(v)}
      record(`Output ${u}. Remove its outgoing arrows. ${out.length?out.map(([,v])=>`${v} now has in-degree ${indegrees[v]}`).join('; ')+'.':'There are no outgoing arrows.'}` ,{current:u,highlighted:out.map(([a,b])=>key(a,b)),phase:'Remove a ready vertex'});
    }
    record(order.length===nodes.length?`Valid topological order: ${order.join(' → ')}. Every prerequisite appears before the task that depends on it.`:'No ready vertices remain, but some vertices are unprocessed: a cycle prevents a topological order.',{phase:'Ordering complete'});
  }
  return steps;
}
