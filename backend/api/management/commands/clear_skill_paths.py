from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import SkillPath


class Command(BaseCommand):
    help = 'Очищает кэш путей между навыками'

    def add_arguments(self, parser):
        parser.add_argument(
            '--older-than',
            type=int,
            help='Удалить пути старше указанного количества дней',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Подтвердить удаление без запроса подтверждения',
        )

    def handle(self, *args, **options):
        if options['older_than']:
            from django.utils import timezone
            from datetime import timedelta
            
            cutoff_date = timezone.now() - timedelta(days=options['older_than'])
            paths_to_delete = SkillPath.objects.filter(updated_at__lt=cutoff_date)
            message = f'Удалить пути старше {options["older_than"]} дней ({paths_to_delete.count()} путей)?'
        else:
            paths_to_delete = SkillPath.objects.all()
            message = f'Удалить все пути между навыками ({paths_to_delete.count()} путей)?'

        if not options['confirm']:
            confirm = input(f'{message} [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write('Операция отменена.')
                return

        with transaction.atomic():
            deleted_count = paths_to_delete.count()
            paths_to_delete.delete()

        self.stdout.write(
            self.style.SUCCESS(f'Удалено {deleted_count} путей из кэша.')
        ) 