import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from boards.utils import user_can_access_board


class TaskConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close()
            return

        self.board_id = self.scope['url_route']['kwargs']['board_id']
        has_access = await self._user_has_board_access(user.id, self.board_id)
        if not has_access:
            await self.close()
            return

        self.room_group_name = f'board_{self.board_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        pass

    async def task_update(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def _user_has_board_access(self, user_id, board_id):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return False
        return user_can_access_board(user, int(board_id))
