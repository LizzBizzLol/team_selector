from .models import Student, StudentSkill, Team

def match_team(project, external_students=None):
    # берём требования из связки ProjectSkill → related_name="skill_links"
    requirements = project.skill_links.all()
    
    if not requirements.exists():
        return None

    # Собираем оценки пользователей по требованиям
    user_scores = {}
    
    if external_students:
        # Виртуальная команда, не сохраняем в БД
        virtual_team = {
            "project": project.id,
            "students": [],
        }
        for student_data in external_students:
            matched_skills = []
            student_skills = {skill["skill_name"]: skill["level"] for skill in student_data["skills"]}
            for req in requirements:
                skill_level = student_skills.get(req.skill.name, 0)
                normalized_level = int(skill_level * 5) if skill_level <= 1 else skill_level
                if req.level:
                    score = min(normalized_level / req.level, 1)
                    matched_skills.append({
                        "skill_id": req.skill.id,
                        "skill_name": req.skill.name,
                        "student_level": normalized_level,
                        "required_level": req.level,
                        "score": round(score, 2)
                    })
                else:
                    matched_skills.append({
                        "skill_id": req.skill.id,
                        "skill_name": req.skill.name,
                        "student_level": normalized_level,
                        "required_level": req.level,
                        "score": 0.00
                    })
            # итоговый score — среднее по matched_skills
            if matched_skills:
                avg_score = round(sum(s["score"] for s in matched_skills) / len(matched_skills), 2)
            else:
                avg_score = 0.00
            user_scores[student_data["email"]] = {
                "score": avg_score,
                "name": student_data["name"],
                "email": student_data["email"],
                "matched_skills": matched_skills
            }
        # Выбираем топ-N
        scored = sorted(user_scores.values(), key=lambda x: -x["score"])
        min_n = getattr(project, 'min_participants', 1)
        max_n = getattr(project, 'max_participants', len(scored))
        if len(scored) < min_n:
            return None
        virtual_team["students"] = scored[:max_n]
        return virtual_team
    else:
        # Обработка студентов из БД
        for student in Student.objects.all():
            total = 0
            matched_skills = []
            for req in requirements:
                try:
                    level = StudentSkill.objects.get(student=student, skill=req.skill).level
                    # Нормализуем уровень из 0-1 в 1-5
                    normalized_level = int(level * 5) if level <= 1 else level
                except StudentSkill.DoesNotExist:
                    level = 0
                    normalized_level = 0
                
                if req.level:
                    score = min(normalized_level / req.level, 1)
                    matched_skills.append({
                        "skill_id": req.skill.id,
                        "skill_name": req.skill.name,
                        "student_level": normalized_level,
                        "required_level": req.level,
                        "score": round(score, 2)
                    })
                else:
                    score = 0
                total += score
            user_scores[student.id] = {
                "score": total,
                "matched_skills": matched_skills
            }
        top_n = min(len(requirements), project.max_participants)
        scored = sorted(user_scores.items(), key=lambda x: -x[1]["score"])
        min_n = getattr(project, 'min_participants', 1)
        max_n = getattr(project, 'max_participants', len(scored))
        if len(scored) < min_n:
            return None
        scored = scored[:max_n]
        team = Team.objects.create(project=project)
        for student_id, student_data in scored:
            student = Student.objects.get(id=student_id)
            team.students.add(student)
            student.matched_skills = student_data["matched_skills"]
        return team
