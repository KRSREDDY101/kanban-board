from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from boards.utils import user_can_access_board
from tasks.broadcast import broadcast_board_event

from .models import List
from .serializers import ListSerializer
from .utils import next_list_position


def _emit_list_event(board_id, event_type, user_id, list_data):
    broadcast_board_event(
        board_id,
        {'event': event_type, 'actor_id': user_id, 'list': list_data},
    )


def get_list_for_user(user, pk):
    try:
        board_list = List.objects.select_related('board').get(pk=pk)
    except List.DoesNotExist:
        raise NotFound('List not found.')

    if not user_can_access_board(user, board_list.board_id):
        raise PermissionDenied('You do not have access to this list.')

    return board_list


class ListCreateView(generics.CreateAPIView):

    serializer_class = ListSerializer

    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        board = serializer.validated_data['board']

        if not user_can_access_board(self.request.user, board.id):
            raise PermissionDenied('You do not have access to this board.')

        position = serializer.validated_data.get('position')
        if position is None:
            position = next_list_position(board.id)

        board_list = serializer.save(position=position)
        _emit_list_event(
            board.id,
            'list_created',
            self.request.user.id,
            ListSerializer(board_list).data,
        )


class BoardListsView(generics.ListAPIView):

    serializer_class = ListSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        board_id = self.kwargs['board_id']

        if not user_can_access_board(self.request.user, board_id):
            raise PermissionDenied('You do not have access to this board.')

        return List.objects.filter(board_id=board_id)


class ListUpdateView(generics.UpdateAPIView):

    serializer_class = ListSerializer

    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_object(self):
        return get_list_for_user(self.request.user, self.kwargs['pk'])

    def perform_update(self, serializer):
        board_list = serializer.save()
        _emit_list_event(
            board_list.board_id,
            'list_updated',
            self.request.user.id,
            ListSerializer(board_list).data,
        )


class ListDeleteView(generics.DestroyAPIView):

    permission_classes = [IsAuthenticated]

    def get_object(self):

        return get_list_for_user(self.request.user, self.kwargs['pk'])
