from django.conf import settings
from django.db import models


class Stardust(models.Model):
    partnership = models.ForeignKey(
        'relationship_app.Partnership',
        on_delete=models.CASCADE,
        related_name='stardust',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stardust',
    )
    total = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('partnership', 'user')


class Streak(models.Model):
    partnership = models.OneToOneField(
        'relationship_app.Partnership',
        on_delete=models.CASCADE,
        related_name='streak',
    )
    current_count = models.PositiveIntegerField(default=0)
    longest_count = models.PositiveIntegerField(default=0)
    last_completed_at = models.DateTimeField(null=True, blank=True)


class StreakActivity(models.Model):
    streak = models.ForeignKey(
        Streak,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    last_activity_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('streak', 'user')
