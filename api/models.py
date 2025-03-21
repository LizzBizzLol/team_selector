from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Skill(models.Model):
    """
    Модель для хранения информации о навыке.
    """
    name = models.CharField(max_length=100, help_text="Название технического навыка (на английском)")
    
    def __str__(self):
        return self.name

class Student(models.Model):
    """
    Модель для хранения информации о студенте.
    """
    uid = models.CharField(max_length=100, unique=True, help_text="Уникальный идентификатор студента")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    skills = models.ManyToManyField(Skill, through='StudentSkill', related_name='students')

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class StudentSkill(models.Model):
    """
    Промежуточная модель, связывающая студента и навык,
    с указанием уровня владения данным навыком (от 1 до 5).
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Уровень владения навыком (от 1 до 5)"
    )

    class Meta:
        unique_together = ('student', 'skill')

    def __str__(self):
        return f"{self.student} - {self.skill} (level {self.level})"

class TaskRequirement(models.Model):
    """
    Модель для хранения требования к навыку в задаче.
    """
    skill = models.CharField(max_length=100, help_text="Название требуемого навыка (на английском)")
    strictness = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], 
        help_text="Строгость соответствия навыка (1-5). При значении 5 требуется точное совпадение, при 3 допускается учитывать смежные навыки.")

    def __str__(self):
        return f"{self.skill} (strictness: {self.strictness})"

class Task(models.Model):
    """
    Модель для хранения информации о задаче.
    """
    team_size = models.IntegerField(help_text="Требуемое число участников команды")
    required_skills = models.ManyToManyField(TaskRequirement, related_name='tasks')

    def __str__(self):
        return f"Task (team size: {self.team_size})"
