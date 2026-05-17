from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from boards.utils import user_can_access_board

from lists_app.models import List

from .models import Task
from .serializers import TaskSerializer
from .utils import next_task_position, apply_task_move
from .broadcast import broadcast_board_event


def get_task_for_user(user, task_id):
    try:
        task = Task.objects.select_related('list__board').get(pk=task_id)
    except Task.DoesNotExist:
        raise NotFound('Task not found.')

    if not user_can_access_board(user, task.list.board_id):
        raise PermissionDenied('You do not have access to this task.')

    return task


def _emit(board_id, event_type, user_id=None, **payload):
    broadcast_board_event(
        board_id,
        {'event': event_type, 'actor_id': user_id, **payload},
    )


class TaskCreateView(generics.CreateAPIView):

    serializer_class = TaskSerializer

    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        board_list = serializer.validated_data['list']

        if not user_can_access_board(self.request.user, board_list.board_id):
            raise PermissionDenied('You do not have access to this list.')

        position = serializer.validated_data.get('position')
        if position is None:
            position = next_task_position(board_list.id)

        task = serializer.save(position=position)
        _emit(
            board_list.board_id,
            'task_created',
            self.request.user.id,
            task=TaskSerializer(task).data,
        )


class TasksByListView(generics.ListAPIView):

    serializer_class = TaskSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        list_id = self.kwargs['list_id']

        try:
            board_list = List.objects.select_related('board').get(pk=list_id)
        except List.DoesNotExist:
            raise NotFound('List not found.')

        if not user_can_access_board(self.request.user, board_list.board_id):
            raise PermissionDenied('You do not have access to this list.')

        return Task.objects.filter(list_id=list_id).order_by('position')


class TaskUpdateView(generics.UpdateAPIView):

    serializer_class = TaskSerializer

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_task_for_user(self.request.user, self.kwargs['pk'])

    def perform_update(self, serializer):
        task = serializer.save()
        _emit(
            task.list.board_id,
            'task_updated',
            self.request.user.id,
            task=TaskSerializer(task).data,
        )


class TaskDeleteView(generics.DestroyAPIView):

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_task_for_user(self.request.user, self.kwargs['pk'])

    def perform_destroy(self, instance):
        board_id = instance.list.board_id
        list_id = instance.list_id
        task_id = instance.id
        instance.delete()
        _emit(
            board_id,
            'task_deleted',
            self.request.user.id,
            task_id=task_id,
            list_id=list_id,
        )


class TaskMoveSerializer(serializers.Serializer):
    list_id = serializers.IntegerField(
        required=False,
        help_text='Target list id (use this in Swagger if body is empty)',
    )
    list = serializers.IntegerField(
        required=False,
        help_text='Same as list_id',
    )
    position = serializers.IntegerField(
        help_text='Position in that list (1, 2, 3, ...)',
    )

    def validate(self, attrs):
        target_list = attrs.get('list_id') or attrs.get('list')
        if target_list is None:
            raise serializers.ValidationError(
                'list_id (or list) and position are required.'
            )
        attrs['list_id'] = target_list
        return attrs


def _move_task_payload(request):
    if request.data:
        return request.data

    list_id = request.query_params.get('list_id') or request.query_params.get('list')
    position = request.query_params.get('position')
    if list_id is not None and position is not None:
        return {'list_id': list_id, 'position': position}

    return request.data


class TaskMoveView(APIView):

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TaskMoveSerializer,
        responses=TaskSerializer,
        parameters=[
            OpenApiParameter(
                'list_id',
                int,
                OpenApiParameter.QUERY,
                description='Target list (use if request body is empty)',
            ),
            OpenApiParameter(
                'position',
                int,
                OpenApiParameter.QUERY,
                description='Position in list (use if request body is empty)',
            ),
        ],
    )
    def patch(self, request, pk):

        move_serializer = TaskMoveSerializer(data=_move_task_payload(request))
        move_serializer.is_valid(raise_exception=True)

        new_list_id = move_serializer.validated_data['list_id']
        new_position = move_serializer.validated_data['position']

        task = get_task_for_user(request.user, pk)

        try:
            new_list = List.objects.select_related('board').get(pk=new_list_id)
        except List.DoesNotExist:
            return Response(
                {'error': 'List not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user_can_access_board(request.user, new_list.board_id):
            raise PermissionDenied('You do not have access to the target list.')

        if task.list.board_id != new_list.board_id:
            raise ValidationError({'list_id': 'Target list must belong to the same board.'})

        if new_position < 1:
            raise ValidationError({'position': 'Must be at least 1.'})

        apply_task_move(task, new_list, new_position)
        task.refresh_from_db()

        data = TaskSerializer(task).data
        _emit(new_list.board_id, 'task_moved', request.user.id, task=data)
        return Response(data)
