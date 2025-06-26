#!/usr/bin/env python
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

from api.models import Student, Project, Team, StudentSkill, Skill, ProjectSkill
from api.serializers import TeamStudentDetailSerializer

def test_heatmap_serializer():
    """Тестирует новый сериализатор для тепловой карты"""
    print("Тестирование сериализатора тепловой карты...")
    
    # Получаем первый проект с требованиями
    try:
        project = Project.objects.filter(skill_links__isnull=False).first()
        if not project:
            print("Нет проектов с требованиями")
            return
        
        print(f"Тестируем проект: {project.title}")
        print(f"Требования: {[(req.skill.name, req.level) for req in project.skill_links.all()]}")
        
        # Получаем первую команду для этого проекта
        team = Team.objects.filter(project=project).first()
        if not team:
            print("Нет команд для этого проекта")
            return
        
        print(f"Команда: {team.id}")
        print(f"Студенты: {[s.name for s in team.students.all()]}")
        
        # Тестируем сериализатор
        for student in team.students.all():
            print(f"\n--- Студент: {student.name} ---")
            
            # Получаем навыки студента
            student_skills = student.skills.all()
            print(f"Навыки студента: {[(ss.skill.name, ss.level) for ss in student_skills]}")
            
            # Сериализуем с новым алгоритмом
            serializer = TeamStudentDetailSerializer(
                student, 
                context={"project": project}
            )
            data = serializer.data
            
            print(f"Итоговая оценка: {data['score']}")
            print("Детали по навыкам:")
            for skill_data in data['skills']:
                print(f"  {skill_data['skill_name']}: sim = {skill_data['score']:.4f}, "
                      f"matched = {skill_data['matched_skill_name']}, "
                      f"student_level = {skill_data['student_level']:.2f}, "
                      f"required = {skill_data['required_level']:.2f}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_heatmap_serializer() 