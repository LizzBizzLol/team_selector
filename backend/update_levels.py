#!/usr/bin/env python
"""
Скрипт для обновления значений level в ProjectSkill
Переводит значения из диапазона 1-5 в диапазон 0-1
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

from api.models import ProjectSkill

def update_project_skill_levels():
    """Обновляет все значения level в ProjectSkill, деля их на 5"""
    
    # Получаем все записи ProjectSkill
    project_skills = ProjectSkill.objects.all()
    
    print(f"Найдено {project_skills.count()} записей ProjectSkill")
    
    updated_count = 0
    for ps in project_skills:
        old_level = ps.level
        # Делим на 5, но не меньше 0 и не больше 1
        new_level = max(0, min(1, old_level / 5.0))
        
        if old_level != new_level:
            print(f"Обновляем ID {ps.id}: {old_level} -> {new_level:.2f}")
            ps.level = new_level
            ps.save(update_fields=['level'])
            updated_count += 1
        else:
            print(f"ID {ps.id}: {old_level} (без изменений)")
    
    print(f"\nОбновлено записей: {updated_count}")
    
    # Проверяем результат
    print("\nПроверка результата:")
    for ps in ProjectSkill.objects.all():
        print(f"ID {ps.id}: {ps.level:.2f}")

if __name__ == "__main__":
    print("Начинаем обновление значений level в ProjectSkill...")
    update_project_skill_levels()
    print("Обновление завершено!") 