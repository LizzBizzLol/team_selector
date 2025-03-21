from django.contrib import admin
from .models import Skill, Student, StudentSkill, TaskRequirement, Task

admin.site.register(Skill)
admin.site.register(Student)
admin.site.register(StudentSkill)
admin.site.register(TaskRequirement)
admin.site.register(Task)