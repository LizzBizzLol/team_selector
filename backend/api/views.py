from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.db import transaction
from rest_framework.pagination import PageNumberPagination

class NoPagination(PageNumberPagination):
    page_size = None        # отключаем limit/offset

from .models import (
    Curator,
    Student,
    StudentSkill,
    Skill,
    Project,
    ProjectSkill,
    Team,
)
from .serializers import (
    CuratorSerializer,
    StudentSerializer,
    StudentSkillSerializer,
    SkillSerializer,
    ProjectSerializer,
    ProjectSkillSerializer,
    TeamSerializer,
    VirtualTeamSerializer,
)
from .matching import match_team


class CuratorViewSet(viewsets.ModelViewSet):
    queryset = Curator.objects.all()
    serializer_class = CuratorSerializer
    pagination_class = NoPagination   # ✨

    def get_queryset(self):
        qs = super().get_queryset().annotate(projects_count=Count("curated_projects"))
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))
        return qs.order_by("name")
    
class StudentViewSet(viewsets.ModelViewSet):
    """
    CRUD для студентов.
    """
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            search_terms = search.split()
            query = Q()
            for term in search_terms:
                query |= Q(name__icontains=term) | Q(email__icontains=term)
            qs = qs.filter(query)
        return qs.order_by("name")

class StudentSkillViewSet(viewsets.ModelViewSet):
    """
    CRUD для навыков студентов.
    """
    queryset = StudentSkill.objects.all()
    serializer_class = StudentSkillSerializer


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer

    def get_queryset(self):
        qs = super().get_queryset().annotate(
            students_count=Count('studentskill', distinct=True)
        )
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("name")
    

class ProjectSkillViewSet(viewsets.ModelViewSet):
    """
    CRUD для связки Проект–Навык (ProjectSkill).
    """
    queryset = ProjectSkill.objects.all()
    serializer_class = ProjectSkillSerializer


class TeamViewSet(viewsets.ModelViewSet):
    """
    CRUD для команд, полученных через match.
    """
    queryset = Team.objects.all().prefetch_related(
        "students__skills__skill", "project"
    )
    serializer_class = TeamSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        proj_id = self.request.query_params.get("project")
        if proj_id:
            qs = qs.filter(project_id=proj_id)
        ordering = self.request.query_params.get("ordering")
        if ordering == "-created_at":
            qs = qs.order_by("-created_at")
        return qs


class ProjectViewSet(viewsets.ModelViewSet):
    """
    CRUD для проектов и экшены:
    - add_requirement/remove_requirement
    - match
    """
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        # Сохраняем проект с curator из validated_data
        serializer.save()

    @action(detail=True, methods=["post"])
    def add_requirement(self, request, pk=None):
        project = self.get_object()
        skill_id = request.data.get("skill")
        level = request.data.get("level")

        if not (skill_id and level):
            return Response(
                {"detail": "Параметры skill и level обязательны"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        link, created = ProjectSkill.objects.get_or_create(
            project=project, skill_id=skill_id,
            defaults={"level": level}
        )
        if not created:
            link.level = level
            link.save()

        return Response({"status": "added"}, status=status.HTTP_201_CREATED)
    
    
    @action(detail=True, methods=["post"])
    def remove_requirement(self, request, pk=None):
        """
        Принимает:
        • ps_id      – id строки ProjectSkill
        • ps_ids     – список таких id
        • skill_id   – id навыка
        • "*"        – удалить все требования
        """
        project = self.get_object()

        # ----- по id строки -----
        ps_id  = request.data.get("ps_id")
        ps_ids = request.data.get("ps_ids")
        if ps_id or ps_ids:
            ids = [ps_id] if ps_id else ps_ids
            ProjectSkill.objects.filter(id__in=ids, project=project).delete()
            return Response({"status": "removed"})

        # ----- по skill_id или "*" -----
        skill_id = request.data.get("skill_id")
        if skill_id == "*":
            ProjectSkill.objects.filter(project=project).delete()
            return Response({"status": "removed"})
        if skill_id:
            ProjectSkill.objects.filter(project=project, skill_id=skill_id).delete()
            return Response({"status": "removed"})

        return Response(
            {"detail": "нужен ps_id / ps_ids / skill_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=["put"])
    def sync_requirements(self, request, pk=None):
        """
        Полностью заменяет требования проекта.
        body: { "requirements": [ { "skill": 12, "level": 4 }, … ] }
        """
        project = self.get_object()
        items   = request.data.get("requirements", [])

        if not isinstance(items, list):
            return Response({"detail": "requirements должен быть списком"},
                            status=status.HTTP_400_BAD_REQUEST)

        incoming = {int(it["skill"]): max(1, min(int(it.get("level", 1)), 5))
            for it in items
            if it.get("skill")}

        with transaction.atomic():
            # a) обновляем / удаляем существующие
            for link in project.skill_links.select_related("skill"):
                if link.skill_id in incoming:
                    new_lvl = incoming.pop(link.skill_id)
                    if link.level != new_lvl:
                        link.level = new_lvl
                        link.save(update_fields=["level"])
                else:
                    link.delete()          # в UI нет → убрать

            # b) создаём недостающие
            ProjectSkill.objects.bulk_create([
                ProjectSkill(project=project,
                             skill_id=s_id,
                             level   =lvl)
                for s_id, lvl in incoming.items()
            ])
            # ► итоговая проверка: нельзя оставить проект без требований
            if not project.skill_links.exists():
                return Response(
                    {"detail": "Хотя бы одно требование обязательно"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not items:
                return Response(
                    {"detail": "Нужно хотя бы одно требование"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response({"status": "synced"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def match(self, request, pk=None):
        project = self.get_object()
        external_students = request.data.get("external_students")
        
        if external_students:
            # Используем внешний список студентов
            students_data = external_students
        else:
            # Используем студентов из БД
            students_data = None
            
        team = match_team(project, students_data)
        if not team:
            return Response(
                {"detail": "Не удалось подобрать команду"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(TeamSerializer(team).data)

    @action(detail=True, methods=["post"])
    def match_with_file(self, request, pk=None):
        """
        Формирование команды из внешнего файла со студентами.
        Принимает JSON файл со структурой:
        {
            "students": [
                {
                    "name": "Иванов Иван",
                    "email": "ivanov@example.com",
                    "skills": [
                        {"skill_name": "Python", "level": 0.8},
                        {"skill_name": "SQL", "level": 0.6}
                    ]
                }
            ]
        }
        """
        try:
            project = self.get_object()
            students_data = request.data.get("students", [])
            
            if not students_data:
                return Response(
                    {"detail": "Файл не содержит данных о студентах"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Проверяем структуру данных
            for student in students_data:
                if not isinstance(student, dict):
                    return Response(
                        {"detail": "Неверный формат данных студента"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                if not all(k in student for k in ["name", "email", "skills"]):
                    return Response(
                        {"detail": "У студента отсутствуют обязательные поля: name, email, skills"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                if not isinstance(student["skills"], list):
                    return Response(
                        {"detail": "Поле skills должно быть списком"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                for skill in student["skills"]:
                    if not isinstance(skill, dict) or not all(k in skill for k in ["skill_name", "level"]):
                        return Response(
                            {"detail": "Неверный формат навыка"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    
                    try:
                        level = float(skill["level"])
                        if level < 0 or level > 1:
                            return Response(
                                {"detail": "Уровень навыка должен быть от 0 до 1"},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                    except (ValueError, TypeError):
                        return Response(
                            {"detail": "Уровень навыка должен быть числом"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            
            team = match_team(project, students_data)
            if not team:
                min_n = getattr(project, 'min_participants', 1)
                max_n = getattr(project, 'max_participants', len(students_data))
                return Response(
                    {"detail": f"Не удалось подобрать команду: недостаточно подходящих кандидатов (требуется от {min_n} до {max_n})"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Если команда виртуальная (dict), сериализуем через VirtualTeamSerializer
            if isinstance(team, dict):
                return Response(VirtualTeamSerializer(team).data)
            return Response(TeamSerializer(team).data)
            
        except Exception as e:
            return Response(
                {"detail": f"Произошла ошибка при формировании команды: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"])
    def import_project(self, request):
        """
        Импорт проекта из JSON вида:
        {
          "title": "...",
          "curator": { "name": "Имя Куратора" },
          "min_participants": 2,
          "max_participants": 5,
          "requirements": [
            { "skill": "Audio Processing", "level": 5 },
            …
          ]
        }
        """
        data = request.data
        title = data.get("title")
        # Ищем куратора по имени (игнорируем регистр)
        curator = None
        cur_info = data.get("curator") or {}
        if cur_info.get("name"):
            curator = Curator.objects.filter(
                name__iexact=cur_info["name"]).first()

        # Валидируем min/max
        from .models import Student
        total_students = Student.objects.count() or 1
        min_p = int(data.get("min_participants", 1))
        max_p = int(data.get("max_participants", total_students))
        min_p = max(1, min(min_p, total_students))
        max_p = max(1, min(max_p, total_students))
        if min_p > max_p:
            max_p = min_p

        # Создаём проект
        project = Project.objects.create(
            title=title,
            curator=curator,
            min_participants=min_p,
            max_participants=max_p,
        )

        # Обрабатываем требования
        for item in data.get("requirements", []):
            name = item.get("skill") or item.get("skill_name")
            level = int(item.get("level", 1))
            level = max(1, min(5, level))
            skill = Skill.objects.filter(name__iexact=name).first()
            if skill:
                ProjectSkill.objects.create(
                    project=project, skill=skill, level=level
                )

        serializer = self.get_serializer(project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)