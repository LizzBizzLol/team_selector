from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, SkillViewSet, UserSkillViewSet, ProjectViewSet, RequirementViewSet, TeamViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'skills', SkillViewSet)
router.register(r'user_skills', UserSkillViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'requirements', RequirementViewSet)
router.register(r'teams', TeamViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
