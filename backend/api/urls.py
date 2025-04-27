# api/urls.py

from rest_framework.routers import DefaultRouter
from .views import (
    CuratorViewSet, StudentViewSet,
    SkillViewSet, ProjectViewSet,
    ProjectSkillViewSet,
    StudentSkillViewSet, TeamViewSet
)

router = DefaultRouter()
router.register(r"curators", CuratorViewSet)
router.register(r"students", StudentViewSet)
router.register(r"skills", SkillViewSet)
router.register(r"projects", ProjectViewSet)
router.register(r"project_skills", ProjectSkillViewSet)
router.register(r"student_skills", StudentSkillViewSet)
router.register(r"teams", TeamViewSet)

urlpatterns = router.urls
