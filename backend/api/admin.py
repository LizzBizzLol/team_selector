# api/admin.py

from django.contrib import admin
from .models import (
    Curator, Student, Skill,
    Project, ProjectSkill,
    StudentSkill, Team
)

admin.site.register(Curator)
#admin.site.register(Student)
admin.site.register(Skill)
admin.site.register(Project)
admin.site.register(ProjectSkill)
admin.site.register(StudentSkill)
admin.site.register(Team)

admin.site.site_header = "Администрирование"
admin.site.site_title = "Администрирование"
admin.site.index_title = "Администрирование"

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ("name", "email")
    search_fields = ("name__icontains", "email__icontains",
                     "skills__skill__name__icontains")
    list_filter   = ("skills__skill__name",)   # фильтр-список навыков