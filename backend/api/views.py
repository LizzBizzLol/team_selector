from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    User, Skill, UserSkill,
    Project, Requirement, Team,
    ProjectRequirement,  # импорт промежуточной таблицы
)
from .serializers import (
    UserSerializer, SkillSerializer,
    UserSkillSerializer, ProjectSerializer,
    RequirementSerializer, TeamSerializer
)
from .matching import match_team


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role in [User.CURATOR, User.STUDENT]:
            qs = qs.filter(role=role)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("name")


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("name")


class UserSkillViewSet(viewsets.ModelViewSet):
    queryset = UserSkill.objects.all()
    serializer_class = UserSkillSerializer


class RequirementViewSet(viewsets.ModelViewSet):
    queryset = Requirement.objects.all()
    serializer_class = RequirementSerializer


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    # ↓ авто‑назначение первого куратора (если нужно)
    def perform_create(self, serializer):
        default_curator = User.objects.filter(role=User.CURATOR).first()
        serializer.save(curator=default_curator)

    # ──────────────────────────────────────────────
    #  Добавить / Удалить требование к проекту
    # ──────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def add_requirement(self, request, pk=None):
        """Body: {"skill": <skill_id>, "level": <1‑5>}"""
        project  = self.get_object()
        skill_id = request.data.get("skill")
        level    = request.data.get("level")

        if not (skill_id and level):
            return Response({"detail": "skill и level обязательны"}, status=400)

        req, _ = Requirement.objects.get_or_create(
            skill_id=skill_id,
            level=level,
        )
        ProjectRequirement.objects.get_or_create(project=project, requirement=req)
        return Response({"status": "added"}, status=201)

    @action(detail=True, methods=["post"])
    def remove_requirement(self, request, pk=None):
        """Body: {"req_id": <Requirement.id>}"""
        project = self.get_object()
        req_id  = request.data.get("req_id")
        if req_id == "*":
            ProjectRequirement.objects.filter(project=project).delete()
        else:
            ProjectRequirement.objects.filter(
                project=project, requirement_id=req_id
            ).delete()
        return Response({"status": "removed"})

    # ──────────────────────────────────────────────
    #  Импорт и Мэтчинг
    # ──────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def import_skills(self, request, pk=None):
        """Импорт матрицы навыков из JSON."""
        project  = self.get_object()
        students = request.data.get("students", [])

        for student in students:
            user_id     = student.get("id")
            skills_data = student.get("skills", {})
            for skill_name, level in skills_data.items():
                skill_obj, _ = Skill.objects.get_or_create(name=skill_name)
                UserSkill.objects.update_or_create(
                    user_id=user_id,
                    skill=skill_obj,
                    defaults={"level": level}
                )
        return Response({"status": "skills imported"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def match(self, request, pk=None):
        project  = self.get_object()
        user_ids = match_team(project)
        team = Team.objects.create(project=project)
        team.users.set(user_ids)
        serializer = TeamSerializer(team)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
