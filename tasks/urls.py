from django.urls import path

from .views import (
    TaskCreateView,
    TasksByListView,
    TaskUpdateView,
    TaskDeleteView,
    TaskMoveView,
)

urlpatterns = [

    path('', TaskCreateView.as_view(), name='create-task'),

    path('list/<int:list_id>/', TasksByListView.as_view(), name='tasks-by-list'),

    path('<int:pk>/move/', TaskMoveView.as_view(), name='move-task'),

    path('<int:pk>/', TaskUpdateView.as_view(), name='update-task'),

    path('delete/<int:pk>/', TaskDeleteView.as_view(), name='delete-task'),
]
