#!/usr/bin/env python
"""
Тестовый скрипт для проверки нового алгоритма подбора команд
"""
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

from api.models import Project, Student, Skill, StudentSkill, ProjectSkill
from api.matching import match_team

def test_matching_algorithm():
    """Тестирует новый алгоритм подбора команд"""
    print("=== Тестирование нового алгоритма подбора команд ===\n")
    
    # Получаем первый проект с требованиями
    project = Project.objects.filter(skill_links__isnull=False).first()
    
    if not project:
        print("❌ Нет проектов с требованиями для тестирования")
        return
    
    print(f"📋 Тестируем проект: {project.title}")
    print(f"   Минимум участников: {project.min_participants}")
    print(f"   Максимум участников: {project.max_participants}")
    
    # Показываем требования проекта
    requirements = project.skill_links.all()
    print(f"   Требования:")
    for req in requirements:
        print(f"     - {req.skill.name} (уровень: {req.level})")
    
    print(f"\n👥 Всего студентов в системе: {Student.objects.count()}")
    
    # Запускаем алгоритм подбора
    print(f"\n🚀 Запуск алгоритма подбора...")
    try:
        selected_student_ids = match_team(project)
        
        if not selected_student_ids:
            print("❌ Алгоритм не выбрал ни одного студента")
            return
        
        print(f"\n✅ Алгоритм выбрал {len(selected_student_ids)} студентов:")
        
        # Получаем информацию о выбранных студентах
        selected_students = Student.objects.filter(id__in=selected_student_ids)
        
        for i, student in enumerate(selected_students, 1):
            print(f"   {i}. {student.name} ({student.email})")
            
            # Показываем навыки студента
            skills = student.skills.all()
            if skills:
                skill_list = ", ".join([f"{ss.skill.name} ({ss.level})" for ss in skills])
                print(f"      Навыки: {skill_list}")
            else:
                print(f"      Навыки: нет")
        
        print(f"\n🎯 Результат: успешно подобрана команда из {len(selected_student_ids)} студентов")
        
    except Exception as e:
        print(f"❌ Ошибка при выполнении алгоритма: {e}")
        import traceback
        traceback.print_exc()

def test_simple_scenario():
    """Тестирует простой сценарий с минимальными данными"""
    print("\n=== Тестирование простого сценария ===\n")
    
    # Создаем простой проект для тестирования
    from api.models import Curator
    
    # Получаем или создаем куратора
    curator, created = Curator.objects.get_or_create(
        name="Тестовый Куратор",
        defaults={"email": "test@example.com"}
    )
    
    # Создаем тестовый проект
    project, created = Project.objects.get_or_create(
        title="Тестовый проект для алгоритма",
        defaults={
            "curator": curator,
            "min_participants": 1,
            "max_participants": 3
        }
    )
    
    # Получаем несколько навыков
    skills = Skill.objects.all()[:3]
    if len(skills) < 3:
        print("❌ Недостаточно навыков для тестирования")
        return
    
    # Добавляем требования к проекту
    for i, skill in enumerate(skills):
        ProjectSkill.objects.get_or_create(
            project=project,
            skill=skill,
            defaults={"level": 0.5 + i * 0.1}
        )
    
    print(f"📋 Создан тестовый проект: {project.title}")
    print(f"   Требования:")
    for req in project.skill_links.all():
        print(f"     - {req.skill.name} (уровень: {req.level})")
    
    # Запускаем алгоритм
    print(f"\n🚀 Запуск алгоритма...")
    try:
        selected_student_ids = match_team(project)
        print(f"✅ Результат: выбрано {len(selected_student_ids)} студентов")
        
        if selected_student_ids:
            students = Student.objects.filter(id__in=selected_student_ids)
            for i, student in enumerate(students, 1):
                print(f"   {i}. {student.name}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Тестируем основной алгоритм
    test_matching_algorithm()
    
    # Тестируем простой сценарий
    test_simple_scenario() 