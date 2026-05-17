from django.db.models import Max

from .models import List


def next_list_position(board_id):
    current_max = List.objects.filter(board_id=board_id).aggregate(
        Max('position')
    )['position__max']
    return (current_max or 0) + 1
