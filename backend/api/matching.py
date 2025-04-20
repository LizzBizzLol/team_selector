from .models import User, UserSkill

def match_team(project):
    requirements = project.requirements.all()

    # Собираем оценки пользователей по требованиям
    user_scores = {}
    for user in User.objects.all():
        total = 0
        for req in requirements:
            # получаем уровень владения у пользователя по требуемому навыку
            try:
                level = UserSkill.objects.get(user=user, skill=req.skill).level
            except UserSkill.DoesNotExist:
                level = 0
            # считаем вклад: отношение уровня пользователя к требуемому уровню
            if req.level_required:
                score = min(level / req.level_required, 1)
            else:
                score = 0
            total += score
        user_scores[user.id] = total

    # Выбираем топ-N пользователей (N = число требований)
    top_n = len(requirements)
    selected = sorted(user_scores.items(), key=lambda x: -x[1])[:top_n]
    user_ids = [uid for uid, _ in selected]

    return user_ids
