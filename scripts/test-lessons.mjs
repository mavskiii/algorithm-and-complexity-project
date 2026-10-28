import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { test } from 'node:test';
const bundle=await build({entryPoints:['client/src/algorithms.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createTrace}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const last=kind=>createTrace(kind).at(-1);

test('BFS visits each vertex once in level order',()=>{
  assert.deepEqual(last('bfs').visited,['A','B','D','C','E','F']);
});
test('DFS visits all vertices once and finishes with an empty stack',()=>{
  const result=last('dfs');assert.equal(new Set(result.visited).size,6);assert.equal(result.waiting.length,0);
});
test('Dijkstra produces correct distances and never changes a settled distance',()=>{
  const trace=createTrace('dijkstra');
  assert.deepEqual(trace.at(-1).distances,{A:0,B:4,C:7,D:2,E:5,F:7});
  for(let i=1;i<trace.length;i++)for(const n of trace[i-1].visited)assert.equal(trace[i].distances[n],trace[i-1].distances[n]);
  assert.equal(trace[0].distances.B,Infinity,'previous snapshots stay unchanged');
});
test('Bellman–Ford handles a negative edge and checks for a negative cycle',()=>{
  const trace=createTrace('bellman-ford');
  assert.deepEqual(trace.at(-1).distances,{A:0,B:4,C:2,D:5,E:7});assert.equal(trace.at(-1).negativeCycle,false);
  assert.ok(trace.some(s=>s.phase==='Pass 4 of 4'));assert.equal(trace[0].distances.E,Infinity);
});
test('Floyd–Warshall calculates every pair and preserves earlier matrices',()=>{
  const trace=createTrace('floyd-warshall');
  assert.deepEqual(trace.at(-1).matrix,[[0,3,5,6],[7,0,2,3],[5,8,0,1],[4,7,9,0]]);
  assert.equal(trace[0].matrix[0][2],Infinity);
  assert.ok(trace.some(s=>s.matrixFocus&&s.highlighted.length>0));
});
for(const kind of ['prim','kruskal'])test(`${kind} builds an acyclic minimum spanning tree`,()=>{
  const result=last(kind);assert.equal(result.totalWeight,12);assert.equal(result.selectedEdges.length,4);
  const parent={A:'A',B:'B',C:'C',D:'D',E:'E'};
  const find=n=>parent[n]===n?n:find(parent[n]);
  for(const edge of result.selectedEdges){const [a,b]=edge.split('~');assert.notEqual(find(a),find(b));parent[find(b)]=find(a)}
  assert.equal(new Set(Object.keys(parent).map(find)).size,1);
  if(kind==='kruskal')assert.ok(result.rejectedEdges.includes('A~C'));
});
test('Topological output respects every prerequisite and indegrees never go negative',()=>{
  const trace=createTrace('topological'),order=trace.at(-1).order;
  assert.equal(new Set(order).size,6);
  for(const [a,b]of [['A','C'],['B','C'],['B','D'],['C','E'],['D','F'],['E','F']])assert.ok(order.indexOf(a)<order.indexOf(b));
  for(const frame of trace)assert.ok(Object.values(frame.indegrees).every(n=>n>=0));
  assert.deepEqual(trace[0].indegrees,{A:0,B:0,C:2,D:1,E:1,F:2});
});
test('All trace context fits the tutor request limits',()=>{
  for(const kind of ['bfs','dfs','dijkstra','bellman-ford','floyd-warshall','prim','kruskal','topological'])for(const step of createTrace(kind)){
    assert.ok(step.detail.length<=500);assert.ok(step.label.length<=80);assert.ok(step.value.length<=500);
  }
});
