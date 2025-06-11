import requests
import json

# Базовый URL API
BASE_URL = "http://localhost:8000/api"

def test_match_with_file():
    # 1. Получаем список проектов
    response = requests.get(f"{BASE_URL}/projects/")
    print("Получение списка проектов:", response.status_code)
    projects = response.json()
    projects_list = projects["results"]
    
    if not projects_list:
        print("Нет доступных проектов")
        return
    
    print("\nДоступные проекты:")
    for i, project in enumerate(projects_list, 1):
        print(f"{i}. {project.get('title', 'Без названия')}")
    
    project_num = int(input("\nВведите номер проекта для тестирования: ")) - 1
    if project_num < 0 or project_num >= len(projects_list):
        print("Неверный номер проекта")
        return
    
    project = projects_list[project_num]
    print(f"\nВыбран проект: {project.get('title', 'Без названия')}")
    
    # 2. Загружаем тестовых студентов
    with open("outers/test_students.json", "r", encoding="utf-8") as f:
        students_data = json.load(f)
    
    # 3. Формируем команду из внешних студентов
    response = requests.post(
        f"{BASE_URL}/projects/{project['id']}/match_with_file/",
        json=students_data
    )
    print("\nФормирование команды:", response.status_code)
    if response.status_code == 200:
        team = response.json()
        print("\nСформированная команда:")
        print(json.dumps(team, indent=2, ensure_ascii=False))
    else:
        print("Ошибка:", response.text)

if __name__ == "__main__":
    test_match_with_file() 