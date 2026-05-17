from django.urls import path

from .member_views import BoardMemberListCreateView, BoardMemberRemoveView
from .views import (
    BoardListCreateView,
    BoardDetailView,
)

urlpatterns = [

    path(
        '',
        BoardListCreateView.as_view(),
        name='boards'
    ),

    path(
        '<int:pk>/',
        BoardDetailView.as_view(),
        name='board-detail'
    ),

    path(
        '<int:board_id>/members/',
        BoardMemberListCreateView.as_view(),
        name='board-members'
    ),

    path(
        '<int:board_id>/members/<int:user_id>/',
        BoardMemberRemoveView.as_view(),
        name='board-member-remove'
    ),
]