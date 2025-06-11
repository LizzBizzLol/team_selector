from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import (
    Curator, Student,
    Skill, Project,
    ProjectSkill,
    StudentSkill, Team
)

class SkillSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        validators=[UniqueValidator(
            queryset=Skill.objects.all(),
            message="Навык с таким названием уже существует"
        )]
    )
    students_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Skill
        fields = "__all__"

class ProjectSkillSerializer(serializers.ModelSerializer):
    skill_id   = serializers.IntegerField(source="skill.id", read_only=True)
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model  = ProjectSkill
        fields = ("id", "skill_id", "skill_name", "level", "skill")
        # skill:
        #   - при GET нам нужен id (skill_id)
        #   - при POST / PATCH мы всё так же принимаем «skill»
        extra_kwargs = {"skill": {"write_only": True}}

class ProjectListSerializer(serializers.ModelSerializer):
    # Для таблицы можно сделать только нужные поля
    requirements = ProjectSkillSerializer(many=True, read_only=True, source='skill_links')
    class Meta:
        model = Project
        fields = ("id", "title", "min_participants", "max_participants", "requirements")

class CuratorSerializer(serializers.ModelSerializer):
    projects_count = serializers.IntegerField(read_only=True)
    projects = ProjectListSerializer(many=True, read_only=True, source="curated_projects")  # ← ВАЖНО: проверь related_name

    class Meta:
        model = Curator
        fields = ("id", "name", "email", "projects_count", "projects")

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

class TeamStudentSkillDetailSerializer(serializers.Serializer):
    skill_id = serializers.IntegerField()
    skill_name = serializers.CharField()
    student_level = serializers.FloatField()
    required_level = serializers.FloatField()
    score = serializers.FloatField()

class TeamStudentDetailSerializer(serializers.ModelSerializer):
    score = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ("id", "name", "email", "score", "skills")

    def get_score(self, student):
        project = self.context.get("project")
        if not project:
            return None
        requirements = project.skill_links.all()
        sum_score = 0
        for req in requirements:
            try:
                lvl = StudentSkill.objects.get(student=student, skill=req.skill).level
            except StudentSkill.DoesNotExist:
                lvl = 0
            if req.level:
                sum_score += min(lvl / req.level, 1)
        if requirements.count() == 0:
            return 0
        return round(sum_score / requirements.count(), 2)

    def get_skills(self, student):
        project = self.context.get("project")
        if not project:
            return []
        requirements = project.skill_links.all()
        out = []
        for req in requirements:
            try:
                lvl = StudentSkill.objects.get(student=student, skill=req.skill).level
            except StudentSkill.DoesNotExist:
                lvl = 0
            score = min(lvl / req.level, 1) if req.level else 0
            out.append({
                "skill_id": req.skill.id,
                "skill_name": req.skill.name,
                "student_level": lvl,
                "required_level": req.level,
                "score": round(score, 2),
            })
        return out

class VirtualStudentSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    matched_skills = serializers.ListField()
    score = serializers.FloatField(required=False)

class VirtualTeamSerializer(serializers.Serializer):
    project = serializers.IntegerField()
    students = VirtualStudentSerializer(many=True)

class TeamStudentSerializer(serializers.ModelSerializer):
    # matched_skills только для виртуальных студентов (dict), для БД — только skills
    skills = StudentSkillSerializer(many=True, read_only=True)
    matched_skills = serializers.ListField(required=False)

    class Meta:
        model = Student
        fields = ("id", "name", "email", "skills", "matched_skills")

    def to_representation(self, instance):
        # Если это виртуальный студент (dict), matched_skills есть
        if isinstance(instance, dict):
            return {
                "name": instance.get("name"),
                "email": instance.get("email"),
                "matched_skills": instance.get("matched_skills", []),
                "score": instance.get("score", 0),
            }
        # Если это студент из БД — только skills
        data = super().to_representation(instance)
        data.pop("matched_skills", None)
        return data

class TeamSerializer(serializers.ModelSerializer):
    students = TeamStudentSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ("id", "project", "students", "created_at")

    def get_students(self, obj):
        # Передаём в сериализатор контекст с проектом, чтобы он видел требования
        project = obj.project
        return TeamStudentDetailSerializer(
            obj.students.all(),
            many=True,
            context={"project": project}
        ).data

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

        return data