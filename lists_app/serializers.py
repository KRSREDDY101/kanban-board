from rest_framework import serializers

from .models import List


class ListSerializer(serializers.ModelSerializer):

    board_name = serializers.ReadOnlyField(
        source='board.name'
    )

    class Meta:

        model = List

        fields = [
            'id',
            'board',
            'board_name',
            'title',
            'position',
            'created_at',
        ]

        extra_kwargs = {
            'position': {'required': False},
        }