from .models import Student, StudentSkill

def match_team(project):
    # берём требования из связки ProjectSkill → related_name="skill_links"
    requirements = project.skill_links.all()

    # Собираем оценки пользователей по требованиям
    user_scores = {}
    for student in Student.objects.all():
        total = 0
        for req in requirements:
            # получаем уровень владения у пользователя по требуемому навыку
            try:
                level = StudentSkill.objects.get(student=student, skill=req.skill).level
            except StudentSkill.DoesNotExist:
                level = 0
            # считаем вклад: отношение уровня пользователя к требуемому уровню (req.level)
            if req.level:
                score = min(level / req.level, 1)
            else:
                score = 0
            total += score
        user_scores[student.id] = total
    # Выбираем топ-N пользователей (N = число требований)
    top_n = len(requirements)
    scored = sorted(user_scores.items(), key=lambda x: -x[1])[:top_n]
    user_ids = [uid for uid, _ in scored]
    return user_ids
