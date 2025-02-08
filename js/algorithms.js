function bfs(graph, startId, endId) {
  const queue = [startId];
  const visited = new Set();
  const predecessor = {};

  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === endId) {
      break;
    }

    const neighbors = graph.adjacencyList.get(current) || [];
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        predecessor[neighbor.to] = current;
        queue.push(neighbor.to);
      }
    });
  }

  // Reconstruct path
  const path = [];
  let currentNode = endId;
  while (currentNode !== undefined && currentNode !== startId) {
    path.unshift(currentNode);
    currentNode = predecessor[currentNode];
  }
  if (currentNode === startId) {
    path.unshift(startId);
  } else {
    // No path found
    return [];
  }

  return path;
}

function dfs(graph, startId, endId) {
  const stack = [startId];
  const visited = new Set();
  const predecessor = {};

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === endId) {
      break;
    }

    if (!visited.has(current)) {
      visited.add(current);

      const neighbors = graph.adjacencyList.get(current) || [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor.to)) {
          predecessor[neighbor.to] = current;
          stack.push(neighbor.to);
        }
      });
    }
  }

  // Reconstruct path
  const path = [];
  let currentNode = endId;
  while (currentNode !== undefined && currentNode !== startId) {
    path.unshift(currentNode);
    currentNode = predecessor[currentNode];
  }
  if (currentNode === startId) {
    path.unshift(startId);
  } else {
    // No path found
    return [];
  }

  return path;
}

// Dijkstra's Algorithm
class MinPriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(element, priority) {
    this.queue.push({ element, priority });
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

function dijkstra(
  graph,
  startId,
  endId,
  criteria = "distance",
  accessibility = true
) {
  const distances = {};
  const previous = {};
  const pq = new MinPriorityQueue();

  graph.nodes.forEach((node, nodeId) => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  });

  distances[startId] = 0;
  pq.enqueue(startId, 0);

  while (!pq.isEmpty()) {
    const currentId = pq.dequeue().element;

    if (currentId === endId) {
      break;
    }

    const neighbors = graph.adjacencyList.get(currentId) || [];
    neighbors.forEach((neighbor) => {
      if (accessibility && !neighbor.accessible) {
        return; // Skip non-accessible paths
      }

      const weight = neighbor.weight;
      const alt = distances[currentId] + weight;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previous[neighbor.to] = currentId;
        pq.enqueue(neighbor.to, alt);
      }
    });
  }

  // Reconstruct path
  const path = [];
  let currentNode = endId;
  while (currentNode !== undefined && currentNode !== startId) {
    path.unshift(currentNode);
    currentNode = previous[currentNode];
  }
  if (currentNode === startId) {
    path.unshift(startId);
  } else {
    // No path found
    return [];
  }

  return path;
}
