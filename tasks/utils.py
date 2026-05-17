from django.db import transaction
from django.db.models import F, Max

from .models import Task


def next_task_position(list_id):
    current_max = Task.objects.filter(list_id=list_id).aggregate(
        Max('position')
    )['position__max']
    return (current_max or 0) + 1


@transaction.atomic
def apply_task_move(task, target_list, new_position):
    if new_position < 1:
        raise ValueError('position must be at least 1')

    old_list = task.list
    old_position = task.position

    if old_list.id == target_list.id and old_position == new_position:
        return task

    if old_list.id == target_list.id:
        if new_position > old_position:
            Task.objects.filter(
                list=old_list,
                position__gt=old_position,
                position__lte=new_position,
            ).update(position=F('position') - 1)
        else:
            Task.objects.filter(
                list=old_list,
                position__gte=new_position,
                position__lt=old_position,
            ).update(position=F('position') + 1)
    else:
        Task.objects.filter(
            list=old_list,
            position__gt=old_position,
        ).update(position=F('position') - 1)

        Task.objects.filter(
            list=target_list,
            position__gte=new_position,
        ).update(position=F('position') + 1)

    task.list = target_list
    task.position = new_position
    task.save(update_fields=['list', 'position'])
    return task
