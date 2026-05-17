from django.urls import re_path

from .consumers import TaskConsumer


websocket_urlpatterns = [
    re_path(r'ws/tasks/(?P<board_id>\w+)/$', TaskConsumer.as_asgi()),
]