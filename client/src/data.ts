export type Topic = {
  id: string; title: string; short: string; group: string; summary: string;
  use: string; time: string; space: string; code: string; keywords: string;
  trace?: "bfs" | "dfs" | "dijkstra"; quiz: { question: string; options: string[]; answer: number };
};

export const topics: Topic[] = [
  { id:"bfs", title:"Breadth-first search", short:"BFS", group:"Traversal", summary:"BFS explores a graph level by level. It visits every neighbor of the start node before moving one step further out, using a queue to keep track of what to visit next.", use:"Find the fewest edges between two nodes in an unweighted graph, or find connected components.", time:"O(V + E)", space:"O(V)", trace:"bfs", keywords:"queue level order unweighted fewest edges", code:`queue = [start]
mark start as visited

while queue is not empty:
  u = dequeue(queue)
  for v in neighbors(u):
    if v is not visited:
      mark v as visited
      enqueue(queue, v)`, quiz:{question:"Which data structure gives BFS its level-by-level order?",options:["A queue","A stack","A sorted edge list"],answer:0} },
  { id:"dfs", title:"Depth-first search", short:"DFS", group:"Traversal", summary:"DFS follows one path as deeply as it can, then backtracks when it reaches a dead end. It uses recursion or an explicit stack.", use:"Explore graph structure, detect cycles, find connected components, or build a topological ordering.", time:"O(V + E)", space:"O(V)", trace:"dfs", keywords:"stack recursion backtracking cycle", code:`visit(u):
  mark u as visited
  for v in neighbors(u):
    if v is not visited:
      visit(v)`, quiz:{question:"What does DFS do when a branch has no unseen neighbors?",options:["Restart the graph","Backtrack","Sort all edges"],answer:1} },
  { id:"dijkstra", title:"Dijkstra's algorithm", short:"Dijkstra", group:"Shortest paths", summary:"Dijkstra repeatedly finalizes the closest unfinished node, then relaxes its outgoing edges. A priority queue chooses which node to process next.", use:"Find single-source shortest paths when all edge weights are non-negative.", time:"O((V + E) log V)", space:"O(V)", trace:"dijkstra", keywords:"priority queue shortest path non-negative weights relax", code:`dist[start] = 0
dist[all other nodes] = infinity
priorityQueue = all nodes by distance

while priorityQueue is not empty:
  u = extractMin(priorityQueue)
  for each edge (u, v, weight):
    candidate = dist[u] + weight
    if candidate < dist[v]:
      dist[v] = candidate
      update priorityQueue with v`, quiz:{question:"Which edge weights are valid for Dijkstra's algorithm?",options:["Only negative weights","Any weights","Non-negative weights"],answer:2} },
  { id:"bellman-ford", title:"Bellman-Ford algorithm", short:"Bellman-Ford", group:"Shortest paths", summary:"Bellman-Ford relaxes every edge V − 1 times. One extra pass can reveal a reachable negative-weight cycle.", use:"Find single-source shortest paths with negative edges, or detect a reachable negative cycle.", time:"O(V · E)", space:"O(V)", keywords:"negative weights negative cycle relax edges", code:`dist[start] = 0
dist[all other nodes] = infinity

repeat V - 1 times:
  for each edge (u, v, weight):
    if dist[u] + weight < dist[v]:
      dist[v] = dist[u] + weight

for each edge (u, v, weight):
  if dist[u] + weight < dist[v]:
    report reachable negative cycle`, quiz:{question:"What can the extra relaxation pass detect?",options:["A reachable negative cycle","A minimum spanning tree","A topological order"],answer:0} },
  { id:"floyd-warshall", title:"Floyd–Warshall algorithm", short:"Floyd–Warshall", group:"Shortest paths", summary:"Floyd–Warshall builds a distance matrix. For each possible intermediate node k, it checks whether the route from i to j becomes shorter through k.", use:"Find all-pairs shortest paths in a small or dense graph.", time:"O(V³)", space:"O(V²)", keywords:"all pairs dynamic programming matrix", code:`dist = adjacencyMatrix

for k in nodes:
  for i in nodes:
    for j in nodes:
      if dist[i][k] + dist[k][j] < dist[i][j]:
        dist[i][j] = dist[i][k] + dist[k][j]`, quiz:{question:"What does Floyd–Warshall compute?",options:["One spanning tree","All-pairs shortest paths","A DFS traversal"],answer:1} },
  { id:"prim", title:"Prim's algorithm", short:"Prim", group:"Spanning trees", summary:"Prim grows a minimum spanning tree from a start node. At each step it adds the cheapest edge connecting the current tree to a new node.", use:"Build a minimum spanning tree, especially for dense graphs.", time:"O(E log V)", space:"O(V)", keywords:"minimum spanning tree mst greedy priority queue", code:`tree = {start}
priorityQueue = edges leaving tree

while tree does not contain every node:
  (u, v, weight) = extractCheapestEdge()
  if v is not in tree:
    add (u, v) to tree
    add v to tree
    add edges leaving v to priorityQueue`, quiz:{question:"How does Prim grow its spanning tree?",options:["Choose the cheapest edge connecting the tree to a new node","Choose the largest edge","Add every edge"],answer:0} },
  { id:"kruskal", title:"Kruskal's algorithm", short:"Kruskal", group:"Spanning trees", summary:"Kruskal sorts edges by weight and adds each edge unless it would create a cycle. A union-find structure makes cycle checks efficient.", use:"Build a minimum spanning tree, especially for sparse graphs.", time:"O(E log E)", space:"O(V)", keywords:"minimum spanning tree mst union find sort edges", code:`sort edges by increasing weight
tree = empty set
create a disjoint set for each node

for each edge (u, v, weight):
  if find(u) != find(v):
    add edge to tree
    union(u, v)`, quiz:{question:"What helps Kruskal efficiently check whether an edge creates a cycle?",options:["A FIFO queue","A distance matrix","Union-find"],answer:2} },
  { id:"topological", title:"Topological sorting", short:"Topological sort", group:"Ordering", summary:"A topological sort orders the nodes of a directed acyclic graph so every edge points forward in the list.", use:"Order tasks with dependencies, plan build sequences, or organize course prerequisites.", time:"O(V + E)", space:"O(V)", keywords:"dag ordering dependencies kahn in-degree", code:`queue = nodes with in-degree 0
order = []

while queue is not empty:
  u = dequeue(queue)
  append u to order
  for v in outgoingNeighbors(u):
    inDegree[v] -= 1
    if inDegree[v] == 0:
      enqueue(queue, v)

if order has fewer than V nodes:
  report a cycle`, quiz:{question:"Which graph is guaranteed to have a topological order?",options:["Any undirected graph","A directed acyclic graph","Every weighted graph"],answer:1} },
];

export const groups = [...new Set(topics.map((topic) => topic.group))];
export const sampleNodes = ["A", "B", "C", "D", "E", "F"];
export const sampleEdges: [string, string, number][] = [
  ["A","B",4],["A","D",2],["B","C",3],["D","E",3],["B","E",6],["C","F",5],["E","F",2],
];

