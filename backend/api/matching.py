from .models import Student, StudentSkill, ProjectSkill, SkillPath
from .formater.path_finder import find_min_path
import os
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Для работы без GUI
import numpy as np
from datetime import datetime
import json

MAX_PATH_WEIGHT = 26.3452  # Максимальный вес пути в графе

# Кэш в памяти для текущей сессии
_session_path_cache = {}


def _get_cached_path(from_skill, to_skill, graph_file):
    """
    Получает путь из кэша в памяти или из БД
    """
    cache_key = (from_skill.id, to_skill.id)
    
    # Проверяем кэш в памяти
    if cache_key in _session_path_cache:
        return _session_path_cache[cache_key]
    
    # Проверяем БД
    try:
        cached_path = SkillPath.objects.get(from_skill=from_skill, to_skill=to_skill)
        distance, path = cached_path.distance, cached_path.path
    except SkillPath.DoesNotExist:
        # Вычисляем путь
        from_graph_name = from_skill.graph_representation or from_skill.name.lower().replace(' ', '-')
        to_graph_name = to_skill.graph_representation or to_skill.name.lower().replace(' ', '-')
        
        distance, path = find_min_path(graph_file, from_graph_name, to_graph_name)
        
        # Сохраняем в БД
        SkillPath.objects.create(
            from_skill=from_skill,
            to_skill=to_skill,
            distance=distance,
            path=path
        )
    
    # Сохраняем в кэш памяти
    _session_path_cache[cache_key] = (distance, path)
    return distance, path


def clear_session_cache():
    """
    Очищает кэш в памяти (вызывать между разными проектами)
    """
    global _session_path_cache
    _session_path_cache.clear()


def find_closest_skill(graph_file: str, student_skills, requirement_skill):
    """
    Находит ближайший навык студента к требуемому навыку проекта
    Адаптированная версия из team_selector.py с использованием кэша путей
    """
    req_skill_name = requirement_skill.skill.name
    required_threshold = requirement_skill.level
    min_normalized_weight = 0
    closest_skill = None
    best_path = None
    best_distance = float('inf')
    best_level = 0
    
    for student_skill in student_skills:
        skill_name = student_skill.skill.name
        level = student_skill.level

        # Проверяем точное совпадение
        if skill_name == req_skill_name:
            sim = level
            print(f"[MATCH] {skill_name} == {req_skill_name} -> sim = {sim:.4f} (прямое совпадение)")
            return skill_name, sim, [skill_name]

        # Ищем через граф с использованием кэша
        try:
            # Используем кэш в памяти и БД
            distance, path = _get_cached_path(
                student_skill.skill, 
                requirement_skill.skill, 
                graph_file
            )
            
            if distance == float('inf'):
                continue

            sim = level * (1 - distance / MAX_PATH_WEIGHT)
            print(f"[CHECK] {skill_name} -> {req_skill_name} | путь: {path}, dist = {distance:.4f}, lvl = {level:.2f}, sim = {sim:.4f}")
            
            if sim > min_normalized_weight:
                min_normalized_weight = sim
                closest_skill = skill_name
                best_path = path
                best_distance = distance
                best_level = level

        except Exception as e:
            print(f"[ERROR] Ошибка при обработке {skill_name} -> {req_skill_name}: {e}")
            continue

    if closest_skill:
        print(f"[SELECTED] {closest_skill} покрывает {req_skill_name} | sim = {min_normalized_weight:.4f}, путь: {best_path}")
    else:
        print(f"[FAIL] Нет подходящего навыка для {req_skill_name}")

    return closest_skill, min_normalized_weight, best_path


def calculate_compatibility_vector(graph_file: str, student: Student, requirements):
    """
    Вычисляет вектор совместимости студента с требованиями проекта
    Адаптированная версия из team_selector.py
    """
    student_skills = student.skills.all()
    compatibility_vector = []
    skill_matches = []

    for req in requirements:
        req_skill_name = req.skill.name
        closest_skill, normalized_weight, path = find_closest_skill(graph_file, student_skills, req)

        compatibility_vector.append(normalized_weight)
        skill_matches.append({
            'requirement': req_skill_name,
            'matched_skill': closest_skill,
            'normalized_weight': normalized_weight,
            'path': path
        })

    return compatibility_vector, skill_matches


def score_candidate(compatibility_vector: list, weights: list, thresholds: list) -> float:
    """
    Вычисляет итоговую оценку кандидата с учетом порогов
    Из team_selector.py
    """
    score = 0.0
    for v, w, threshold in zip(compatibility_vector, weights, thresholds):
        if v >= threshold:
            score += w * v
    return round(score, 4)


def match_team(project):
    """
    Основная функция подбора команды для проекта
    Адаптированная версия из team_selector.py
    """
    print(f"Запуск подбора команды для проекта: {project.title} (ID: {project.id})")
    
    # Очищаем кэш в памяти для новой сессии
    clear_session_cache()
    
    # Получаем требования проекта
    requirements = project.skill_links.all()
    
    if not requirements.exists():
        print(f"У проекта {project.title} нет требований к навыкам")
        return []

    print(f"Требования проекта: {[f'{req.skill.name} (уровень {req.level})' for req in requirements]}")

    # Путь к файлу с графом навыков
    graph_file = os.path.join(os.path.dirname(__file__), "formater", "graph_weights.json")
    
    # Проверяем существование файла графа
    if not os.path.exists(graph_file):
        print(f"Файл графа {graph_file} не найден, используем простой алгоритм")
        return _simple_match_team(project)

    print(f"Используем продвинутый алгоритм с графом: {graph_file}")

    # Веса и пороги навыков (уровни требований)
    weights = [req.level for req in requirements]
    thresholds = [req.level for req in requirements]
    required_terms = [req.skill.name for req in requirements]

    # Вычисляем совместимость для всех студентов
    scored = []
    students = Student.objects.all()
    total_students = students.count()
    print(f"Обработка {total_students} студентов")
    
    # Статистика покрытия требований
    requirement_coverage = {req: {'count': 0, 'students': []} for req in required_terms}
    
    print("\n--- Анализ кандидатов ---")
    for student in students:
        compatibility_vector, skill_matches = calculate_compatibility_vector(graph_file, student, requirements)
        score = score_candidate(compatibility_vector, weights, thresholds)
        
        # Анализируем покрытие требований этим студентом
        for i, match in enumerate(skill_matches):
            req_name = match['requirement']
            if match['normalized_weight'] >= thresholds[i]:
                requirement_coverage[req_name]['count'] += 1
                requirement_coverage[req_name]['students'].append(student.name)
        
        scored.append({
            'student_id': student.id,
            'student': student,
            'score': score,
            'compatibility_vector': compatibility_vector,
            'matches': skill_matches
        })
        
        print(f"Студент {student.name}: оценка {score:.4f}")

    # Сортируем по убыванию оценки
    scored.sort(key=lambda x: x['score'], reverse=True)

    # Пытаемся найти оптимальную команду
    best_team = []
    best_coverage = set()
    best_team_size = 0
    
    # Перебираем все возможные размеры команд от min_participants до max_participants
    for team_size in range(project.min_participants, min(project.max_participants + 1, len(scored) + 1)):
        current_team = []
        current_coverage = set()
        
        # Берем первых team_size студентов
        for i in range(team_size):
            if i < len(scored):
                student_data = scored[i]
                current_team.append(student_data['student_id'])
                
                # Проверяем покрытие требований этим студентом
                for match in student_data['matches']:
                    if match['normalized_weight'] >= thresholds[required_terms.index(match['requirement'])]:
                        current_coverage.add(match['requirement'])
        
        # Если эта команда покрывает больше требований или имеет лучший размер, обновляем лучшую команду
        if (len(current_coverage) > len(best_coverage) or 
            (len(current_coverage) == len(best_coverage) and team_size < best_team_size)):
            best_team = current_team.copy()
            best_coverage = current_coverage.copy()
            best_team_size = team_size

    # Проверяем, удалось ли покрыть все требования
    all_requirements_covered = all(req in best_coverage for req in required_terms)
    min_participants_met = len(best_team) >= project.min_participants
    
    # Статистика использования кэша
    cache_stats = f"Кэш путей: {len(_session_path_cache)} путей в памяти"
    print(f"\n{cache_stats}")
    
    # Выводим подробную статистику
    print("\n" + "="*60)
    print("📊 ПОДРОБНАЯ СТАТИСТИКА АНАЛИЗА")
    print("="*60)
    
    print(f"\n📈 Общая статистика:")
    print(f"  • Всего студентов проанализировано: {total_students}")
    print(f"  • Требований к проекту: {len(required_terms)}")
    print(f"  • Размер лучшей команды: {len(best_team)}")
    print(f"  • Требований покрыто: {len(best_coverage)} из {len(required_terms)}")
    
    print(f"\n🎯 Покрытие каждого требования:")
    for req in required_terms:
        coverage_info = requirement_coverage[req]
        percentage = (coverage_info['count'] / total_students) * 100
        status = "✅ Покрыто" if req in best_coverage else "❌ Не покрыто"
        
        print(f"  • {req}:")
        print(f"    - Студентов с навыком: {coverage_info['count']} из {total_students} ({percentage:.1f}%)")
        print(f"    - Статус в команде: {status}")
        if coverage_info['count'] > 0:
            print(f"    - Примеры студентов: {', '.join(coverage_info['students'][:3])}{'...' if len(coverage_info['students']) > 3 else ''}")
    
    print(f"\n🏆 Топ-5 студентов по оценке:")
    for i, student_data in enumerate(scored[:5], 1):
        print(f"  {i}. {student_data['student'].name}: {student_data['score']:.4f}")
    
    print(f"\n📊 Распределение оценок:")
    score_ranges = {
        'Отлично (0.8-1.0)': 0,
        'Хорошо (0.6-0.8)': 0,
        'Удовлетворительно (0.4-0.6)': 0,
        'Слабо (0.2-0.4)': 0,
        'Очень слабо (0.0-0.2)': 0
    }
    
    for student_data in scored:
        score = student_data['score']
        if score >= 0.8:
            score_ranges['Отлично (0.8-1.0)'] += 1
        elif score >= 0.6:
            score_ranges['Хорошо (0.6-0.8)'] += 1
        elif score >= 0.4:
            score_ranges['Удовлетворительно (0.4-0.6)'] += 1
        elif score >= 0.2:
            score_ranges['Слабо (0.2-0.4)'] += 1
        else:
            score_ranges['Очень слабо (0.0-0.2)'] += 1
    
    for range_name, count in score_ranges.items():
        percentage = (count / total_students) * 100
        bar = "█" * int(percentage / 2)  # Визуальная полоса
        print(f"  • {range_name}: {count} студентов ({percentage:.1f}%) {bar}")
    
    if all_requirements_covered and min_participants_met:
        print(f"\n[✅] Команда успешно сформирована!")
        print(f"Выбрано кандидатов: {len(best_team)}")
        for i, student_id in enumerate(best_team, 1):
            student_info = next(s for s in scored if s['student_id'] == student_id)
            print(f"  {i}. {student_info['student'].name}, score = {student_info['score']:.4f}")

        print("\nПокрытие требований:")
        for req in required_terms:
            met = any(
                match['requirement'] == req and match['normalized_weight'] >= thresholds[required_terms.index(req)]
                for s in scored if s['student_id'] in best_team for match in s['matches']
            )
            print(f"  {req}: {'Покрыто' if met else 'Не покрыто'}")
    else:
        print("\n[⚠️] Не удалось построить команду, полностью покрывающую все требования.")
        print(f"Лучшая найденная команда:")
        print(f"  Размер команды: {len(best_team)} (минимум: {project.min_participants})")
        print(f"  Покрыто требований: {len(best_coverage)} из {len(required_terms)}")
        
        if best_team:
            print(f"  Выбранные студенты:")
            for i, student_id in enumerate(best_team, 1):
                student_info = next(s for s in scored if s['student_id'] == student_id)
                print(f"    {i}. {student_info['student'].name}, score = {student_info['score']:.4f}")
            
            print(f"\n  Покрытие требований:")
            for req in required_terms:
                met = any(
                    match['requirement'] == req and match['normalized_weight'] >= thresholds[required_terms.index(req)]
                    for s in scored if s['student_id'] in best_team for match in s['matches']
                )
                print(f"    {req}: {'Покрыто' if met else 'Не покрыто'}")
        else:
            print("  Не удалось найти подходящих кандидатов")

    print(f"\nПодбор команды завершен. Выбрано {len(best_team)} студентов")
    
    # Создаем графики анализа
    try:
        chart_file = create_analysis_charts(project, scored, requirement_coverage, best_team, best_coverage)
        if chart_file:
            print(f"📈 Графики анализа сохранены: {chart_file}")
    except Exception as e:
        print(f"⚠️ Не удалось создать графики: {e}")
    
    # Сохраняем статистику в JSON файл
    try:
        stats_file = save_analysis_statistics(project, scored, requirement_coverage, best_team, best_coverage)
        if stats_file:
            print(f"📄 Статистика сохранена: {stats_file}")
    except Exception as e:
        print(f"⚠️ Не удалось сохранить статистику: {e}")
    
    return best_team


def _simple_match_team(project):
    """
    Простой алгоритм подбора (fallback, если файл графа недоступен)
    """
    print(f"Использование простого алгоритма подбора для проекта: {project.title}")
    
    requirements = project.skill_links.all()
    
    if not requirements.exists():
        print(f"У проекта {project.title} нет требований к навыкам")
        return []
    
    user_scores = {}
    user_skill_coverage = {}
    requirement_coverage = {req.skill.name: {'count': 0, 'students': []} for req in requirements}
    
    students = Student.objects.all()
    total_students = students.count()
    
    for student in students:
        total = 0
        covered_skills = set()
        
        for req in requirements:
            try:
                level = StudentSkill.objects.get(student=student, skill=req.skill).level
            except StudentSkill.DoesNotExist:
                level = 0
                
            if req.level:
                score = min(level / req.level, 1)
                if level >= req.level:
                    covered_skills.add(req.skill.name)
                    requirement_coverage[req.skill.name]['count'] += 1
                    requirement_coverage[req.skill.name]['students'].append(student.name)
            else:
                score = 0
            total += score
            
        user_scores[student.id] = total
        user_skill_coverage[student.id] = covered_skills
        print(f"Студент {student.name}: общий скор {total:.4f}, покрывает навыки: {covered_skills}")
    
    # Сортируем студентов по убыванию оценки
    sorted_students = sorted(user_scores.items(), key=lambda x: -x[1])
    
    # Ищем лучшую команду
    best_team = []
    best_coverage = set()
    best_team_size = 0
    
    # Перебираем все возможные размеры команд от min_participants до max_participants
    for team_size in range(project.min_participants, min(project.max_participants + 1, len(sorted_students) + 1)):
        current_team = []
        current_coverage = set()
        
        # Берем первых team_size студентов
        for i in range(team_size):
            if i < len(sorted_students):
                student_id = sorted_students[i][0]
                current_team.append(student_id)
                current_coverage.update(user_skill_coverage[student_id])
        
        # Если эта команда покрывает больше требований или имеет лучший размер, обновляем лучшую команду
        if (len(current_coverage) > len(best_coverage) or 
            (len(current_coverage) == len(best_coverage) and team_size < best_team_size)):
            best_team = current_team.copy()
            best_coverage = current_coverage.copy()
            best_team_size = team_size
    
    # Проверяем успешность
    all_requirements_covered = all(req.skill.name in best_coverage for req in requirements)
    min_participants_met = len(best_team) >= project.min_participants
    
    # Создаем структуру scored для совместимости с графиками
    scored = []
    for student_id, score in sorted_students:
        student = Student.objects.get(id=student_id)
        scored.append({
            'student_id': student_id,
            'student': student,
            'score': score,
            'compatibility_vector': [],
            'matches': []
        })
    
    # Выводим статистику
    print("\n" + "="*60)
    print("📊 ПОДРОБНАЯ СТАТИСТИКА АНАЛИЗА (ПРОСТОЙ АЛГОРИТМ)")
    print("="*60)
    
    print(f"\n📈 Общая статистика:")
    print(f"  • Всего студентов проанализировано: {total_students}")
    print(f"  • Требований к проекту: {len(requirements)}")
    print(f"  • Размер лучшей команды: {len(best_team)}")
    print(f"  • Требований покрыто: {len(best_coverage)} из {len(requirements)}")
    
    print(f"\n🎯 Покрытие каждого требования:")
    for req in requirements:
        req_name = req.skill.name
        coverage_info = requirement_coverage[req_name]
        percentage = (coverage_info['count'] / total_students) * 100
        status = "✅ Покрыто" if req_name in best_coverage else "❌ Не покрыто"
        
        print(f"  • {req_name}:")
        print(f"    - Студентов с навыком: {coverage_info['count']} из {total_students} ({percentage:.1f}%)")
        print(f"    - Статус в команде: {status}")
        if coverage_info['count'] > 0:
            print(f"    - Примеры студентов: {', '.join(coverage_info['students'][:3])}{'...' if len(coverage_info['students']) > 3 else ''}")
    
    print(f"\n🏆 Топ-5 студентов по оценке:")
    for i, student_data in enumerate(scored[:5], 1):
        print(f"  {i}. {student_data['student'].name}: {student_data['score']:.4f}")
    
    print(f"\n📊 Распределение оценок:")
    score_ranges = {
        'Отлично (0.8-1.0)': 0,
        'Хорошо (0.6-0.8)': 0,
        'Удовлетворительно (0.4-0.6)': 0,
        'Слабо (0.2-0.4)': 0,
        'Очень слабо (0.0-0.2)': 0
    }
    
    for student_data in scored:
        score = student_data['score']
        if score >= 0.8:
            score_ranges['Отлично (0.8-1.0)'] += 1
        elif score >= 0.6:
            score_ranges['Хорошо (0.6-0.8)'] += 1
        elif score >= 0.4:
            score_ranges['Удовлетворительно (0.4-0.6)'] += 1
        elif score >= 0.2:
            score_ranges['Слабо (0.2-0.4)'] += 1
        else:
            score_ranges['Очень слабо (0.0-0.2)'] += 1
    
    for range_name, count in score_ranges.items():
        percentage = (count / total_students) * 100
        bar = "█" * int(percentage / 2)  # Визуальная полоса
        print(f"  • {range_name}: {count} студентов ({percentage:.1f}%) {bar}")
    
    if all_requirements_covered and min_participants_met:
        print(f"\n[✅] Команда успешно сформирована (простой алгоритм)!")
        print(f"Выбрано кандидатов: {len(best_team)}")
        for i, student_id in enumerate(best_team, 1):
            student = Student.objects.get(id=student_id)
            print(f"  {i}. {student.name}, score = {user_scores[student_id]:.4f}")
    else:
        print("\n[⚠️] Не удалось построить команду, полностью покрывающую все требования (простой алгоритм).")
        print(f"Лучшая найденная команда:")
        print(f"  Размер команды: {len(best_team)} (минимум: {project.min_participants})")
        print(f"  Покрыто требований: {len(best_coverage)} из {len(requirements)}")
        
        if best_team:
            print(f"  Выбранные студенты:")
            for i, student_id in enumerate(best_team, 1):
                student = Student.objects.get(id=student_id)
                print(f"    {i}. {student.name}, score = {user_scores[student_id]:.4f}")
            
            print(f"\n  Покрытие требований:")
            for req in requirements:
                print(f"    {req.skill.name}: {'Покрыто' if req.skill.name in best_coverage else 'Не покрыто'}")
        else:
            print("  Не удалось найти подходящих кандидатов")
    
    # Создаем графики анализа
    try:
        chart_file = create_analysis_charts(project, scored, requirement_coverage, best_team, best_coverage)
        if chart_file:
            print(f"📈 Графики анализа сохранены: {chart_file}")
    except Exception as e:
        print(f"⚠️ Не удалось создать графики: {e}")
    
    # Сохраняем статистику в JSON файл
    try:
        stats_file = save_analysis_statistics(project, scored, requirement_coverage, best_team, best_coverage)
        if stats_file:
            print(f"📄 Статистика сохранена: {stats_file}")
    except Exception as e:
        print(f"⚠️ Не удалось сохранить статистику: {e}")
    
    print(f"Простой алгоритм: выбрано {len(best_team)} студентов")
    return best_team


def create_analysis_charts(project, scored, requirement_coverage, best_team, best_coverage, output_dir="charts"):
    """
    Создает графики для анализа результатов подбора команды
    """
    try:
        # Создаем директорию для графиков
        os.makedirs(output_dir, exist_ok=True)
        
        # Настройка стиля графиков
        plt.style.use('default')
        plt.rcParams['font.size'] = 10
        plt.rcParams['figure.figsize'] = (15, 10)
        
        # Создаем фигуру с несколькими графиками
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle(f'Анализ подбора команды для проекта: {project.title}', fontsize=16, fontweight='bold')
        
        # 1. График покрытия требований
        requirements = list(requirement_coverage.keys())
        coverage_counts = [requirement_coverage[req]['count'] for req in requirements]
        total_students = len(scored)
        coverage_percentages = [(count / total_students) * 100 for count in coverage_counts]
        
        bars1 = ax1.bar(requirements, coverage_percentages, color=['#2E8B57' if req in best_coverage else '#CD5C5C' for req in requirements])
        ax1.set_title('Покрытие требований студентами', fontweight='bold')
        ax1.set_ylabel('Процент студентов (%)')
        ax1.set_xlabel('Требования')
        ax1.tick_params(axis='x', rotation=45)
        
        # Добавляем значения на столбцы
        for bar, percentage in zip(bars1, coverage_percentages):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height + 1,
                    f'{percentage:.1f}%', ha='center', va='bottom', fontweight='bold')
        
        # 2. Распределение оценок студентов
        scores = [student_data['score'] for student_data in scored]
        score_ranges = {
            'Отлично\n(0.8-1.0)': 0,
            'Хорошо\n(0.6-0.8)': 0,
            'Удовлетворительно\n(0.4-0.6)': 0,
            'Слабо\n(0.2-0.4)': 0,
            'Очень слабо\n(0.0-0.2)': 0
        }
        
        for score in scores:
            if score >= 0.8:
                score_ranges['Отлично\n(0.8-1.0)'] += 1
            elif score >= 0.6:
                score_ranges['Хорошо\n(0.6-0.8)'] += 1
            elif score >= 0.4:
                score_ranges['Удовлетворительно\n(0.4-0.6)'] += 1
            elif score >= 0.2:
                score_ranges['Слабо\n(0.2-0.4)'] += 1
            else:
                score_ranges['Очень слабо\n(0.0-0.2)'] += 1
        
        colors = ['#2E8B57', '#3CB371', '#FFD700', '#FFA500', '#CD5C5C']
        bars2 = ax2.bar(score_ranges.keys(), score_ranges.values(), color=colors)
        ax2.set_title('Распределение оценок студентов', fontweight='bold')
        ax2.set_ylabel('Количество студентов')
        ax2.set_xlabel('Диапазон оценок')
        
        # Добавляем значения на столбцы
        for bar, count in zip(bars2, score_ranges.values()):
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                    str(count), ha='center', va='bottom', fontweight='bold')
        
        # 3. Топ-10 студентов по оценке
        top_students = scored[:10]
        student_names = [s['student'].name[:20] + '...' if len(s['student'].name) > 20 else s['student'].name for s in top_students]
        student_scores = [s['score'] for s in top_students]
        
        # Цвета для студентов в команде
        colors = ['#2E8B57' if s['student_id'] in best_team else '#4682B4' for s in top_students]
        
        bars3 = ax3.barh(student_names, student_scores, color=colors)
        ax3.set_title('Топ-10 студентов по оценке', fontweight='bold')
        ax3.set_xlabel('Оценка')
        ax3.set_ylabel('Студенты')
        
        # Добавляем значения на столбцы
        for bar, score in zip(bars3, student_scores):
            width = bar.get_width()
            ax3.text(width + 0.01, bar.get_y() + bar.get_height()/2.,
                    f'{score:.3f}', ha='left', va='center', fontweight='bold')
        
        # 4. Круговая диаграмма покрытия требований
        covered_count = len(best_coverage)
        uncovered_count = len(requirements) - covered_count
        
        labels = ['Покрыто', 'Не покрыто']
        sizes = [covered_count, uncovered_count]
        colors_pie = ['#2E8B57', '#CD5C5C']
        
        wedges, texts, autotexts = ax4.pie(sizes, labels=labels, colors=colors_pie, autopct='%1.1f%%', startangle=90)
        ax4.set_title('Общее покрытие требований', fontweight='bold')
        
        # Делаем текст жирным
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
        
        plt.tight_layout()
        
        # Сохраняем график
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{output_dir}/team_analysis_{project.id}_{timestamp}.png"
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"\n📊 Графики сохранены в файл: {filename}")
        return filename
        
    except Exception as e:
        print(f"❌ Ошибка при создании графиков: {e}")
        return None 


def save_analysis_statistics(project, scored, requirement_coverage, best_team, best_coverage, output_dir="statistics"):
    """
    Сохраняет подробную статистику анализа в JSON файл
    """
    try:
        # Создаем директорию для статистики
        os.makedirs(output_dir, exist_ok=True)
        
        # Собираем данные для сохранения
        total_students = len(scored)
        requirements = list(requirement_coverage.keys())
        
        # Статистика покрытия требований
        coverage_stats = {}
        for req in requirements:
            coverage_info = requirement_coverage[req]
            percentage = (coverage_info['count'] / total_students) * 100
            coverage_stats[req] = {
                'count': coverage_info['count'],
                'percentage': round(percentage, 2),
                'total_students': total_students,
                'covered_in_team': req in best_coverage,
                'example_students': coverage_info['students'][:5]  # Первые 5 студентов
            }
        
        # Распределение оценок
        score_ranges = {
            'excellent': {'range': '0.8-1.0', 'count': 0, 'percentage': 0},
            'good': {'range': '0.6-0.8', 'count': 0, 'percentage': 0},
            'satisfactory': {'range': '0.4-0.6', 'count': 0, 'percentage': 0},
            'weak': {'range': '0.2-0.4', 'count': 0, 'percentage': 0},
            'very_weak': {'range': '0.0-0.2', 'count': 0, 'percentage': 0}
        }
        
        for student_data in scored:
            score = student_data['score']
            if score >= 0.8:
                score_ranges['excellent']['count'] += 1
            elif score >= 0.6:
                score_ranges['good']['count'] += 1
            elif score >= 0.4:
                score_ranges['satisfactory']['count'] += 1
            elif score >= 0.2:
                score_ranges['weak']['count'] += 1
            else:
                score_ranges['very_weak']['count'] += 1
        
        # Вычисляем проценты
        for range_info in score_ranges.values():
            range_info['percentage'] = round((range_info['count'] / total_students) * 100, 2)
        
        # Топ студентов
        top_students = []
        for i, student_data in enumerate(scored[:10], 1):
            top_students.append({
                'rank': i,
                'name': student_data['student'].name,
                'score': round(student_data['score'], 4),
                'in_team': student_data['student_id'] in best_team
            })
        
        # Информация о команде
        team_info = {
            'size': len(best_team),
            'min_required': project.min_participants,
            'max_allowed': project.max_participants,
            'requirements_covered': len(best_coverage),
            'total_requirements': len(requirements),
            'coverage_percentage': round((len(best_coverage) / len(requirements)) * 100, 2),
            'all_requirements_covered': all(req in best_coverage for req in requirements),
            'min_participants_met': len(best_team) >= project.min_participants
        }
        
        # Создаем полную структуру данных
        analysis_data = {
            'project_info': {
                'id': project.id,
                'title': project.title,
                'curator': project.curator.name if project.curator else None,
                'min_participants': project.min_participants,
                'max_participants': project.max_participants,
                'requirements': [req.skill.name for req in project.skill_links.all()]
            },
            'analysis_summary': {
                'total_students_analyzed': total_students,
                'total_requirements': len(requirements),
                'analysis_timestamp': datetime.now().isoformat(),
                'cache_paths_used': len(_session_path_cache)
            },
            'team_results': team_info,
            'requirement_coverage': coverage_stats,
            'score_distribution': score_ranges,
            'top_students': top_students,
            'selected_team': [
                {
                    'name': next(s['student'].name for s in scored if s['student_id'] == student_id),
                    'score': round(next(s['score'] for s in scored if s['student_id'] == student_id), 4)
                }
                for student_id in best_team
            ]
        }
        
        # Сохраняем в файл
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{output_dir}/team_analysis_{project.id}_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, ensure_ascii=False, indent=2)
        
        print(f"📄 Статистика сохранена в файл: {filename}")
        return filename
        
    except Exception as e:
        print(f"❌ Ошибка при сохранении статистики: {e}")
        return None 