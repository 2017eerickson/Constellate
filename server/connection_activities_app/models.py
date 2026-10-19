from django.conf import settings
from django.db import models


class MoodChoices(models.TextChoices):
    HAPPY = 'happy'
    SAD = 'sad'
    LOVED = 'loved'
    ANXIOUS = 'anxious'
    UPSET = 'upset'
    STRESSED = 'stressed'
    CALM = 'calm'
    EXCITED = 'excited'
    TIRED = 'tired'
    GRATEFUL = 'grateful'
    FOCUSED = 'focused'
    OKAY = 'okay'


class MoodSetting(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mood_settings',
    )
    partnership = models.ForeignKey(
        'relationship_app.Partnership',
        on_delete=models.CASCADE,
        related_name='mood_settings',
    )
    mood = models.CharField(
        max_length=20,
        choices=MoodChoices.choices,
    )
    timestamp = models.DateTimeField(auto_now_add=True)
