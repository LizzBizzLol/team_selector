# api/admin.py

from django.contrib import admin
from .models import (
    Curator, Student, Skill,
    Project, ProjectSkill,
    StudentSkill, Team
)

admin.site.register(Curator)
#admin.site.register(Student)
# admin.site.register(Skill)
admin.site.register(Project)
admin.site.register(ProjectSkill)
admin.site.register(StudentSkill)
admin.site.register(Team)

admin.site.site_header = "Администрирование"
admin.site.site_title = "Администрирование"
admin.site.index_title = "Администрирование"

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ("name", "email", "admission_year", "skills_list")
    search_fields = ("name__icontains", "email__icontains", "skills__skill__name__icontains")
    list_filter   = ("skills__skill__name", "admission_year")
    ordering      = ("name",)
    list_per_page = 1000  # показывать до 1000 студентов на странице

    def skills_list(self, obj):
        return ", ".join(sorted(set(s.skill.name for s in obj.skills.all())))
    skills_list.short_description = "Навыки"

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display  = ("name", "students_count")
    search_fields = ("name__icontains",)
    ordering      = ("name",)

    def students_count(self, obj):
        return obj.studentskill_set.count()
    students_count.short_description = "Кол-во студентов"