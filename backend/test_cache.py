#!/usr/bin/env python
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

from api.models import Project, SkillPath
from api.matching import match_team, clear_session_cache

def test_caching():
    print("=== Тест системы кэширования путей ===\n")
    
    # Получаем первый проект для тестирования
    try:
        project = Project.objects.first()
        if not project:
            print("❌ Нет проектов в базе данных")
            return
        
        print(f"Тестируем проект: {project.title}")
        print(f"Требования: {[f'{req.skill.name} (уровень {req.level})' for req in project.skill_links.all()]}")
        
        # Первый запуск - должен создать пути в БД
        print("\n--- Первый запуск (создание кэша) ---")
        team1 = match_team(project)
        print(f"Результат: {len(team1)} студентов")
        
        # Проверяем, сколько путей создалось в БД
        db_paths = SkillPath.objects.count()
        print(f"Путей в БД: {db_paths}")
        
        # Второй запуск - должен использовать кэш
        print("\n--- Второй запуск (использование кэша) ---")
        team2 = match_team(project)
        print(f"Результат: {len(team2)} студентов")
        
        # Проверяем, что количество путей в БД не изменилось
        db_paths_after = SkillPath.objects.count()
        print(f"Путей в БД после второго запуска: {db_paths_after}")
        
        if db_paths == db_paths_after:
            print("✅ Кэширование работает корректно - новые пути не создавались")
        else:
            print("❌ Проблема с кэшированием - создались новые пути")
            
        # Тестируем очистку кэша
        print("\n--- Тест очистки кэша ---")
        clear_session_cache()
        print("Кэш в памяти очищен")
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_caching() 