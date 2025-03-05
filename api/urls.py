from django.urls import path
from .views import create_team

urlpatterns = [
    path('create_team/', create_team, name='create_team'),
]
