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
