import json
import re
from django.core.management.base import BaseCommand
from api.models import Student

class Command(BaseCommand):
    help = "Автоматически заполнить год поступления для студентов из folder_to_students.json"

    def handle(self, *args, **kwargs):
        with open("outers/folder_to_students.json", encoding="utf-8") as f:
            folder_map = json.load(f)   

        fio_to_year = {}
        for key, students in folder_map.items():
        # Поиск года поступления по всей строке, не только в начале 
            m = re.search(r"(\d{4}) год поступления", key)
            if not m:
                continue
            year = int(m.group(1))
            for fio in students:
                fio_to_year[fio.lower()] = year

        cnt = 0
        for student in Student.objects.all():
            fio = student.name.lower()
            if fio in fio_to_year:
                student.admission_year = fio_to_year[fio]
                student.save()
                cnt += 1
            else:
                print(f"Студент {fio} не найден в folder_to_students.json")

        self.stdout.write(self.style.SUCCESS(
            f"Обновлено студентов: {cnt}"
        ))
