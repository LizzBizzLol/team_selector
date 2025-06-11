import json
import os
from django.core.management.base import BaseCommand
from api.models import Skill


class Command(BaseCommand):
    help = 'Обновляет графовые представления навыков на основе файла final_ontology_entities.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='final_ontology_entities.json',
            help='Путь к файлу с графовыми представлениями навыков'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        
        # Если указан относительный путь, ищем файл в директории api
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.path.dirname(__file__), '..', '..', file_path)
        
        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'Файл {file_path} не найден')
            )
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Ошибка чтения JSON файла: {e}')
            )
            return
        
        graph_entities = set(data.get('classes', []))
        self.stdout.write(f'Загружено {len(graph_entities)} графовых представлений')
        
        # Получаем все навыки из базы данных
        skills = Skill.objects.all()
        updated_count = 0
        not_found_count = 0
        used_graph_names = set()
        
        for skill in skills:
            # Ищем точное совпадение в графовых представлениях
            if skill.name in graph_entities:
                graph_name = skill.name
                # Проверяем уникальность
                if graph_name in used_graph_names:
                    graph_name = f"{skill.name}-{skill.id}"
                
                skill.graph_representation = graph_name
                skill.save()
                used_graph_names.add(graph_name)
                updated_count += 1
                self.stdout.write(f'✓ Обновлен: {skill.name} -> {graph_name}')
            else:
                # Пытаемся найти похожее представление
                # Преобразуем название навыка в формат графа
                graph_name = skill.name.lower().replace(' ', '-').replace('_', '-')
                
                if graph_name in graph_entities:
                    # Проверяем уникальность
                    if graph_name in used_graph_names:
                        graph_name = f"{graph_name}-{skill.id}"
                    
                    skill.graph_representation = graph_name
                    skill.save()
                    used_graph_names.add(graph_name)
                    updated_count += 1
                    self.stdout.write(f'✓ Обновлен: {skill.name} -> {graph_name}')
                else:
                    # Ищем частичные совпадения
                    found_match = False
                    for graph_entity in graph_entities:
                        if (skill.name.lower() in graph_entity.lower() or 
                            graph_entity.lower() in skill.name.lower()):
                            
                            # Проверяем уникальность
                            final_graph_name = graph_entity
                            if final_graph_name in used_graph_names:
                                final_graph_name = f"{graph_entity}-{skill.id}"
                            
                            skill.graph_representation = final_graph_name
                            skill.save()
                            used_graph_names.add(final_graph_name)
                            updated_count += 1
                            found_match = True
                            self.stdout.write(f'✓ Найдено частичное совпадение: {skill.name} -> {final_graph_name}')
                            break
                    
                    if not found_match:
                        not_found_count += 1
                        self.stdout.write(
                            self.style.WARNING(f'⚠ Не найдено представление для: {skill.name}')
                        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nОбновление завершено!\n'
                f'Обновлено навыков: {updated_count}\n'
                f'Не найдено представлений: {not_found_count}\n'
                f'Всего навыков в БД: {skills.count()}'
            )
        ) 