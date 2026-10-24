export type WeightedEdge = { from: string; to: string; weight: number };
export type StudentGraph = {
  nodes: string[];
  edges: WeightedEdge[];
  directed: boolean;
  start: string;
  algorithm: "dijkstra" | null;
};
export type DijkstraFrame = {
  current: string | null;
  settled: string[];
  distances: Record<string, number | null>;
  detail: string;
  activeEdge?: string;
};

const stopWords = new Set("a an and are at by compute dijkstra draw edge edges for from graph how in it make nodes of on please shortest show start starting the this to use using vertices vertex visualize weights with".split(" "));
const normalizeNode = (value: string) => value.length === 1 ? value.toUpperCase() : value;
const asksForDijkstra = (prompt: string) => /\b(?:dijkstra|dijksta|djiksta|djikstra)\b/i.test(prompt);
const unique = (values: string[]) => [...new Set(values)];

function readNodeList(prompt: string): string[] {
  const before = prompt.match(/\b(?:have|with)\s+([^.!?;\n]{1,120}?)\s+(?:vertices|nodes)\b/i)?.[1];
  const after = prompt.match(/\b(?:vertices|nodes)\b\s*(?:are|is|:|=)?\s*([^.!?;\n]{1,120})/i)?.[1];
  const graphWith = prompt.match(/\bgraph\s+with\s+([^.!?;\n]{1,120})/i)?.[1];
  const candidate = before ?? after ?? graphWith;
  if (!candidate) return [];
  const clipped = candidate.split(/\b(?:edges?|show|draw|visualize|dijkstra|shortest|start|run|compute|how|using)\b/i)[0];
  return unique((clipped.match(/[A-Za-z0-9_]+/g) ?? [])
    .filter(token => token.length === 1 || !stopWords.has(token.toLowerCase()))
    .map(normalizeNode)).slice(0, 24);
}

function readEdges(prompt: string): WeightedEdge[] {
  const edges: WeightedEdge[] = [];
  const pattern = /\b([A-Za-z0-9_]+)\s*(?:<->|->|→|--|—|-|\bto\b)\s*([A-Za-z0-9_]+)\s*(?:\(\s*|(?:weight\s*)?(?:=|:)\s*|\s+)(-?\d+(?:\.\d+)?)\s*\)?/gi;
  for (const match of prompt.matchAll(pattern)) {
    const weight = Number(match[3]);
    if (!Number.isFinite(weight)) continue;
    const from = normalizeNode(match[1]);
    const to = normalizeNode(match[2]);
    if (from !== to) edges.push({ from, to, weight });
  }
  return edges;
}

export function parseGraphPrompt(prompt: string, previous: StudentGraph | null): StudentGraph | null {
  const parsedEdges = readEdges(prompt);
  const startingNode = prompt.match(/\b(?:start(?:ing)?\s+(?:at|from)|source)\s+([A-Za-z0-9_]+)\b/i)?.[1];
  const mentionsStartChange = previous !== null && startingNode !== undefined;
  const mentionsGraph = /\b(?:graph|vertices|vertex|nodes?|shortest\s+path)\b/i.test(prompt) || asksForDijkstra(prompt) || mentionsStartChange;
  if (!mentionsGraph && parsedEdges.length === 0) return null;

  const listedNodes = readNodeList(prompt);
  const saysDirected = /\b(?:directed|one-way)\b/i.test(prompt) && !/\bundirected\b/i.test(prompt);
  const saysUndirected = /\bundirected\b/i.test(prompt);
  const directed = saysDirected ? true : saysUndirected ? false : listedNodes.length ? false : previous?.directed ?? false;
  const mergePrevious = listedNodes.length === 0 && parsedEdges.length > 0 && previous !== null;
  const nodes = unique([
    ...(listedNodes.length ? listedNodes : mergePrevious ? previous!.nodes : []),
    ...parsedEdges.flatMap(edge => [edge.from, edge.to]),
  ]).slice(0, 24);

  if (!nodes.length && previous && mentionsGraph) {
    const start = startingNode ? normalizeNode(startingNode) : previous.start;
    return { ...previous, start: previous.nodes.includes(start) ? start : previous.start, algorithm: asksForDijkstra(prompt) ? "dijkstra" : previous.algorithm };
  }
  if (!nodes.length) return null;

  const algorithm = asksForDijkstra(prompt) ? "dijkstra" : listedNodes.length ? null : previous?.algorithm ?? null;
  const baseEdges = listedNodes.length ? [] : mergePrevious ? previous!.edges : [];
  const allEdges = [...baseEdges, ...parsedEdges];
  const seenEdges = new Map<string, WeightedEdge>();
  for (const edge of allEdges) {
    const key = directed ? `${edge.from}>${edge.to}` : [edge.from, edge.to].sort().join("~");
    seenEdges.set(key, edge);
  }
  const edges = [...seenEdges.values()].filter(edge => nodes.includes(edge.from) && nodes.includes(edge.to)).slice(0, 80);
  const start = startingNode ? normalizeNode(startingNode) : listedNodes.length ? nodes[0] : previous?.start ?? nodes[0];
  return { nodes, edges, directed, start: nodes.includes(start) ? start : nodes[0], algorithm };
}

export function createDijkstraTrace(graph: StudentGraph): DijkstraFrame[] {
  if (graph.nodes.length === 0 || !graph.nodes.includes(graph.start) || graph.edges.some(edge => edge.weight < 0)) return [];
  const distances: Record<string, number | null> = Object.fromEntries(graph.nodes.map(node => [node, null]));
  distances[graph.start] = 0;
  const adjacency = new Map(graph.nodes.map(node => [node, [] as Array<{ node: string; weight: number }>]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ node: edge.to, weight: edge.weight });
    if (!graph.directed) adjacency.get(edge.to)?.push({ node: edge.from, weight: edge.weight });
  }

  const settled: string[] = [];
  const pending = new Set(graph.nodes);
  const frames: DijkstraFrame[] = [{ current: null, settled: [], distances: { ...distances }, detail: `Set the distance to ${graph.start} to 0. Every other vertex starts at infinity.` }];
  while (pending.size) {
    const current = [...pending].sort((a, b) => (distances[a] ?? Infinity) - (distances[b] ?? Infinity))[0];
    if (distances[current] === null) break;
    pending.delete(current);
    settled.push(current);
    frames.push({ current, settled: [...settled], distances: { ...distances }, detail: `Choose ${current}, the unfinished vertex with the smallest tentative distance (${distances[current]}).` });
    for (const neighbor of adjacency.get(current) ?? []) {
      if (settled.includes(neighbor.node)) continue;
      const candidate = distances[current]! + neighbor.weight;
      if (distances[neighbor.node] === null || candidate < distances[neighbor.node]!) {
        distances[neighbor.node] = candidate;
        frames.push({ current, settled: [...settled], distances: { ...distances }, activeEdge: `${current}>${neighbor.node}`, detail: `Relax ${current} → ${neighbor.node}: ${distances[current]} + ${neighbor.weight} = ${candidate}. Update ${neighbor.node}'s distance.` });
      }
    }
  }
  frames.push({ current: null, settled: [...settled], distances: { ...distances }, detail: `Done. The shortest distances from ${graph.start} are shown below. Vertices still at infinity are unreachable.` });
  return frames;
}

export function formatDijkstraTrace(graph: StudentGraph): string {
  const trace = createDijkstraTrace(graph);
  if (!trace.length) return "";
  const steps = trace.slice(0, -1).map((frame, index) => `${index + 1}. ${frame.detail}`).join("\n");
  const final = trace[trace.length - 1].distances;
  const distances = graph.nodes.map(node => `${node}: ${final[node] ?? "∞"}`).join(", ");
  return `${steps}\nFinal shortest distances from ${graph.start}: ${distances}.`;
}
