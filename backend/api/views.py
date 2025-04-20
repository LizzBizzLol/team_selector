from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User, Skill, UserSkill, Project, Requirement, Team
from .serializers import (
    UserSerializer, SkillSerializer,
    UserSkillSerializer, ProjectSerializer,
    RequirementSerializer, TeamSerializer
)
from .matching import match_team  # функция подбора команды, пока не используется (отсутствует). ВСТАВИТЬ, КОГДА НИКИТА СДЕЛАЕТ АЛГОРИТМ 

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer


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
    authentication_classes = []  # отключаем аутентификацию для разработки
    permission_classes = [AllowAny]  # разрешаем все запросы

    def perform_create(self, serializer):
        # автоматически назначаем создателя: первый пользователь
        default_user = User.objects.first()
        serializer.save(creator=default_user)

    @action(detail=True, methods=['post'])
    def import_skills(self, request, pk=None):
        """
        Принимает JSON вида:
        { "students": [ {"id": 1, "skills": {"python": 0.86, "ml": 0.72}}, ... ] }
        Обновляет или создаёт записи UserSkill для каждого пользователя и навыка.
        """
        project = self.get_object()
        students = request.data.get('students', [])
        for student in students:
            user_id = student.get('id')
            skills_data = student.get('skills', {})
            for skill_name, level in skills_data.items():
                skill_obj, _ = Skill.objects.get_or_create(name=skill_name)
                UserSkill.objects.update_or_create(
                    user_id=user_id,
                    skill=skill_obj,
                    defaults={'level': level}
                )
        return Response({'status': 'skills imported'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def match(self, request, pk=None):
        """
        Запускает оператор соответствия для проекта:
        - Собирает требования и оценки пользователей
        - Вычисляет общий балл для каждого пользователя
        - Сохраняет команду и участников
        """
        project = self.get_object()
        user_ids = match_team(project)
        team = Team.objects.create(project=project)
        team.users.set(user_ids)
        serializer = TeamSerializer(team)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
