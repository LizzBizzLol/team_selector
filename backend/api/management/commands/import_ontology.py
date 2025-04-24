import json
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Skill
from pathlib import Path

class Command(BaseCommand):
    help = "Импорт навыков из ontology_entities.json"

    def handle(self, *args, **options):
        path = Path(settings.BASE_DIR) / "ontology_entities.json"
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Файл не найден: {path}"))
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        count = 0
        for raw_name in data["classes"]:
            name = raw_name.replace("_", " ")
            obj, created = Skill.objects.get_or_create(name=name)
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(
            f"Импортировано {count} новых навыков. Всего в БД: {Skill.objects.count()}"
        ))
