from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import (
    Curator, Student,
    Skill, Project,
    ProjectSkill,
    StudentSkill, Team
)

class CuratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curator
        fields = ("id","name","email")

class SkillSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        validators=[UniqueValidator(
            queryset=Skill.objects.all(),
            message="Навык с таким названием уже существует"
        )]
    )
    class Meta:
        model = Skill
        fields = "__all__"

class ProjectSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    class Meta:
        model = ProjectSkill
        fields = ("id","skill","skill_name","level")
        extra_kwargs = {"skill": {"write_only": True}}

class StudentSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    class Meta:
        model = StudentSkill
        fields = ("id","student","skill","skill_name","level")
        extra_kwargs = {
            "student": {"write_only": True},
            "skill":   {"write_only": True},
        }

class StudentSerializer(serializers.ModelSerializer):
    # встраиваем навык → уровень
    skills = StudentSkillSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = ("id", "name", "email", "skills")

class TeamSerializer(serializers.ModelSerializer):
    students = StudentSerializer(many=True, read_only=True)
    student_ids = serializers.PrimaryKeyRelatedField(
                    many=True, write_only=True, source="students",
                    queryset=Student.objects.all()
    )   
    class Meta:
        model = Team
        fields = ("id","project","students","student_ids","score","created_at")
        read_only_fields = ("created_at",)

class ProjectSerializer(serializers.ModelSerializer):
    curator       = CuratorSerializer(read_only=True)
    curator_name  = serializers.CharField(source="curator.name", read_only=True)
    curator_id    = serializers.PrimaryKeyRelatedField(
                        queryset=Curator.objects.all(),
                        write_only=True, source="curator"
    )
    skill_links   = ProjectSkillSerializer(many=True, read_only=True)
    class Meta:
        model = Project
        fields = (
            "id","title",
            "curator","curator_id", "curator_name",
            "min_participants","max_participants",
            "skill_links","created_at"
        )
        read_only_fields = ("created_at",)

    def validate(self, data):
        inst = getattr(self, "instance", None)
        from .models import Student

        # берём новое или текущее значение
        min_p = data.get("min_participants", inst.min_participants if inst else 1)
        max_p = data.get("max_participants", inst.max_participants if inst else Student.objects.count())

        total_students = Student.objects.count() or 1

        if not (1 <= min_p <= max_p <= total_students):
            raise serializers.ValidationError(
                f"Мин. участников ≥1, макс. ≤{total_students}, и min ≤ max"
            )

        # Проверка: минимум одно требование при редактировании
        if inst and not inst.skill_links.exists():
            raise serializers.ValidationError(
                "Хотя бы одно требование обязательно"
            )

        return data