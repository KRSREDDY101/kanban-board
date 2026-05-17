from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope['user'] = AnonymousUser()
        query = parse_qs(scope.get('query_string', b'').decode())
        token = query.get('token', [None])[0]

        if token:
            try:
                validated = AccessToken(token)
                scope['user'] = await get_user(validated['user_id'])
            except (InvalidToken, TokenError, KeyError):
                pass

        return await super().__call__(scope, receive, send)
