import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, MousePointer2, Play, Plus, RotateCcw } from "lucide-react";
import { createDijkstraTrace, type DijkstraFrame, type StudentGraph, type WeightedEdge } from "./interactiveGraph";

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
  const svgId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState(() => layout(graph.nodes));
  const [dragging, setDragging] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [edgeFrom, setEdgeFrom] = useState(graph.nodes[0] ?? "");
  const [edgeTo, setEdgeTo] = useState(graph.nodes[1] ?? graph.nodes[0] ?? "");
  const [edgeWeight, setEdgeWeight] = useState("1");
  const nodesKey = graph.nodes.join("|");
  const trace = useMemo(() => graph.algorithm === "dijkstra" && graph.edges.length ? createDijkstraTrace(graph) : [], [graph.algorithm, graph.directed, graph.edges, graph.nodes, graph.start]);
  const frame: DijkstraFrame | undefined = trace[Math.min(frameIndex, Math.max(0, trace.length - 1))];
  const hasNegativeWeight = graph.edges.some(edge => edge.weight < 0);

  useEffect(() => {
    setPositions(current => ({ ...layout(graph.nodes), ...Object.fromEntries(graph.nodes.filter(node => current[node]).map(node => [node, current[node]])) }));
    setEdgeFrom(graph.nodes[0] ?? "");
    setEdgeTo(graph.nodes[1] ?? graph.nodes[0] ?? "");
    setFrameIndex(0);
  }, [nodesKey]);

  useEffect(() => { setFrameIndex(0); }, [graph.edges, graph.start, graph.directed, graph.algorithm]);

  function pointFromEvent(event: PointerEvent<SVGSVGElement>): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: Math.max(28, Math.min(492, ((event.clientX - rect.left) / rect.width) * 520)), y: Math.max(28, Math.min(256, ((event.clientY - rect.top) / rect.height) * 284)) };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragging || !svgRef.current) return;
    const point = pointFromEvent(event);
    setPositions(current => ({ ...current, [dragging]: point }));
  }

  function handleNodeKey(event: KeyboardEvent<SVGGElement>, node: string) {
    const offsets: Record<string, Point> = { ArrowUp: { x: 0, y: -10 }, ArrowDown: { x: 0, y: 10 }, ArrowLeft: { x: -10, y: 0 }, ArrowRight: { x: 10, y: 0 } };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    setPositions(current => ({ ...current, [node]: { x: Math.max(28, Math.min(492, current[node].x + offset.x)), y: Math.max(28, Math.min(256, current[node].y + offset.y)) } }));
  }

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
    <div className="chat-graph-canvas">
      <svg ref={svgRef} className="interactive-graph-svg" viewBox="0 0 520 284" role="group" aria-label={`Graph with vertices ${graph.nodes.join(", ")}`} onPointerMove={handlePointerMove} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
        <defs><marker id={`${svgId}-arrow`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9eb7a5"/></marker></defs>
        {graph.edges.map((edge, index) => {
          const from = positions[edge.from] ?? { x: 260, y: 142 }, to = positions[edge.to] ?? { x: 260, y: 142 };
          const active = sameEdge(edge.from, edge.to, frame?.activeEdge);
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          return <g key={`${edge.from}-${edge.to}-${index}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={active ? "interactive-edge active" : "interactive-edge"} markerEnd={graph.directed ? `url(#${svgId}-arrow)` : undefined}/>
            <rect x={mx - 14} y={my - 11} width="28" height="19" rx="6" className="interactive-edge-label-bg"/>
            <text x={mx} y={my + 3} textAnchor="middle" className="interactive-edge-label">{edge.weight}</text>
          </g>;
        })}
        {graph.nodes.map(node => {
          const point = positions[node] ?? { x: 260, y: 142 };
          const isCurrent = frame?.current === node;
          const isSettled = frame?.settled.includes(node) ?? false;
          const isFrontier = distances[node] !== null && distances[node] !== undefined && !isSettled;
          const nodeClass = isCurrent ? "interactive-node current" : isSettled ? "interactive-node settled" : isFrontier ? "interactive-node frontier" : "interactive-node";
          return <g key={node} data-node-id={node} className="interactive-node-group" role="button" tabIndex={0} aria-label={`Vertex ${node}, distance ${distances[node] === null || distances[node] === undefined ? "infinity" : distances[node]}. Use arrow keys to move.`} onKeyDown={event => handleNodeKey(event, node)} onPointerDown={event => { svgRef.current?.setPointerCapture(event.pointerId); setDragging(node); }}>
            <circle cx={point.x} cy={point.y} r="21" className={nodeClass}/>
            <text x={point.x} y={point.y + 4} textAnchor="middle" className={isCurrent ? "interactive-node-label current" : "interactive-node-label"}>{node}</text>
            {graph.algorithm === "dijkstra" && graph.edges.length > 0 && <text x={point.x} y={point.y + 34} textAnchor="middle" className="interactive-distance">{distances[node] === null || distances[node] === undefined ? "∞" : distances[node]}</text>}
          </g>;
        })}
      </svg>
    </div>
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
