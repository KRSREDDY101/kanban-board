from django.db.models import Q

from .models import Board


def accessible_boards(user):
    return Board.objects.filter(
        Q(owner=user) | Q(members__user=user)
    ).distinct()


def user_can_access_board(user, board_id):
    return accessible_boards(user).filter(pk=board_id).exists()
