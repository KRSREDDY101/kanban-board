from django.db import models
from django.conf import settings

from lists_app.models import List


class Task(models.Model):

    list = models.ForeignKey(
        List,
        on_delete=models.CASCADE,
        related_name='tasks'
    )

    title = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        null=True
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    due_date = models.DateField(
        null=True,
        blank=True
    )

    position = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:

        ordering = ['position']

    def __str__(self):

        return self.title