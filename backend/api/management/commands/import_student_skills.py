import csv
from django.core.management.base import BaseCommand
from api.models import Student, Skill, StudentSkill
from pathlib import Path

class Command(BaseCommand):
    help = "Импортирует навыки студентов из output.csv"

    def handle(self, *args, **options):
        path = Path("/Users/Admin/Desktop/team_selector/output.csv")  # путь к файлу, который ты сформировала
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Файл не найден: {path}"))
            return

        count_created = 0
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                fio = row["student"].strip()
                skill_name = row["skill"].replace("_", " ").strip()
                try:
                    student = Student.objects.get(name=fio)
                    skill = Skill.objects.get(name=skill_name)
                except Student.DoesNotExist:
                    self.stderr.write(self.style.WARNING(f"Нет такого студента: {fio}"))
                    continue
                except Skill.DoesNotExist:
                    self.stderr.write(self.style.WARNING(f"Нет такого навыка: {skill_name}"))
                    continue

                level = min(int(row["count"]), 5)
                # Создаём или обновляем уровень
                obj, created = StudentSkill.objects.update_or_create(
                    student=student, skill=skill,
                    defaults={"level": level}
                )
                if created:
                    count_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Импортировано или обновлено {count_created} связей студент-навык"
        ))
