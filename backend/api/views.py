from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q


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
    """
    CRUD для кураторов.
    Поиск по имени или email без учёта регистра.
    """
    queryset = Curator.objects.all()
    serializer_class = CuratorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search)
            )
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
            qs = qs.filter(name__icontains=search)
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
        qs = super().get_queryset()
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
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


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
        project = self.get_object()
        skill_id = request.data.get("skill_id")
        if skill_id == "*":
            ProjectSkill.objects.filter(project=project).delete()
        else:
            ProjectSkill.objects.filter(
                project=project, skill_id=skill_id
            ).delete()
        return Response({"status": "removed"})


    # @action(detail=True, methods=["post"])
    # def match(self, request, pk=None):
    #     # временно отключено, чтобы не падало
    #     return Response({"detail":"match disabled"}, status=status.HTTP_200_OK)
        
    
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