from django.contrib import admin

from .models import Board, BoardMember


admin.site.register(Board)
admin.site.register(BoardMember)