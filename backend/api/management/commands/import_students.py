import json
from django.core.management.base import BaseCommand
from api.models import Student
from pathlib import Path

class Command(BaseCommand):
    help = "Импорт студентов из students_db.json"

    def handle(self, *args, **options):
        path = Path("/Users/Admin/Desktop/team_selector/students_db.json")  # путь к твоему json
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Файл не найден: {path}"))
            return

        students = json.loads(path.read_text(encoding="utf-8"))
        count_new, count_old = 0, 0
        for s in students:
            obj, created = Student.objects.get_or_create(
                name=s['fio'],
                defaults={"email": s['email']}
            )
            if not created:
                count_old += 1
            else:
                count_new += 1

        self.stdout.write(self.style.SUCCESS(
            f"Импортировано новых студентов: {count_new}, уже существовали: {count_old}"
        ))
