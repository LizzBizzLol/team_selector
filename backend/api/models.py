from django.db import models

# Пользователь / Студент
class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# Навык
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

# Проект
class Project(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# Требование к проекту: навык + нужный уровень
class Requirement(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="requirements")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level_required = models.FloatField()  # Например: 0.8, 1.0

# Связь пользователя и его уровня навыков
class UserSkill(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.FloatField()  # Например: 0.6, 1.0

# Команда для проекта
class Team(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="teams")
    users = models.ManyToManyField(User)
    created_at = models.DateTimeField(auto_now_add=True)
