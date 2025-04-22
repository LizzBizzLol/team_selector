from rest_framework import serializers
from .models import User, Skill, UserSkill, Project, Requirement, Team

class SkillLevelSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name')

    class Meta:
        model = UserSkill
        fields = ('id', 'skill_name', 'level')

class UserSerializer(serializers.ModelSerializer):
    skills = SkillLevelSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'name', 'skills')

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'

class UserSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkill
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'creator', 'created_at']
        read_only_fields = ['creator']

class RequirementSerializer(serializers.ModelSerializer):
    # делаем целым числом 1‑5
    level_required = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Requirement
        fields = "__all__"

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'
