import { sampleEdges, sampleNodes } from "./data";

export type TraceStep = {
  current: string | null; visited: string[]; waiting: string[]; detail: string;
  label: string; value: string; distances?: Record<string, number>;
  highlighted?: string[];
};
const neighbors = (node: string) => sampleEdges.flatMap(([a,b,w]) =>
  a === node ? [{ node:b, weight:w }] : b === node ? [{ node:a, weight:w }] : [],
).sort((a,b) => a.node.localeCompare(b.node));
const edgeId = (a: string,b: string) => [a,b].sort().join("");

export function createTrace(kind: "bfs"|"dfs"|"dijkstra"): TraceStep[] {
  const steps: TraceStep[] = [];
  if (kind === "bfs") {
    const queue=["A"], seen=new Set(queue), visited:string[]=[];
    steps.push({current:null,visited:[],waiting:[...queue],detail:"Start at A. Add it to the queue.",label:"Queue",value:"A"});
    while(queue.length) {
      const u=queue.shift()!; visited.push(u);
      for (const v of neighbors(u)) if(!seen.has(v.node)){seen.add(v.node);queue.push(v.node)}
      steps.push({current:u,visited:[...visited],waiting:[...queue],detail:`Dequeue ${u}. Mark it visited and enqueue its unseen neighbors.`,label:"Queue",value:queue.join(" · ")||"empty"});
    }
  } else if(kind === "dfs") {
    const seen=new Set<string>(),visited:string[]=[],path:string[]=[];
    steps.push({current:null,visited:[],waiting:[],detail:"Start at A. Follow a path as far as you can before backtracking.",label:"Call stack",value:"empty"});
    const visit=(u:string) => {
      seen.add(u); visited.push(u); path.push(u);
      steps.push({current:u,visited:[...visited],waiting:[...path],detail:`Visit ${u}. Continue to its first unseen neighbor.`,label:"Call stack",value:path.join(" → ")});
      for(const v of neighbors(u)) if(!seen.has(v.node)) visit(v.node);
      path.pop();
      if(path.length) steps.push({current:path.at(-1)!,visited:[...visited],waiting:[...path],detail:`No unseen neighbors remain at ${u}. Backtrack to ${path.at(-1)}.`,label:"Call stack",value:path.join(" → ")});
    };
    visit("A");
  } else {
    const dist:Record<string,number>=Object.fromEntries(sampleNodes.map(n=>[n,Infinity]));dist.A=0;
    const finished=new Set<string>();
    const snapshot=()=>Object.fromEntries(Object.entries(dist));
    const fmt=()=>sampleNodes.map(n=>`${n}: ${dist[n]===Infinity?"∞":dist[n]}`).join("   ");
    steps.push({current:null,visited:[],waiting:["A"],detail:"Set A's distance to 0. Every other distance starts unknown (∞).",label:"Distances",value:fmt(),distances:snapshot()});
    while(true) {
      const u=sampleNodes.filter(n=>!finished.has(n)&&dist[n]<Infinity).sort((a,b)=>dist[a]-dist[b]||a.localeCompare(b))[0];
      if(!u)break;
      finished.add(u);const improved:string[]=[],highlighted:string[]=[];
      for(const v of neighbors(u)) {
        if(!finished.has(v.node)&&dist[u]+v.weight<dist[v.node]) {
          dist[v.node]=dist[u]+v.weight;improved.push(`${v.node} = ${dist[v.node]}`);highlighted.push(edgeId(u,v.node));
        }
      }
      steps.push({current:u,visited:[...finished],waiting:sampleNodes.filter(n=>!finished.has(n)&&dist[n]<Infinity),detail:`Finalize ${u} at distance ${dist[u]}. ${improved.length?`Improved: ${improved.join(", ")}.`:"No shorter routes found."}`,label:"Distances",value:fmt(),distances:snapshot(),highlighted});
    }
  }
  return steps;
}

