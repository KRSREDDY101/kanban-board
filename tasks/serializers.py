from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):

    assigned_user_email = serializers.ReadOnlyField(
        source='assigned_to.email'
    )

    class Meta:

        model = Task

        fields = [
            'id',
            'list',
            'title',
            'description',
            'assigned_to',
            'assigned_user_email',
            'due_date',
            'position',
            'created_at',
        ]

        extra_kwargs = {
            'position': {'required': False},
        }