from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import (
    User, Skill, UserSkill,
    Project, Requirement, Team
)

# ──────────────────────────────────────────────────────────────
#  Пользователь → Навыки (Level)
# ──────────────────────────────────────────────────────────────
class SkillLevelSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name")

    class Meta:
        model = UserSkill
        fields = ("id", "skill_name", "level")


# ──────────────────────────────────────────────────────────────
#  Пользователи
# ──────────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    skills = SkillLevelSerializer(many=True, read_only=True)
    name = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Пользователь с таким именем уже существует",
            )
        ]
    )

    class Meta:
        model = User
        fields = ("id", "name", "email", "role", "skills")


# ──────────────────────────────────────────────────────────────
#  Справочник навыков
# ──────────────────────────────────────────────────────────────
class SkillSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Skill.objects.all(),
                message="Навык с таким названием уже существует",
            )
        ]
    )

    class Meta:
        model = Skill
        fields = "__all__"


# ──────────────────────────────────────────────────────────────
#  Требование «Навык–Уровень» (уникальное)
# ──────────────────────────────────────────────────────────────
class RequirementSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = Requirement
        fields = ("id", "skill", "skill_name", "level")
        extra_kwargs = {"skill": {"write_only": True}}


# ──────────────────────────────────────────────────────────────
#  Проекты
# ──────────────────────────────────────────────────────────────
class ProjectSerializer(serializers.ModelSerializer):
    requirements = RequirementSerializer(many=True, read_only=True)
    curator_name = serializers.CharField(source="curator.name", read_only=True)

    title = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Project.objects.all(),
                message="Проект с таким названием уже существует",
            )
        ]
    )

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "curator",
            "curator_name",
            "min_participants",
            "max_participants",
            "requirements",
            "created_at",
        )
        read_only_fields = ("created_at",)

    # ───── Доп. валидация min/max участников ─────
    def validate(self, data):
        inst = getattr(self, "instance", None)
        min_p = data.get("min_participants", inst.min_participants if inst else 2)
        max_p = data.get("max_participants", inst.max_participants if inst else 5)

        if not (2 <= min_p <= 5 and 2 <= max_p <= 5):
            raise serializers.ValidationError("Мин. участников ≥2, макс. ≤5")
        if min_p > max_p:
            raise serializers.ValidationError("Мин. участников не может превышать макс.")
        return data


# ──────────────────────────────────────────────────────────────
#  Привязка навыков к пользователю
# ──────────────────────────────────────────────────────────────
class UserSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = UserSkill
        fields = ("skill_name", "level")


# ──────────────────────────────────────────────────────────────
#  Команды (матчинг)
# ──────────────────────────────────────────────────────────────
class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = "__all__"
