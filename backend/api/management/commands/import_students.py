# api/management/commands/import_students.py
import csv, json
from django.core.management.base import BaseCommand
from api.models import Student, Skill, StudentSkill

class Command(BaseCommand):
    help = "Импорт студентов из CSV. Формат: name,email,skills_json"

    def add_arguments(self, parser):
        parser.add_argument("file", help="CSV-файл")

    def handle(self, *args, file, **kw):
        with open(file, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                stu, _ = Student.objects.get_or_create(
                    name=row["name"].strip(),
                    email=row["email"].strip()
                )
                skills = json.loads(row["skills"])
                for sk in skills:                      # [{"name":"Python","level":3}, …]
                    skill, _ = Skill.objects.get_or_create(name=sk["name"].strip())
                    StudentSkill.objects.update_or_create(
                        student=stu, skill=skill,
                        defaults={"level": sk.get("level", 1)}
                    )
        self.stdout.write(self.style.SUCCESS("Импорт завершён"))
