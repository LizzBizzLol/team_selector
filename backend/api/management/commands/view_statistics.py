from django.core.management.base import BaseCommand
import json
import os
from datetime import datetime


class Command(BaseCommand):
    help = 'Просмотр сохраненной статистики анализа команд'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            help='ID проекта для фильтрации',
        )
        parser.add_argument(
            '--latest',
            action='store_true',
            help='Показать только последний анализ',
        )
        parser.add_argument(
            '--summary',
            action='store_true',
            help='Показать только краткую сводку',
        )

    def handle(self, *args, **options):
        stats_dir = "statistics"
        
        if not os.path.exists(stats_dir):
            self.stdout.write(
                self.style.ERROR(f'Директория {stats_dir} не найдена. Статистика еще не создавалась.')
            )
            return
        
        # Получаем все файлы статистики
        stats_files = [f for f in os.listdir(stats_dir) if f.endswith('.json')]
        
        if not stats_files:
            self.stdout.write(
                self.style.ERROR(f'В директории {stats_dir} нет файлов статистики.')
            )
            return
        
        # Фильтруем по проекту если указан
        if options['project_id']:
            stats_files = [f for f in stats_files if f'team_analysis_{options["project_id"]}_' in f]
            if not stats_files:
                self.stdout.write(
                    self.style.ERROR(f'Статистика для проекта {options["project_id"]} не найдена.')
                )
                return
        
        # Сортируем по времени создания (новые сначала)
        stats_files.sort(reverse=True)
        
        # Берем только последний если указан флаг
        if options['latest']:
            stats_files = stats_files[:1]
        
        self.stdout.write(f"📊 Найдено {len(stats_files)} файлов статистики\n")
        
        for i, filename in enumerate(stats_files, 1):
            filepath = os.path.join(stats_dir, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Извлекаем информацию из имени файла
                parts = filename.replace('.json', '').split('_')
                project_id = parts[2]
                timestamp = '_'.join(parts[3:])
                
                self.stdout.write(f"\n{'='*60}")
                self.stdout.write(f"📄 Файл {i}: {filename}")
                self.stdout.write(f"📅 Время анализа: {timestamp}")
                self.stdout.write(f"{'='*60}")
                
                if options['summary']:
                    self._show_summary(data)
                else:
                    self._show_full_statistics(data)
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при чтении файла {filename}: {e}')
                )
    
    def _show_summary(self, data):
        """Показывает краткую сводку"""
        project = data['project_info']
        team = data['team_results']
        analysis = data['analysis_summary']
        
        self.stdout.write(f"\n📋 КРАТКАЯ СВОДКА:")
        self.stdout.write(f"  Проект: {project['title']} (ID: {project['id']})")
        self.stdout.write(f"  Куратор: {project['curator'] or 'Не назначен'}")
        self.stdout.write(f"  Требования: {', '.join(project['requirements'])}")
        self.stdout.write(f"  Проанализировано студентов: {analysis['total_students_analyzed']}")
        self.stdout.write(f"  Размер команды: {team['size']} (мин: {team['min_required']}, макс: {team['max_allowed']})")
        self.stdout.write(f"  Покрытие требований: {team['requirements_covered']}/{team['total_requirements']} ({team['coverage_percentage']}%)")
        self.stdout.write(f"  Статус: {'✅ Успешно' if team['all_requirements_covered'] else '⚠️ Частично'}")
        
        if data['selected_team']:
            self.stdout.write(f"  Выбранные студенты:")
            for student in data['selected_team']:
                self.stdout.write(f"    • {student['name']} (оценка: {student['score']})")
    
    def _show_full_statistics(self, data):
        """Показывает полную статистику"""
        project = data['project_info']
        team = data['team_results']
        analysis = data['analysis_summary']
        coverage = data['requirement_coverage']
        scores = data['score_distribution']
        top_students = data['top_students']
        
        self.stdout.write(f"\n📋 ПРОЕКТ:")
        self.stdout.write(f"  Название: {project['title']}")
        self.stdout.write(f"  ID: {project['id']}")
        self.stdout.write(f"  Куратор: {project['curator'] or 'Не назначен'}")
        self.stdout.write(f"  Участников: {project['min_participants']}-{project['max_participants']}")
        self.stdout.write(f"  Требования: {', '.join(project['requirements'])}")
        
        self.stdout.write(f"\n📊 АНАЛИЗ:")
        self.stdout.write(f"  Студентов проанализировано: {analysis['total_students_analyzed']}")
        self.stdout.write(f"  Требований: {analysis['total_requirements']}")
        self.stdout.write(f"  Путей в кэше: {analysis['cache_paths_used']}")
        self.stdout.write(f"  Время анализа: {analysis['analysis_timestamp']}")
        
        self.stdout.write(f"\n🏆 РЕЗУЛЬТАТЫ КОМАНДЫ:")
        self.stdout.write(f"  Размер команды: {team['size']}")
        self.stdout.write(f"  Покрыто требований: {team['requirements_covered']}/{team['total_requirements']}")
        self.stdout.write(f"  Процент покрытия: {team['coverage_percentage']}%")
        self.stdout.write(f"  Все требования покрыты: {'Да' if team['all_requirements_covered'] else 'Нет'}")
        self.stdout.write(f"  Минимум участников достигнут: {'Да' if team['min_participants_met'] else 'Нет'}")
        
        self.stdout.write(f"\n🎯 ПОКРЫТИЕ ТРЕБОВАНИЙ:")
        for req, info in coverage.items():
            status = "✅" if info['covered_in_team'] else "❌"
            self.stdout.write(f"  {status} {req}: {info['count']} студентов ({info['percentage']}%)")
            if info['example_students']:
                self.stdout.write(f"    Примеры: {', '.join(info['example_students'])}")
        
        self.stdout.write(f"\n📈 РАСПРЕДЕЛЕНИЕ ОЦЕНОК:")
        for range_name, info in scores.items():
            self.stdout.write(f"  {info['range']}: {info['count']} студентов ({info['percentage']}%)")
        
        self.stdout.write(f"\n🏅 ТОП-10 СТУДЕНТОВ:")
        for student in top_students:
            team_marker = "👥" if student['in_team'] else "  "
            self.stdout.write(f"  {team_marker} {student['rank']}. {student['name']}: {student['score']}")
        
        if data['selected_team']:
            self.stdout.write(f"\n👥 ВЫБРАННАЯ КОМАНДА:")
            for i, student in enumerate(data['selected_team'], 1):
                self.stdout.write(f"  {i}. {student['name']} (оценка: {student['score']})") 