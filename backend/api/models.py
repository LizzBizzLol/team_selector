from django.db import models

# Пользователь / Студент
class User(models.Model):
    CURATOR  = "curator"
    STUDENT  = "student"

    ROLE_CHOICES = [
        (CURATOR,  "Куратор"),
        (STUDENT,  "Студент"),
    ]

    name        = models.CharField(max_length=100, unique=True)
    email       = models.EmailField(unique=True)
    role        = models.CharField(
        max_length=8,
        choices=ROLE_CHOICES,
        default=STUDENT,
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# Навык
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

# Проект
class Project(models.Model):
    title = models.CharField(max_length=200, unique=True)
    #description = models.TextField(blank=True) # пока не используем
    #куратор — любой пользователь; при удалении User проект остаётся
    curator = models.ForeignKey(
        "User", on_delete=models.SET_NULL,
        null=True, related_name="curated_projects"
    )

    min_participants = models.PositiveSmallIntegerField(default=2)
    max_participants = models.PositiveSmallIntegerField(default=5)
    # <----- NOVA: Many-to-Many через промежуточную таблицу
    requirements = models.ManyToManyField(
        "Requirement",
        through="ProjectRequirement",
        related_name="projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# ─────────── УНИКАЛЬНОЕ «НАВЫК-УРОВЕНЬ» ───────────
class Requirement(models.Model):
    skill  = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level  = models.PositiveSmallIntegerField()           # 1-5

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["skill", "level"],
                name="unique_skill_level"
            )
        ]

    def __str__(self):
        return f"{self.skill} — уровень {self.level}"


# ─────────── СВЯЗЬ «ПРОЕКТ ↔ ТРЕБОВАНИЕ» ───────────
class ProjectRequirement(models.Model):
    project     = models.ForeignKey("Project",     on_delete=models.CASCADE)
    requirement = models.ForeignKey("Requirement", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("project", "requirement")


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
