class Graph {
  constructor() {
    this.nodes = new Map(); // Map of nodeId to node data
    this.adjacencyList = new Map(); // Map of nodeId to array of edges
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  addEdge(edge) {
    let fromEdges = this.adjacencyList.get(edge.from);
    if (!fromEdges) {
      fromEdges = [];
      this.adjacencyList.set(edge.from, fromEdges);
    }
    fromEdges.push({
      to: edge.to,
      weight: edge.distance, // Or edge.time, depending on your criteria
      accessible: edge.accessible,
    });
  }
}

const graph = new Graph(); // Create an instance of the Graph
graph.nodes.forEach((node, nodeId) => {
  const edges = graph.adjacencyList.get(nodeId);
  console.log(`Node ID=${nodeId}, Edges:`, edges);
});
