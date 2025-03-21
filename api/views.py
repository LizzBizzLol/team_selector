from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import StudentSerializer, TaskSerializer
from .utils import form_team_stub
import json
from django.http import JsonResponse
from .models import Student, StudentSkill, Skill

@api_view(['GET'])
def get_all_students(request):
    """
    Извлекает список всех студентов с их навыками.
    """
    students = Student.objects.all()
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


def index(request):
    # Отображение страницы с формой загрузки
    return render(request, 'api/index.html')

@api_view(['POST'])
def upload_team_data(request):
    # Обработка загруженного файла
    if request.method == 'POST' and request.FILES.get('jsonFile'):
        file = request.FILES['jsonFile']
        try:
            data = json.load(file)
        except json.JSONDecodeError:
            return JsonResponse({'message': 'Ошибка: неверный формат JSON.'}, status=400)
        
        students = data.get('students')
        task = data.get('task')
        if not students or not task:
            return JsonResponse({'message': 'Ошибка: отсутствуют необходимые данные.'}, status=400)
        
        team_size = task.get('team_size')
        task_requirements = task.get('required_skills', [])
        team = form_team_stub(students, task_requirements, team_size)
        
        return JsonResponse({
            'message': 'Данные приняты, команда сформирована, вот её участники:',
            'team': team
        })
    return JsonResponse({'message': 'Метод не поддерживается.'}, status=405)

@api_view(['POST'])
def create_team(request):
    """
    Представление для формирования команды.
    Ожидается, что входной JSON содержит ключи "students" и "task".
    """
    # Получаем данные из POST-запроса
    students_data = request.data.get('students')
    task_data = request.data.get('task')
    
    if not students_data or not task_data:
        return Response(
            {'error': 'Both "students" and "task" data must be provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    team_size = task_data.get('team_size')
    task_requirements = task_data.get('required_skills', [])
    
    # Вызываем функцию-заглушку для формирования команды
    team = form_team_stub(students_data, task_requirements, team_size)
    
    return Response({
        'message': 'Команда сформирована (заглушка).',
        'team': team
    }, status=status.HTTP_200_OK)