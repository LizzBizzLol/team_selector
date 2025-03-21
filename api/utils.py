def form_team_stub(students, task_requirements, team_size):
    """
    Заглушка для формирования команды.
    Возвращает первых team_size студентов из входного списка,
    добавляя им фиксированное значение match_score (например, 0).
    """
    dummy_team = []
    for i, student in enumerate(students):
        # Добавляем поле match_score, фиксированное значение заглушки
        student["match_score"] = 0  
        if i < team_size:
            dummy_team.append(student)
    return dummy_team