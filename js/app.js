// Fetch data and initialize the graph
fetch("campus_nodes_edges.json")
  .then((response) => response.json())
  .then((data) => {
    // Add nodes to the graph
    data.nodes.forEach((node) => {
      graph.addNode(node);
    });

    // Add edges to the graph
    data.edges.forEach((edge) => {
      graph.addEdge(edge);
    });

    // --------------------
    // Group nodes by name
    // --------------------
    const nodesByName = {};

    data.nodes.forEach((node) => {
      if (node.name && node.name.trim() !== "") {
        const name = node.name.trim();
        if (!nodesByName[name]) {
          nodesByName[name] = [];
        }
        nodesByName[name].push(node);
      }
    });

    // -------------------------------
    // Calculate average coordinates
    // -------------------------------
    const locationMarkers = [];

    for (const name in nodesByName) {
      const nodes = nodesByName[name];
      const avgLat =
        nodes.reduce((sum, node) => sum + node.lat, 0) / nodes.length;
      const avgLng =
        nodes.reduce((sum, node) => sum + node.lng, 0) / nodes.length;

      locationMarkers.push({
        name: name,
        lat: avgLat,
        lng: avgLng,
      });
    }

    // ----------------------------------------
    // Add a single marker per named location
    // ----------------------------------------
    locationMarkers.forEach((location) => {
      L.marker([location.lat, location.lng])
        .bindPopup(location.name)
        .addTo(map);
    });

    // ----------------------------------------------------
    // Populate the start and end select elements uniquely
    // ----------------------------------------------------
    const startSelect = document.getElementById("start");
    const endSelect = document.getElementById("end");

    locationMarkers.forEach((location) => {
      const option = document.createElement("option");
      option.value = location.name; // Use the location name as the value
      option.text = location.name;
      startSelect.add(option.cloneNode(true));
      endSelect.add(option);
    });

    // ---------------------------
    // (Optional) Draw edges on map
    // ---------------------------
    data.edges.forEach((edge) => {
      const fromNode = graph.nodes.get(edge.from);
      const toNode = graph.nodes.get(edge.to);

      const latlngs = [
        [fromNode.lat, fromNode.lng],
        [toNode.lat, toNode.lng],
      ];
      L.polyline(latlngs, { color: "gray" }).addTo(map);
    });

    // -------------------------
    // Event listener for routing
    // -------------------------
    document.getElementById("findRoute").addEventListener("click", () => {
      const startName = document.getElementById("start").value;
      const endName = document.getElementById("end").value;
      const algorithm = document.getElementById("algorithm").value;
      const accessibility = document.getElementById("accessibility").checked;

      const startNodeIds = nodesByName[startName].map((node) => node.id);
      const endNodeIds = nodesByName[endName].map((node) => node.id);

      let shortestPath = null;
      let shortestDistance = Infinity;

      if (startName === endName) {
        alert(
          "Start and end locations cannot be the same. Please select different locations."
        );
        return;
      }
      // For each combination of start and end nodes
      for (const startId of startNodeIds) {
        for (const endId of endNodeIds) {
          let path = [];
          switch (algorithm) {
            case "bfs":
              path = bfs(graph, startId, endId);
              break;
            case "dfs":
              path = dfs(graph, startId, endId);
              break;
            case "dijkstra":
              path = dijkstra(graph, startId, endId, "distance", accessibility);
              break;
          }

          if (path.length > 0) {
            // Calculate total distance of the path
            const totalDistance = calculatePathDistance(path);

            if (totalDistance < shortestDistance) {
              shortestDistance = totalDistance;
              shortestPath = path;
            }
          }
        }
      }

      if (shortestPath) {
        drawPath(shortestPath);
      } else {
        alert("No path found between the selected locations.");
      }
    });
  });

function calculatePathDistance(path) {
  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const fromNodeId = path[i];
    const toNodeId = path[i + 1];

    const edges = graph.adjacencyList.get(fromNodeId);

    const edge = edges.find((e) => e.to === toNodeId);
    if (edge) {
      totalDistance += edge.weight;
    } else {
      // Edge not found (this should not happen if the graph is consistent)
      totalDistance += Infinity;
    }
  }

  return totalDistance;
}

let currentPathLayer;

function drawPath(nodeIds) {
  // Remove existing path
  if (currentPathLayer) {
    map.removeLayer(currentPathLayer);
  }

  const latlngs = nodeIds.map((nodeId) => {
    const node = graph.nodes.get(nodeId);
    return [node.lat, node.lng];
  });

  currentPathLayer = L.polyline(latlngs, { color: "red" }).addTo(map);

  // Zoom the map to the path
  map.fitBounds(currentPathLayer.getBounds());
}
