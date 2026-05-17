from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_board_event(board_id, message):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f'board_{board_id}',
        {
            'type': 'task_update',
            'message': message,
        },
    )
