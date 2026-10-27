from django.conf import settings
from django.db import models


class AffectionChoices(models.TextChoices):
    KISS = 'kiss'
    HUG = 'hug'
    GRATITUDE = 'gratitude'
    POKE = 'poke'
    BITE = 'bite'
    TEASE = 'tease'


class AffectionSending(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='affections_sent',
    )
    partnership = models.ForeignKey(
        'relationship_app.Partnership',
        on_delete=models.CASCADE,
        related_name='affections',
    )
    type = models.CharField(
        max_length=20,
        choices=AffectionChoices.choices,
    )
    read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
