from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Board, BoardMember
from .serializers import BoardSerializer
from .utils import accessible_boards


class BoardListCreateView(generics.ListCreateAPIView):

    serializer_class = BoardSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return accessible_boards(self.request.user)

    def perform_create(self, serializer):
        board = serializer.save(owner=self.request.user)
        BoardMember.objects.get_or_create(
            board=board,
            user=self.request.user,
            defaults={'role': 'admin'},
        )


class BoardDetailView(generics.RetrieveAPIView):

    serializer_class = BoardSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return accessible_boards(self.request.user)
