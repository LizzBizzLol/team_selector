import json
from typing import Dict, Any, List, Tuple
from path_finder import find_min_path  # Внешняя функция
import sys

MAX_PATH_WEIGHT = 26.3452  # Максимальный вес пути в графе


def load_data(graph_file: str, input_file: str):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['students'], data['project']['requirements'], data['project']['members_quantity'], data['project']['members_quantity_min'], data


def find_closest_skill(graph_file: str, student_skills: List[Dict[str, float]], requirement: Dict[str, float]) -> Tuple[str, float, List[str]]:
    req_skill = list(requirement.keys())[0]
    required_threshold = list(requirement.values())[0]
    min_normalized_weight = 0
    closest_skill = None
    best_path = None
    best_distance = float('inf')
    best_level = 0

    for skill_dict in student_skills:
        skill = list(skill_dict.keys())[0]
        level = skill_dict[skill]

        if skill == req_skill:
            sim = level
            print(f"[MATCH] {skill} == {req_skill} → sim = {sim:.4f} (прямое совпадение)")
            return skill, sim, [skill]

        try:
            distance, path = find_min_path(graph_file, skill, req_skill)
            if distance == float('inf'):
                continue

            sim = level * (1 - distance / MAX_PATH_WEIGHT)
            print(f"[CHECK] {skill} → {req_skill} | путь: {path}, dist = {distance:.4f}, lvl = {level:.2f}, sim = {sim:.4f}")

            if sim > min_normalized_weight:
                min_normalized_weight = sim
                closest_skill = skill
                best_path = path
                best_distance = distance
                best_level = level

        except Exception as e:
            print(f"[ERROR] Ошибка при обработке {skill} → {req_skill}: {e}")
            continue

    if closest_skill:
        print(f"[SELECTED] {closest_skill} покрывает {req_skill} | sim = {min_normalized_weight:.4f}, путь: {best_path}")
    else:
        print(f"[FAIL] Нет подходящего навыка для {req_skill} среди {student_skills}")

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


def score_candidate(compatibility_vector: List[float], weights: List[float], thresholds: List[float]) -> float:
    score = 0.0
    for v, w, threshold in zip(compatibility_vector, weights, thresholds):
        if v >= threshold:
            score += w * v
    return round(score, 4)


def assign_team(graph_file: str, input_file: str):
    students, requirements, kmax, kmin, raw_data = load_data(graph_file, input_file)
    weights = [list(r.values())[0] for r in requirements]
    required_terms = [list(r.keys())[0] for r in requirements]

    scored = []

    print("\n--- Анализ кандидатов ---")
    for student in students:
        name = f"{student['meta']['name']} {student['meta']['surname']}"
        email = student['meta']['e-mail']
        compatibility_vector, skill_matches = calculate_compatibility_vector(graph_file, student, requirements)

        score = score_candidate(compatibility_vector, weights, weights)

        scored.append({
            'email': email,
            'name': name,
            'score': score,
            'compatibility_vector': compatibility_vector,
            'matches': skill_matches,
            'raw': student
        })

    scored.sort(key=lambda x: x['score'], reverse=True)

    team = []
    covered = set()

    for s in scored:
        team.append(s)
        for match in s['matches']:
            if match['normalized_weight'] >= [r[list(r.keys())[0]] for r in requirements if list(r.keys())[0] == match['requirement']][0]:
                covered.add(match['requirement'])

        if len(team) >= kmin and all(req in covered for req in required_terms):
            break

    if len(team) < kmin or not all(req in covered for req in required_terms):
        print("\n[❌] Не удалось построить начальную команду, удовлетворяющую всем ограничениям.")
    else:
        print(f"\n[✅] Команда успешно сформирована!")
        print(f"Выбрано кандидатов: {len(team)}")
        for i, member in enumerate(team, 1):
            print(f"  {i}. {member['name']}, score = {member['score']:.4f}")

        print("\nПокрытие требований:")
        for req in required_terms:
            met = any(
                match['requirement'] == req and match['normalized_weight'] >= [r[list(r.keys())[0]] for r in requirements if list(r.keys())[0] == req][0]
                for s in team for match in s['matches']
            )
            print(f"  {req}: {'Покрыто' if met else 'Не покрыто'}")

        # Сохраняем результат
        output = {
            "team": [
                {
                    "name": s['name'],
                    "email": s['email'],
                    "score": s['score'],
                    "skills": s['raw']['skills']
                } for s in team
            ],
            "covered_requirements": list(covered)
        }
        with open("final_team.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print("\n📄 Результаты сохранены в файл final_team.json")


if __name__ == "__main__":
    try:
        graph_file = "graph_weights.json"
        input_file = "input_data.json"
        assign_team(graph_file, input_file)

    except FileNotFoundError as e:
        print(f"Ошибка: Файл не найден - {e}")
    except json.JSONDecodeError:
        print("Ошибка: Неверный формат JSON файла")
    except Exception as e:
        print(f"Произошла ошибка: {e}")
