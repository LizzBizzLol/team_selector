import csv
import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_core.settings")
django.setup()

from api.models import Student, Skill, StudentSkill

with open("outers/output.csv", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        student_name = row["student"]
        skill_name = row["skill"]
        level = float(row["level"])
        year = int(row["year"]) if row["year"] else None

        try:
            student = Student.objects.get(name=student_name)
        except Student.DoesNotExist:
            print(f"Не найден студент: {student_name}")
            continue
        try:
            skill = Skill.objects.get(name=skill_name)
        except Skill.DoesNotExist:
            print(f"Не найден навык: {skill_name}")
            continue

        # Обновляем или создаём запись
        obj, created = StudentSkill.objects.update_or_create(
            student=student, skill=skill, defaults={"level": level, "year": year}
        )
        print("OK:", student_name, skill_name, level, year)
