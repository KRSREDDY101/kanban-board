from rest_framework import serializers

from .models import Board, BoardMember


class BoardSerializer(serializers.ModelSerializer):

    owner_email = serializers.ReadOnlyField(
        source='owner.email'
    )

    class Meta:
        model = Board

        fields = [
            'id',
            'name',
            'owner',
            'owner_email',
            'created_at',
        ]

        read_only_fields = [
            'owner',
        ]


class BoardMemberSerializer(serializers.ModelSerializer):

    user_email = serializers.ReadOnlyField(
        source='user.email'
    )

    class Meta:
        model = BoardMember

        fields = [
            'id',
            'board',
            'user',
            'user_email',
            'role',
        ]
        read_only_fields = ['board']


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=BoardMember.ROLE_CHOICES,
        default='member',
        required=False,
    )