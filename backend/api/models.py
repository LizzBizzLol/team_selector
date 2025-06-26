from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

# ─────────── Кураторы (только кураторы, без навыков) ───────────
class Curator(models.Model):
    name = models.CharField(max_length=100, unique=True)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# ─────────── Студенты ───────────
class Student(models.Model):
    name = models.CharField(max_length=100, unique=True)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    admission_year = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Год поступления"
    )

    def __str__(self):
        return self.name


# ─────────── Навык ───────────
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    graph_representation = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.name


# ─────────── Проект ───────────
class Project(models.Model):
    title = models.CharField(max_length=200, unique=True)
    curator = models.ForeignKey(
        Curator,
        on_delete=models.SET_NULL,
        null=True,
        related_name="curated_projects"
    )
    min_participants = models.PositiveSmallIntegerField(default=1)
    max_participants = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# ─────────── Связь «Проект – Навык» + уровень ───────────
class ProjectSkill(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="skill_links"
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE
    )
    level = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )  # 0-1, валидируется на Django-уровне

    class Meta:
        unique_together = ("project", "skill")
        ordering = ["skill__name"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(level__gte=0, level__lte=1),
                name="projectskill_level_range_0_1"
            ),
        ]

    def __str__(self):
        return f"{self.project} · {self.skill} — {self.level}"


# ─────────── Связь «Студент – Навык» + уровень ───────────
class StudentSkill(models.Model):
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="skills"
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE
    )
    level = models.FloatField()  # например: 0.6, 1.0
    year = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Год"
    )
    class Meta:
        unique_together = ("student", "skill")

    def __str__(self):
        return f"{self.student} · {self.skill} — {self.level}"


# ─────────── Команда для проекта ───────────
class Team(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="teams"
    )
    students = models.ManyToManyField(Student)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Team for {self.project} ({self.created_at:%Y-%m-%d})"


# ─────────── Кэш путей между навыками ───────────
class SkillPath(models.Model):
    from_skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="paths_from"
    )
    to_skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="paths_to"
    )
    distance = models.FloatField()  # Расстояние в графе
    path = models.JSONField()  # Список навыков в пути
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("from_skill", "to_skill")
        indexes = [
            models.Index(fields=['from_skill', 'to_skill']),
            models.Index(fields=['distance']),
        ]

    def __str__(self):
        return f"{self.from_skill} → {self.to_skill} (dist: {self.distance:.4f})"
