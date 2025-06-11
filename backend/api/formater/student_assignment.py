import json
from collections import defaultdict
from typing import Dict, Any, List
from path_finder import find_min_path  # внешняя зависимость

MAX_PATH_WEIGHT = 26.3452  # Максимальный вес пути в графе


def load_data(graph_file: str, input_file: str):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['students'], data['project']['requirements'], data['project']['members_quantity'], data


def find_closest_skill(graph_file: str, student_skills: List[Dict[str, float]], requirement: Dict[str, float]):
    req_skill = list(requirement.keys())[0]
    min_normalized_weight = 0
    closest_skill = None
    best_path = None

    for skill_dict in student_skills:
        skill = list(skill_dict.keys())[0]
        if skill == req_skill:
            return skill, 1.0, [skill]

    for skill_dict in student_skills:
        skill = list(skill_dict.keys())[0]
        try:
            distance, path = find_min_path(graph_file, skill, req_skill)
            normalized_weight = 1 - (distance / MAX_PATH_WEIGHT)
            if normalized_weight > min_normalized_weight:
                min_normalized_weight = normalized_weight
                closest_skill = skill
                best_path = path
        except Exception:
            continue

    return closest_skill, min_normalized_weight, best_path


def calculate_compatibility_vector(graph_file: str, student: Dict[str, Any], requirements: List[Dict[str, float]]):
    student_skills = student['skills']
    compatibility_vector = []
    skill_matches = []

    for req in requirements:
        req_skill = list(req.keys())[0]
        closest_skill, normalized_weight, path = find_closest_skill(graph_file, student_skills, req)

        compatibility_vector.append(normalized_weight)
        skill_matches.append({
            'requirement': req_skill,
            'matched_skill': closest_skill,
            'normalized_weight': normalized_weight,
            'path': path
        })

    return compatibility_vector, skill_matches


def match_skills(graph_file: str, input_file: str) -> Dict[str, Dict[str, Any]]:
    students, requirements, _, _ = load_data(graph_file, input_file)
    results = {}

    for student in students:
        name = f"{student['meta']['name']} {student['meta']['surname']}"
        email = student['meta']['e-mail']
        compatibility_vector, _ = calculate_compatibility_vector(graph_file, student, requirements)
        results[email] = {
            'name': name,
            'compatibility_vector': compatibility_vector
        }

    return results


def compute_compatibility_scores(data: Dict[str, Dict[str, Any]], skill_weights: List[float]) -> Dict[str, Dict[str, Any]]:
    result = {}
    for email, entry in data.items():
        name = entry["name"]
        vector = entry["compatibility_vector"]
        if len(vector) != len(skill_weights):
            raise ValueError(f"Vector length mismatch for {email}")
        weighted_score = sum(v * w for v, w in zip(vector, skill_weights))
        result[email] = {
            "name": name,
            "score": round(weighted_score, 4)
        }
    return result


def assign_top_students(graph_file: str, input_file: str) -> Dict[str, Dict[str, Any]]:
    students, requirements, members_quantity, raw_data = load_data(graph_file, input_file)
    skill_weights = [list(r.values())[0] for r in requirements]

    compatibility_data = match_skills(graph_file, input_file)
    scored_students = compute_compatibility_scores(compatibility_data, skill_weights)

    sorted_students = sorted(scored_students.items(), key=lambda x: x[1]['score'], reverse=True)
    top_students = dict(sorted_students[:members_quantity])

    return top_students


if __name__ == "__main__":
    try:
        graph_file = "graph_weights.json"
        input_file = "input_data.json"

        selected = assign_top_students(graph_file, input_file)

        print("\nНазначенные студенты на проект:")
        for email, info in selected.items():
            print(f"{info['name']} ({email}): {info['score']}")

    except FileNotFoundError as e:
        print(f"Ошибка: Файл не найден - {e}")
    except json.JSONDecodeError:
        print("Ошибка: Неверный формат JSON файла")
    except Exception as e:
        print(f"Произошла ошибка: {e}")
