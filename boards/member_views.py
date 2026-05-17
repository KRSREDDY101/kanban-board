from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Board, BoardMember
from .serializers import BoardMemberSerializer, InviteMemberSerializer
from .utils import accessible_boards, user_can_access_board

User = get_user_model()


def _board_or_404(user, board_id):
    try:
        return accessible_boards(user).get(pk=board_id)
    except Board.DoesNotExist:
        raise NotFound('Board not found.')


def _can_manage_members(user, board):
    if board.owner_id == user.id:
        return True
    return BoardMember.objects.filter(
        board=board,
        user=user,
        role='admin',
    ).exists()


def _members_payload(board):
    owner_entry = {
        'id': None,
        'user': board.owner_id,
        'user_email': board.owner.email,
        'role': 'owner',
    }
    members = BoardMemberSerializer(
        BoardMember.objects.filter(board=board).select_related('user'),
        many=True,
    ).data
    return [owner_entry, *members]


class BoardMemberListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, board_id):
        board = _board_or_404(request.user, board_id)
        return Response(_members_payload(board))

    def post(self, request, board_id):
        board = _board_or_404(request.user, board_id)

        if not _can_manage_members(request.user, board):
            raise PermissionDenied('Only the board owner or an admin can invite members.')

        serializer = InviteMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()
        role = serializer.validated_data.get('role', 'member')

        try:
            invitee = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise ValidationError({'email': 'No user found with this email.'})

        if invitee.id == board.owner_id:
            raise ValidationError({'email': 'The board owner is already on this board.'})

        member, created = BoardMember.objects.get_or_create(
            board=board,
            user=invitee,
            defaults={'role': role},
        )

        if not created:
            raise ValidationError({'email': 'This user is already a member.'})

        return Response(
            BoardMemberSerializer(member).data,
            status=status.HTTP_201_CREATED,
        )


class BoardMemberRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, board_id, user_id):
        board = _board_or_404(request.user, board_id)

        if not _can_manage_members(request.user, board):
            raise PermissionDenied('Only the board owner or an admin can remove members.')

        if int(user_id) == board.owner_id:
            raise ValidationError('Cannot remove the board owner.')

        try:
            member = BoardMember.objects.get(board=board, user_id=user_id)
        except BoardMember.DoesNotExist:
            raise NotFound('Member not found.')

        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
