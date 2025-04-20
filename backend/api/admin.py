from django.contrib import admin
from .models import User, Skill, UserSkill, Project, Requirement, Team

admin.site.register(User)
admin.site.register(Skill)
admin.site.register(UserSkill)
admin.site.register(Project)
admin.site.register(Requirement)
admin.site.register(Team)
