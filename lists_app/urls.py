from django.urls import path

from .views import (
    ListCreateView,
    BoardListsView,
    ListUpdateView,
    ListDeleteView,
)

urlpatterns = [

    path(
        '',
        ListCreateView.as_view(),
        name='create-list'
    ),

    path(
        'board/<int:board_id>/',
        BoardListsView.as_view(),
        name='board-lists'
    ),

    path(
        '<int:pk>/',
        ListUpdateView.as_view(),
        name='update-list'
    ),

    path(
        'delete/<int:pk>/',
        ListDeleteView.as_view(),
        name='delete-list'
    ),
]