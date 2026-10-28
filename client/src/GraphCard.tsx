import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, MousePointer2, Play, Plus, RotateCcw } from "lucide-react";
import { createDijkstraTrace, type DijkstraFrame, type StudentGraph, type WeightedEdge } from "./interactiveGraph";

import FlowGraph from "./FlowGraph";

type Point = { x: number; y: number };
type Props = { graph: StudentGraph; onChange: (graph: StudentGraph) => void; onExplain: () => void };

function layout(nodes: string[]): Record<string, Point> {
  const center = { x: 260, y: 142 };
  const radius = Math.min(105, Math.max(52, 23 * nodes.length));
  return Object.fromEntries(nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(nodes.length, 1);
    return [node, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }];
  }));
}

function sameEdge(a: string, b: string, active?: string) {
  return active === `${a}>${b}` || active === `${b}>${a}`;
}

export default function GraphCard({ graph, onChange, onExplain }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [edgeFrom, setEdgeFrom] = useState(graph.nodes[0] ?? "");
  const [edgeTo, setEdgeTo] = useState(graph.nodes[1] ?? graph.nodes[0] ?? "");
  const [edgeWeight, setEdgeWeight] = useState("1");
  const nodesKey = graph.nodes.join("|");
  const trace = useMemo(() => graph.algorithm === "dijkstra" && graph.edges.length ? createDijkstraTrace(graph) : [], [graph.algorithm, graph.directed, graph.edges, graph.nodes, graph.start]);
  const frame: DijkstraFrame | undefined = trace[Math.min(frameIndex, Math.max(0, trace.length - 1))];
  const hasNegativeWeight = graph.edges.some(edge => edge.weight < 0);

  useEffect(() => {
    setEdgeFrom(graph.nodes[0] ?? "");
    setEdgeTo(graph.nodes[1] ?? graph.nodes[0] ?? "");
    setFrameIndex(0);
  }, [nodesKey]);

  useEffect(() => { setFrameIndex(0); }, [graph.edges, graph.start, graph.directed, graph.algorithm]);

  function addEdge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weight = Number(edgeWeight);
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo || !Number.isFinite(weight)) return;
    const edge: WeightedEdge = { from: edgeFrom, to: edgeTo, weight };
    const identity = (item: WeightedEdge) => graph.directed ? `${item.from}>${item.to}` : [item.from, item.to].sort().join("~");
    const edges = graph.edges.filter(item => identity(item) !== identity(edge));
    onChange({ ...graph, edges: [...edges, edge] });
    setEdgeWeight("1");
  }

  const distances = frame?.distances ?? {};
  const status = graph.nodes.length < 2
    ? "Add at least two vertices to build a useful graph."
    : hasNegativeWeight && graph.algorithm === "dijkstra"
      ? "Dijkstra cannot use negative edge weights. Change them to 0 or greater."
      : graph.edges.length === 0
        ? "Add weighted connections to run Dijkstra."
        : graph.algorithm === "dijkstra"
          ? frame?.detail ?? "Dijkstra is ready to run."
          : "Drag vertices to rearrange the graph, or run Dijkstra to trace shortest paths.";

  return <section className="chat-graph-card" aria-label="Interactive graph">
    <div className="chat-graph-heading">
      <div><h3>Interactive graph</h3><p>{graph.directed ? "Directed" : "Undirected"} · {graph.nodes.length} vertices · {graph.edges.length} edges</p></div>
      <span className="drag-hint"><MousePointer2 size={13}/> Drag to move</span>
    </div>
    <FlowGraph compact directed={graph.directed} vertices={graph.nodes.map(id=>{const point=layout(graph.nodes)[id];return {id,x:point.x,y:point.y,status:frame?.current===id?'current':frame?.settled.includes(id)?'visited':distances[id]!==null&&distances[id]!==undefined?'waiting':'',metric:graph.algorithm==='dijkstra'&&graph.edges.length?'d = '+(distances[id]??'∞'):undefined}})} links={graph.edges.map((edge,index)=>({id:String(index),from:edge.from,to:edge.to,weight:edge.weight,status:(graph.directed?frame?.activeEdge===`${edge.from}>${edge.to}`:sameEdge(edge.from,edge.to,frame?.activeEdge))?'active':''}))}/>
    <div className="graph-legend interactive-legend"><span><i className="legend-dot"/>Unvisited</span><span><i className="legend-dot visited"/>Settled</span><span><i className="legend-dot current"/>Current</span><span><i className="legend-dot waiting"/>Frontier</span></div>
    <div className="graph-step-note" role="status"><strong>{graph.algorithm === "dijkstra" && graph.edges.length > 0 ? `Step ${Math.min(frameIndex + 1, trace.length || 1)} of ${trace.length || 1}` : graph.algorithm === "dijkstra" ? "Dijkstra setup" : "Graph ready"}</strong><span>{status}</span></div>
    {graph.nodes.length >= 2 && <>
      <form className="graph-edge-form" onSubmit={addEdge} aria-label="Add a weighted edge">
        <label>From<select value={edgeFrom} onChange={event => setEdgeFrom(event.target.value)}>{graph.nodes.map(node => <option key={node}>{node}</option>)}</select></label>
        <label>To<select value={edgeTo} onChange={event => setEdgeTo(event.target.value)}>{graph.nodes.map(node => <option key={node}>{node}</option>)}</select></label>
        <label>Weight<input type="number" step="any" value={edgeWeight} onChange={event => setEdgeWeight(event.target.value)} aria-label="Edge weight"/></label>
        <button className="graph-add-edge" type="submit" disabled={edgeFrom === edgeTo || !edgeWeight}><Plus size={14}/> Add edge</button>
      </form>
      <div className="graph-tools-row">
        <label className="graph-start-select">Start at<select value={graph.start} onChange={event => onChange({ ...graph, start: event.target.value })}>{graph.nodes.map(node => <option key={node}>{node}</option>)}</select></label>
        <label className="graph-directed-toggle"><input type="checkbox" checked={graph.directed} onChange={event => onChange({ ...graph, directed: event.target.checked })}/> Directed</label>
      </div>
      {graph.algorithm !== "dijkstra" && <button className="graph-run-button" type="button" disabled={!graph.edges.length || hasNegativeWeight} onClick={() => onChange({ ...graph, algorithm: "dijkstra" })}><Play size={13}/> Run Dijkstra</button>}
      {graph.algorithm === "dijkstra" && graph.edges.length > 0 && <div className="graph-trace-controls">
        <button className="control-button" type="button" onClick={() => setFrameIndex(0)} aria-label="Reset Dijkstra trace" disabled={!trace.length}><RotateCcw size={14}/></button>
        <button className="control-button" type="button" onClick={() => setFrameIndex(index => Math.max(0, index - 1))} aria-label="Previous Dijkstra step" disabled={!trace.length || frameIndex === 0}><ChevronLeft size={16}/></button>
        <button className="next-step" type="button" onClick={() => setFrameIndex(index => Math.min(trace.length - 1, index + 1))} disabled={!trace.length || frameIndex >= trace.length - 1}>Next step <ChevronRight size={14}/></button>
        <button className="graph-run-all" type="button" onClick={() => setFrameIndex(Math.max(0, trace.length - 1))} disabled={!trace.length}>Show result</button>
      </div>}
      {graph.algorithm === "dijkstra" && graph.edges.length > 0 && <div className="graph-distance-list" aria-label="Current distances from the start vertex">{graph.nodes.map(node => <span key={node}><strong>{node}</strong>{distances[node] === null || distances[node] === undefined ? "∞" : distances[node]}</span>)}</div>}
      {graph.edges.length > 0 && <button className="graph-explain-button" type="button" onClick={onExplain}><MessageCircle size={13}/> Ask the tutor to explain this graph</button>}
    </>}
    <p className="graph-accessibility-hint">You can also focus a vertex and move it with the arrow keys.</p>
  </section>;
}
