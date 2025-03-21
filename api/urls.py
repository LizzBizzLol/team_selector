from django.urls import path
from .views import create_team, index, upload_team_data, get_all_students

urlpatterns = [
    path('students/', get_all_students, name='get_all_students'),
    path('create_team/', create_team, name='create_team'),
    path('upload_team_data/', upload_team_data, name='upload_team_data'),
    path('', index, name='index'),
]