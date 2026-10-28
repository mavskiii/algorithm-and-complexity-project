export const lessonNotes: Record<string, { description: string; uses: string[]; example: string; remember: string }> = {
  bfs: {
    description:'Breadth-first search visits connected data one level at a time. It visits direct neighbors first, then their neighbors. A first-in, first-out queue preserves this order.',
    uses:['Finding the fewest connections between people in a social network.', 'Exploring related records or pages by their distance from a starting item.', 'Finding the shortest path through a maze when every move has the same cost.'],
    example:'In a friends network, BFS finds your direct friends first, then friends of friends. It can tell you the minimum number of connections between you and another person.',
    remember:'BFS minimizes the number of edges. Use a weighted shortest-path algorithm when connections have unequal costs.',
  },
  dfs: {
    description:'Depth-first search explores one branch as far as it can before returning to try another. It uses a stack or recursive calls to remember where to return.',
    uses:['Walking through nested folders or hierarchical data.', 'Detecting cycles in dependency graphs.', 'Finding connected regions and exploring possible paths with backtracking.'],
    example:'To search nested folders, DFS opens a folder, explores its subfolders completely, then returns to inspect the next folder.',
    remember:'DFS can find a path, but that path is not necessarily the shortest. Cycle detection rules differ for directed and undirected graphs.',
  },
  dijkstra: {
    description:'Dijkstra finds the cheapest routes from one starting vertex to every reachable vertex. It repeatedly chooses the unfinished vertex with the smallest known distance, then checks whether going through it improves neighboring routes.',
    uses:['Planning road routes using non-negative distances or travel times.', 'Choosing low-cost routes through a network.', 'Finding movement paths on a game map with different terrain costs.'],
    example:'If A → B costs 4, A → D costs 2, and D → E costs 3, reaching E through D costs 5. Dijkstra compares this with other routes to find the cheapest one.',
    remember:'Every edge weight must be zero or positive. A minimum-cost route is different from a minimum spanning tree.',
  },
  'bellman-ford': {
    description:'Bellman–Ford finds shortest paths from one starting vertex by repeatedly checking every edge. It allows negative edge costs. An additional pass checks for a reachable cycle that keeps reducing the total cost.',
    uses:['Analyzing routes with credits, rebates, or other negative costs.', 'Detecting negative-cost cycles in weighted models.', 'Understanding distance-vector routing, which uses the Bellman–Ford approach.'],
    example:'A → B costs 4 and B → C gives a credit of 2 (weight −2). Bellman–Ford finds the total cost of 2 from A to C and checks whether any reachable negative cycle lets costs decrease forever.',
    remember:'A reachable negative cycle means a finite shortest distance does not exist for vertices reachable from that cycle.',
  },
  'floyd-warshall': {
    description:'Floyd–Warshall finds shortest distances for every start-and-destination pair. It stores answers in a matrix and asks whether allowing each vertex as an intermediate stop makes any route shorter.',
    uses:['Precomputing travel costs between every pair of locations in a small network.', 'Answering many route-distance queries after a single calculation.', 'Comparing all-pairs reachability and costs in dense graphs.'],
    example:'If A → B costs 3 and B → C costs 2, the A-to-C matrix cell becomes 5 when B is allowed as an intermediate stop.',
    remember:'Its O(V³) running time suits smaller graphs. Negative edges are allowed, but negative cycles prevent meaningful shortest paths through them.',
  },
  prim: {
    description:'Prim builds a minimum spanning tree: connections that join every vertex with the lowest total edge cost and no cycles. It starts with one vertex and repeatedly attaches the cheapest edge leading outside the current tree.',
    uses:['Planning inexpensive cable or pipe connections between sites.', 'Connecting all locations in an undirected network with minimum construction cost.', 'Building a spanning tree when the graph is relatively dense.'],
    example:'To connect five campus buildings, Prim starts at one building and keeps selecting the cheapest link from the connected buildings to a building outside the tree.',
    remember:'A single spanning tree requires a connected, undirected weighted graph. Prim minimizes total connection cost, not each route from the start.',
  },
  kruskal: {
    description:'Kruskal builds a minimum spanning tree by considering the entire graph’s edges from cheapest to most expensive. It accepts an edge only when it joins separate components. Union-find tracks those components.',
    uses:['Selecting inexpensive links from a list of candidate network connections.', 'Building minimum spanning trees for sparse graphs.', 'Single-linkage clustering, where components merge as increasingly costly connections are considered.'],
    example:'With A–B = 1, B–C = 2, and A–C = 3, Kruskal accepts the first two edges. It rejects A–C because A and C are already connected, so that edge would close a cycle.',
    remember:'On a disconnected graph it produces a minimum spanning forest. Prim and Kruskal can choose different trees of equal cost when weights tie.',
  },
  topological: {
    description:'Topological sorting arranges tasks so every prerequisite comes before the tasks that depend on it. Kahn’s algorithm selects vertices with no remaining incoming edges, outputs them, and removes their outgoing edges.',
    uses:['Scheduling tasks that depend on earlier tasks.', 'Choosing a valid compilation or package build order.', 'Organizing courses so prerequisites are completed first.'],
    example:'If Programming 1 must come before Data Structures, and Data Structures before Algorithms, a valid order is Programming 1 → Data Structures → Algorithms.',
    remember:'The graph must be directed and acyclic. There may be several valid orders; a directed cycle makes a complete topological order impossible.',
  },
};
