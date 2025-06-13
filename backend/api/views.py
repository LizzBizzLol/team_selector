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
)
from .matching import match_team


class CuratorViewSet(viewsets.ModelViewSet):
    queryset = Curator.objects.all()
    serializer_class = CuratorSerializer
    page_size = 30  # ✨ пагинация по 30 кураторов

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
    page_size = 30  # ✨ пагинация по 30 студентов

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("name")

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Получить общее количество студентов"""
        total_count = Student.objects.count()
        return Response({'count': total_count})

class StudentSkillViewSet(viewsets.ModelViewSet):
    """
    CRUD для навыков студентов.
    """
    queryset = StudentSkill.objects.all()
    serializer_class = StudentSkillSerializer


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    page_size = 30  # ✨ пагинация по 30 навыков

    def get_queryset(self):
        qs = super().get_queryset().annotate(
            students_count=Count('studentskill', distinct=True)
        )
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("name")

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Получить список студентов, владеющих данным навыком"""
        skill = self.get_object()
        students = Student.objects.filter(skills__skill=skill).distinct()
        
        # Добавляем уровень навыка для каждого студента
        students_with_levels = []
        for student in students:
            try:
                student_skill = StudentSkill.objects.get(student=student, skill=skill)
                level = student_skill.level
            except StudentSkill.DoesNotExist:
                level = 0
            
            students_with_levels.append({
                'id': student.id,
                'name': student.name,
                'email': student.email,
                'skill_level': level
            })
        
        return Response(students_with_levels)
    

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
    pagination_class = NoPagination   # ✨ отключаем пагинацию
    
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
    page_size = 30  # ✨ пагинация по 30 проектов
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
        """
        Подбирает команду под проект (greedy-score в matching.py),
        создаёт объект Team и возвращает его в виде
        { id, project, students: [ {id, name, email, …}, … ], created_at }.
        """
        project = self.get_object()

        if not project.skill_links.exists():
            return Response(
                {"detail": "У проекта нет требований – подбирать нечего"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_ids = match_team(project)          # <-- algorithm

        if not user_ids:
            return Response(
                {"detail": "Ни один студент не подошёл"},
                status=status.HTTP_200_OK
            )

        # ──────────────────────────────────────────────────────────────
        # 1. проверяем, есть ли уже команда с тем же составом
        # ──────────────────────────────────────────────────────────────
        same_size = Team.objects.filter(project=project
                       ).annotate(n=Count("students")
                       ).filter(n=len(user_ids))

        for t in same_size.prefetch_related("students"):
            if set(t.students.values_list("id", flat=True)) == set(user_ids):
                # нашли дубликат → возвращаем существующую
                return Response(TeamSerializer(t).data, status=status.HTTP_200_OK)

        # ──────────────────────────────────────────────────────────────
        # 2. иначе создаём новую
        # ──────────────────────────────────────────────────────────────
        team = Team.objects.create(project=project)
        team.students.set(user_ids)

        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)
        
    
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