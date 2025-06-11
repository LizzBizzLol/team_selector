from .models import Student, StudentSkill, ProjectSkill
from .formater.path_finder import find_min_path
import os
import logging

# Настройка логирования
logger = logging.getLogger(__name__)

MAX_PATH_WEIGHT = 26.3452  # Максимальный вес пути в графе


def find_closest_skill(graph_file: str, student_skills, requirement_skill):
    """
    Находит ближайший навык студента к требуемому навыку проекта
    """
    min_normalized_weight = 0
    closest_skill = None
    best_path = None
    
    # Получаем графовое представление требуемого навыка
    req_graph_name = requirement_skill.skill.graph_representation or requirement_skill.skill.name.lower().replace(' ', '-')
    
    logger.debug(f"Поиск ближайшего навыка для требования: {requirement_skill.skill.name} (граф: {req_graph_name})")

    # Проверяем точное совпадение
    for student_skill in student_skills:
        student_graph_name = student_skill.skill.graph_representation or student_skill.skill.name.lower().replace(' ', '-')
        if student_graph_name == req_graph_name:
            logger.debug(f"Найдено точное совпадение: {student_skill.skill.name} -> {req_graph_name}")
            return student_skill.skill.name, 1.0, [req_graph_name]

    # Ищем ближайший навык через граф
    for student_skill in student_skills:
        student_graph_name = student_skill.skill.graph_representation or student_skill.skill.name.lower().replace(' ', '-')
        try:
            distance, path = find_min_path(graph_file, student_graph_name, req_graph_name)
            normalized_weight = 1 - (distance / MAX_PATH_WEIGHT)
            logger.debug(f"Путь от {student_skill.skill.name} ({student_graph_name}) до {req_graph_name}: расстояние={distance}, вес={normalized_weight:.4f}")
            
            if normalized_weight > min_normalized_weight:
                min_normalized_weight = normalized_weight
                closest_skill = student_skill.skill.name
                best_path = path
                logger.debug(f"Новый лучший навык: {closest_skill} с весом {normalized_weight:.4f}")
        except Exception as e:
            logger.warning(f"Ошибка при поиске пути от {student_skill.skill.name} до {req_graph_name}: {e}")
            continue

    if closest_skill:
        logger.debug(f"Выбран ближайший навык: {closest_skill} с весом {min_normalized_weight:.4f}")
    else:
        logger.warning(f"Не найден подходящий навык для требования: {requirement_skill.skill.name}")

    return closest_skill, min_normalized_weight, best_path


def calculate_compatibility_vector(graph_file: str, student: Student, requirements):
    """
    Вычисляет вектор совместимости студента с требованиями проекта
    """
    student_skills = student.skills.all()
    compatibility_vector = []
    skill_matches = []

    logger.info(f"Вычисление совместимости для студента: {student.name} (ID: {student.id})")
    logger.debug(f"Навыки студента: {[ss.skill.name for ss in student_skills]}")

    for req in requirements:
        req_skill_name = req.skill.name
        logger.debug(f"Обработка требования: {req_skill_name} (уровень: {req.level})")
        
        closest_skill, normalized_weight, path = find_closest_skill(graph_file, student_skills, req)

        # Нормализуем вес с учетом уровня навыка студента
        if closest_skill:
            try:
                student_skill_level = StudentSkill.objects.get(student=student, skill__name=closest_skill).level
                # Учитываем уровень навыка студента
                adjusted_weight = normalized_weight * min(student_skill_level / req.level, 1.0) if req.level > 0 else 0
                logger.debug(f"Уровень навыка студента {closest_skill}: {student_skill_level}, скорректированный вес: {adjusted_weight:.4f}")
            except StudentSkill.DoesNotExist:
                adjusted_weight = 0
                logger.warning(f"Навык {closest_skill} не найден у студента {student.name}")
        else:
            adjusted_weight = 0
            logger.warning(f"Не найден подходящий навык для требования {req_skill_name} у студента {student.name}")

        compatibility_vector.append(adjusted_weight)
        skill_matches.append({
            'requirement': req_skill_name,
            'matched_skill': closest_skill,
            'normalized_weight': normalized_weight,
            'adjusted_weight': adjusted_weight,
            'path': path
        })

    logger.info(f"Вектор совместимости для {student.name}: {compatibility_vector}")
    return compatibility_vector, skill_matches


def compute_compatibility_scores(compatibility_data, skill_weights):
    """
    Вычисляет итоговые оценки совместимости с учетом весов навыков
    """
    result = {}
    logger.info(f"Вычисление итоговых оценок для {len(compatibility_data)} студентов")
    
    for student_id, entry in compatibility_data.items():
        vector = entry["compatibility_vector"]
        if len(vector) != len(skill_weights):
            raise ValueError(f"Vector length mismatch for student {student_id}")
        weighted_score = sum(v * w for v, w in zip(vector, skill_weights))
        result[student_id] = {
            "student": entry["student"],
            "score": round(weighted_score, 4),
            "skill_matches": entry["skill_matches"]
        }
        logger.debug(f"Студент {entry['student'].name}: итоговая оценка {weighted_score:.4f}")
    
    return result


def match_team(project):
    """
    Основная функция подбора команды для проекта
    """
    logger.info(f"Запуск подбора команды для проекта: {project.title} (ID: {project.id})")
    
    # Получаем требования проекта
    requirements = project.skill_links.all()
    
    if not requirements.exists():
        logger.warning(f"У проекта {project.title} нет требований к навыкам")
        return []

    logger.info(f"Требования проекта: {[f'{req.skill.name} (уровень {req.level})' for req in requirements]}")

    # Путь к файлу с графом навыков
    graph_file = os.path.join(os.path.dirname(__file__), "formater", "graph_weights.json")
    
    # Проверяем существование файла графа
    if not os.path.exists(graph_file):
        logger.warning(f"Файл графа {graph_file} не найден, используем простой алгоритм")
        # Если файл графа не найден, используем простой алгоритм
        return _simple_match_team(project)

    logger.info(f"Используем продвинутый алгоритм с графом: {graph_file}")

    # Веса навыков (уровни требований)
    skill_weights = [req.level for req in requirements]
    logger.debug(f"Веса навыков: {skill_weights}")

    # Вычисляем совместимость для всех студентов
    compatibility_data = {}
    students = Student.objects.all()
    logger.info(f"Обработка {students.count()} студентов")
    
    for student in students:
        compatibility_vector, skill_matches = calculate_compatibility_vector(graph_file, student, requirements)
        compatibility_data[student.id] = {
            "student": student,
            "compatibility_vector": compatibility_vector,
            "skill_matches": skill_matches
        }

    # Вычисляем итоговые оценки
    scored_students = compute_compatibility_scores(compatibility_data, skill_weights)

    # Сортируем по убыванию оценки и выбираем топ студентов
    sorted_students = sorted(scored_students.items(), key=lambda x: x[1]['score'], reverse=True)
    
    # Определяем количество студентов для выбора
    target_count = min(project.max_participants, len(sorted_students))
    
    logger.info(f"Выбираем топ {target_count} студентов из {len(sorted_students)}")
    
    # Выбираем топ студентов
    selected_students = []
    for i, (student_id, info) in enumerate(sorted_students[:target_count]):
        selected_students.append(student_id)
        logger.info(f"{i+1}. {info['student'].name} - оценка: {info['score']}")
        
        # Логируем детали совпадений навыков
        for match in info['skill_matches']:
            logger.debug(f"  {match['requirement']} -> {match['matched_skill']} (вес: {match['adjusted_weight']:.4f})")

    logger.info(f"Подбор команды завершен. Выбрано {len(selected_students)} студентов")
    return selected_students


def _simple_match_team(project):
    """
    Простой алгоритм подбора (fallback, если файл графа недоступен)
    """
    logger.info(f"Использование простого алгоритма подбора для проекта: {project.title}")
    
    requirements = project.skill_links.all()
    
    user_scores = {}
    for student in Student.objects.all():
        total = 0
        for req in requirements:
            try:
                level = StudentSkill.objects.get(student=student, skill=req.skill).level
            except StudentSkill.DoesNotExist:
                level = 0
            if req.level:
                score = min(level / req.level, 1)
            else:
                score = 0
            total += score
        user_scores[student.id] = total
        logger.debug(f"Студент {student.name}: общий скор {total:.4f}")
    
    top_n = min(project.max_participants, len(requirements))
    scored = sorted(user_scores.items(), key=lambda x: -x[1])[:top_n]
    user_ids = [uid for uid, _ in scored]
    
    logger.info(f"Простой алгоритм: выбрано {len(user_ids)} студентов")
    return user_ids
