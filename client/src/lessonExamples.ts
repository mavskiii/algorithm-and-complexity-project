import { sampleEdges, sampleNodes } from './data';
export type TraceKind = 'bfs' | 'dfs' | 'dijkstra' | 'bellman-ford' | 'floyd-warshall' | 'prim' | 'kruskal' | 'topological';
export type GraphEdge = [string, string, number];
export type GraphExample = { nodes: string[]; edges: GraphEdge[]; directed: boolean; weighted: boolean; description: string; positions: Record<string, [number, number]> };
const traversal: GraphExample = {
  nodes: sampleNodes, edges: sampleEdges, directed: false, weighted: false,
  description: 'Start at A. Explore the connections between six vertices; traversal ignores edge costs.',
  positions: { A:[0,110], B:[150,0], C:[330,0], D:[150,220], E:[330,220], F:[480,110] },
};
const mst: GraphExample = {
  nodes:['A','B','C','D','E'], edges:[['A','B',1],['B','C',2],['A','C',3],['C','D',4],['D','E',5],['B','D',6],['C','E',7]],
  directed:false, weighted:true,
  description:'Connect all five vertices at minimum total cost. Prim and Kruskal use the same graph so you can compare their choices.',
  positions:{ A:[0,140], B:[150,0], C:[230,240], D:[360,0], E:[490,170] },
};
export function getExample(kind: TraceKind): GraphExample {
  if (kind === 'prim' || kind === 'kruskal') return mst;
  if (kind === 'bellman-ford') return {
    nodes:['A','B','C','D','E'], edges:[['D','E',2],['C','D',3],['B','C',-2],['A','B',4],['A','C',5],['B','D',6],['E','B',1]],
    directed:true, weighted:true,
    description:'Start at A. B → C has weight −2. Repeated edge passes find shortest paths and an extra pass checks for a reachable negative cycle.',
    positions:{A:[0,140],B:[150,0],C:[180,260],D:[360,0],E:[490,180]},
  };
  if (kind === 'floyd-warshall') return {
    nodes:['A','B','C','D'], edges:[['A','B',3],['A','D',10],['B','C',2],['C','D',1],['D','A',4]],
    directed:true, weighted:true,
    description:'Find the shortest route between every pair. The matrix tests A, B, C, then D as intermediate vertices; ∞ means no route is known yet.',
    positions:{A:[0,0],B:[360,0],C:[360,240],D:[0,240]},
  };
  if (kind === 'topological') return {
    nodes:sampleNodes, edges:[['A','C',0],['B','C',0],['B','D',0],['C','E',0],['D','F',0],['E','F',0]],
    directed:true, weighted:false,
    description:'An arrow means “must happen before.” Kahn’s algorithm removes tasks with zero remaining prerequisites to build one valid order.',
    positions:{A:[0,0],B:[0,230],C:[190,0],D:[190,230],E:[380,0],F:[490,180]},
  };
  return kind === 'dijkstra' ? {...traversal, weighted:true, description:'Start at A. All costs are non-negative. Settle the nearest unfinished vertex and test whether its neighbors have shorter routes.'} : traversal;
}
export const edgeKey = (a: string, b: string, directed = false) => directed ? `${a}>${b}` : [a,b].sort().join('~');
export const formatNumber = (value: number) => Number.isFinite(value) ? String(value) : '∞';
