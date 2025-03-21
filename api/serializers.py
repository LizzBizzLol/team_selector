from rest_framework import serializers

class SkillSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    level = serializers.IntegerField(min_value=1, max_value=5)

class StudentSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    uid = serializers.CharField(max_length=100)
    skills = SkillSerializer(many=True)

class TaskRequirementSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    importance = serializers.IntegerField(min_value=1, max_value=5)

class TaskSerializer(serializers.Serializer):
    required_skills = TaskRequirementSerializer(many=True)
    team_size = serializers.IntegerField(min_value=1)

from rest_framework import serializers
from .models import Skill, Student, StudentSkill, TaskRequirement, Task

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['name']

class StudentSkillSerializer(serializers.ModelSerializer):
    # Вложенный сериализатор для навыка
    skill = SkillSerializer(read_only=True)

    class Meta:
        model = StudentSkill
        fields = ['skill', 'level']

class StudentSerializer(serializers.ModelSerializer):
    # Сериализуем объекты промежуточной модели, используя related_name или через student_set
    student_skills = StudentSkillSerializer(source='studentskill_set', many=True, read_only=True)

    class Meta:
        model = Student
        fields = ['first_name', 'last_name', 'uid', 'email', 'student_skills']

class TaskRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskRequirement
        fields = ['skill', 'strictness']

class TaskSerializer(serializers.ModelSerializer):
    required_skills = TaskRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = ['team_size', 'required_skills']
