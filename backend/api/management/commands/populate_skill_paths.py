from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Skill, SkillPath
from api.formater.path_finder import find_min_path
import os


class Command(BaseCommand):
    help = 'Предварительно заполняет кэш путей между всеми навыками'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пересчитать все пути, даже если они уже существуют',
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Ограничить количество навыков для обработки (для тестирования)',
        )

    def handle(self, *args, **options):
        graph_file = os.path.join(os.path.dirname(__file__), "..", "..", "formater", "graph_weights.json")
        
        if not os.path.exists(graph_file):
            self.stdout.write(
                self.style.ERROR(f'Файл графа {graph_file} не найден!')
            )
            return

        skills = Skill.objects.all()
        if options['limit']:
            skills = skills[:options['limit']]

        total_skills = skills.count()
        total_paths = total_skills * total_skills
        processed_paths = 0
        new_paths = 0
        existing_paths = 0

        self.stdout.write(
            self.style.SUCCESS(f'Начинаем заполнение кэша путей для {total_skills} навыков...')
        )

        with transaction.atomic():
            for i, from_skill in enumerate(skills, 1):
                self.stdout.write(f'Обработка навыка {i}/{total_skills}: {from_skill.name}')
                
                for j, to_skill in enumerate(skills, 1):
                    processed_paths += 1
                    
                    # Пропускаем путь к самому себе
                    if from_skill == to_skill:
                        continue
                    
                    # Проверяем, существует ли уже путь
                    if not options['force'] and SkillPath.objects.filter(
                        from_skill=from_skill, 
                        to_skill=to_skill
                    ).exists():
                        existing_paths += 1
                        continue
                    
                    try:
                        # Вычисляем путь
                        from_graph_name = from_skill.graph_representation or from_skill.name.lower().replace(' ', '-')
                        to_graph_name = to_skill.graph_representation or to_skill.name.lower().replace(' ', '-')
                        
                        distance, path = find_min_path(graph_file, from_graph_name, to_graph_name)
                        
                        # Сохраняем или обновляем путь
                        skill_path, created = SkillPath.objects.update_or_create(
                            from_skill=from_skill,
                            to_skill=to_skill,
                            defaults={
                                'distance': distance,
                                'path': path
                            }
                        )
                        
                        if created:
                            new_paths += 1
                        else:
                            existing_paths += 1
                            
                        if processed_paths % 100 == 0:
                            self.stdout.write(f'  Обработано путей: {processed_paths}/{total_paths}')
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Ошибка при обработке пути {from_skill.name} -> {to_skill.name}: {e}')
                        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Заполнение кэша завершено!\n'
                f'Всего путей: {total_paths}\n'
                f'Обработано: {processed_paths}\n'
                f'Новых путей: {new_paths}\n'
                f'Существующих путей: {existing_paths}'
            )
        ) 