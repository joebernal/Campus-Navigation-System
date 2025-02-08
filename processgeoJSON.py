import json
import math

def haversine_distance(coord1, coord2):
    """
    Calculate the Haversine distance between two points on the Earth's surface.
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371000  # Radius of Earth in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c  # Distance in meters

def find_nearest_node(lat, lon, nodes, exclude_id=None, exclude_types=None):
    """
    Find the nearest node to the given latitude and longitude, excluding certain node IDs or types.
    """
    min_distance = float('inf')
    nearest_node_id = None
    for node_id, node in nodes.items():
        if exclude_id is not None and node_id == exclude_id:
            continue
        if exclude_types and node.get('type') in exclude_types:
            continue
        distance = haversine_distance((lat, lon), (node['lat'], node['lng']))
        if distance < min_distance:
            min_distance = distance
            nearest_node_id = node_id
    return nearest_node_id

def connect_node_to_nearest_node(node_id, lat, lon, nodes, edges, accessible, exclude_types=None):
    """
    Connects a node to the nearest node in the graph, excluding nodes of certain types.
    """
    if nodes:
        nearest_node_id = find_nearest_node(lat, lon, nodes, exclude_id=node_id, exclude_types=exclude_types)
        if nearest_node_id and nearest_node_id != node_id:
            from_node = nodes[node_id]
            to_node = nodes[nearest_node_id]

            distance = haversine_distance(
                (from_node['lat'], from_node['lng']),
                (to_node['lat'], to_node['lng'])
            )
            time = distance / 1.4  # Average walking speed in m/s

            # Create the edge from node to nearest node
            edge = {
                'from': node_id,
                'to': nearest_node_id,
                'distance': distance,
                'time': time,
                'accessible': accessible
            }
            edges.append(edge)

            # Also add the reverse edge if the graph is undirected
            reverse_edge = {
                'from': nearest_node_id,
                'to': node_id,
                'distance': distance,
                'time': time,
                'accessible': accessible
            }
            edges.append(reverse_edge)

# Check if a node exists within a threshold
def node_exists(lat, lon, nodes, threshold):
    for node in nodes.values():
        distance = haversine_distance((lat, lon), (node['lat'], node['lng']))
        if distance <= threshold:
            return node['id']
    return None

# Load the GeoJSON data
with open('data.geojson', 'r') as f:
    data = json.load(f)

nodes = {}
edges = []
node_id_counter = 1  # To assign unique IDs to nodes

# Define the distance threshold (in meters)
NODE_MATCH_THRESHOLD = 1.0

# Separate features by geometry type
line_features = []
polygon_features = []

for feature in data['features']:
    geometry_type = feature['geometry']['type']
    if geometry_type == 'LineString':
        line_features.append(feature)
    elif geometry_type == 'Polygon':
        polygon_features.append(feature)
    # You can add more geometry types if needed

# Process LineString features first (paths)
for feature in line_features:
    properties = feature.get('properties', {})
    tags = properties  # Assuming tags are directly in properties

    # Determine accessibility
    accessible = True

    coordinates = feature['geometry']['coordinates']
    nodes_in_way = []

    # Process each coordinate pair
    for coord in coordinates:
        lon, lat = coord  # GeoJSON uses [longitude, latitude]
        # Check if node already exists within threshold
        existing_node_id = node_exists(lat, lon, nodes, NODE_MATCH_THRESHOLD)
        if existing_node_id is not None:
            node_id = existing_node_id
        else:
            node_id = node_id_counter
            node_id_counter += 1
            nodes[node_id] = {
                'id': node_id,
                'name': '',  # Paths typically don't have names
                'lat': lat,
                'lng': lon,
                'accessible': accessible,
                'type': 'path'
            }
        nodes_in_way.append(node_id)

    # Create edges between consecutive nodes
    for i in range(len(nodes_in_way) - 1):
        from_node_id = nodes_in_way[i]
        to_node_id = nodes_in_way[i + 1]
        from_node = nodes[from_node_id]
        to_node = nodes[to_node_id]

        distance = haversine_distance(
            (from_node['lat'], from_node['lng']),
            (to_node['lat'], to_node['lng'])
        )
        time = distance / 1.4  # Average walking speed in m/s

        edge = {
            'from': from_node_id,
            'to': to_node_id,
            'distance': distance,
            'time': time,
            'accessible': accessible,
            'name': ''  # Paths typically don't have names
        }
        edges.append(edge)

# Process Polygon features next (buildings)
for feature in polygon_features:
    properties = feature.get('properties', {})
    tags = properties  # Assuming tags are directly in properties

    # Extract the name from properties
    feature_name = properties.get('name', '')

    # Only process named Polygons (buildings)
    if feature_name:
        # Determine accessibility
        accessible = True

        # Process the outer ring
        outer_ring = feature['geometry']['coordinates'][0]
        nodes_in_building = []

        # Process each coordinate pair in the outer ring
        for coord in outer_ring:
            lon, lat = coord
            # Check if node already exists within threshold
            existing_node_id = node_exists(lat, lon, nodes, NODE_MATCH_THRESHOLD)
            if existing_node_id is not None:
                node_id = existing_node_id
                if not nodes[node_id]['name']:
                    nodes[node_id]['name'] = feature_name
            else:
                node_id = node_id_counter
                node_id_counter += 1
                nodes[node_id] = {
                    'id': node_id,
                    'name': feature_name,
                    'lat': lat,
                    'lng': lon,
                    'accessible': accessible,
                    'type': 'building'
                }
            nodes_in_building.append(node_id)

            # Connect this node to the nearest node in the path network, excluding other building nodes
            connect_node_to_nearest_node(
                node_id, lat, lon, nodes, edges, accessible, exclude_types={'building'}
            )

        # Create edges between consecutive nodes (forming the building perimeter)
        for i in range(len(nodes_in_building)):
            from_node_id = nodes_in_building[i]
            to_node_id = nodes_in_building[(i + 1) % len(nodes_in_building)]
            from_node = nodes[from_node_id]
            to_node = nodes[to_node_id]

            distance = haversine_distance(
                (from_node['lat'], from_node['lng']),
                (to_node['lat'], to_node['lng'])
            )
            time = distance / 1.4  # Average walking speed in m/s

            edge = {
                'from': from_node_id,
                'to': to_node_id,
                'distance': distance,
                'time': time,
                'accessible': accessible,
                'name': feature_name
            }
            edges.append(edge)

# Build the final JSON structure
campus_data = {
    'nodes': list(nodes.values()),
    'edges': edges
}

# Save to JSON file
with open('campus_nodes_edges.json', 'w') as f:
    json.dump(campus_data, f, indent=2)

print("Data extraction and conversion complete.")
