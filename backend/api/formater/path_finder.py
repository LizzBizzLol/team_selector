import json
import heapq

def dijkstra(graph, start_node):  
    distances = {vertex: float('infinity') for vertex in graph}  
    distances[start_node] = 0  
    priority_queue = [(0, start_node)]  
    previous_nodes = {vertex: None for vertex in graph}  

    while priority_queue:  
        current_distance, current_vertex = heapq.heappop(priority_queue)  
        if current_distance > distances[current_vertex]:  
            continue  
        for neighbor, weight in graph[current_vertex].items():  
            distance = current_distance + weight  
            if distance < distances[neighbor]:  
                distances[neighbor] = distance  
                previous_nodes[neighbor] = current_vertex  
                heapq.heappush(priority_queue, (distance, neighbor))  
    return distances, previous_nodes  

def find_min_path(graph_file, start_node, end_node):
    """
    Использовать функцию можно так:
        distance, path = find_min_path("graph_weights.json", "machine learning", "deep learning")
        print_path(distance, path)
    """
    with open(graph_file, 'r', encoding='utf-8') as f:
        graph = json.load(f)
    distances, previous_nodes = dijkstra(graph, start_node)
    if distances[end_node] == float('infinity'):
        return float('infinity'), []
    path = []
    current = end_node
    while current is not None:
        path.append(current)
        current = previous_nodes[current]
    path.reverse()
    
    return distances[end_node], path

def print_path(distance, path):
    """Выводит информацию о найденном пути"""
    if distance == float('infinity'):
        print("Путь не найден")
    else:
        print(f"Длина пути: {distance:.4f}")
        print(f"Путь: {' -> '.join(path)}")

if __name__ == "__main__":
    start = "decision tree"
    end = "cluster applications"
    
    distance, path = find_min_path("graph_weights.json", start, end)
    print(f"\nПоиск пути от '{start}' до '{end}':")
    print_path(distance, path)