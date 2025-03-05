from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import StudentSerializer, TaskSerializer

@api_view(['POST'])
def create_team(request):
    # Ожидаем два ключа: "students" и "task" в JSON
    students_data = request.data.get('students')
    task_data = request.data.get('task')
    
    if not students_data or not task_data:
        return Response({'error': 'Both "students" and "task" data must be provided.'}, status=status.HTTP_400_BAD_REQUEST)
    
    student_serializer = StudentSerializer(data=students_data, many=True)
    task_serializer = TaskSerializer(data=task_data)
    
    if student_serializer.is_valid() and task_serializer.is_valid():
        # Здесь можно добавить логику подбора команды на основе данных
        # Пока что возвращаем успешно обработанный запрос с полученными данными
        return Response({
            'message': 'Data received successfully.',
            'students': student_serializer.data,
            'task': task_serializer.data,
        }, status=status.HTTP_200_OK)
    else:
        errors = {}
        errors['students'] = student_serializer.errors
        errors['task'] = task_serializer.errors
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)