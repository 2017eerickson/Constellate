from django.conf import settings
from django.db import models


class PartnershipStatus(models.TextChoices):
    PENDING = 'pending'
    ACTIVE = 'active'
    PAUSED = 'paused'
    ENDED = 'ended'


class RelationType(models.TextChoices):
    SOULMATE = 'soulmate'
    ROMANTIC = 'romantic'
    PLATONIC = 'platonic'
    METAMOUR = 'metamour'
    OTHER = 'other'


class Partnership(models.Model):
    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='initiated_partnerships',
    )
    partner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_partnerships',
    )
    status = models.CharField(
        max_length=20,
        choices=PartnershipStatus.choices,
        default=PartnershipStatus.PENDING,
    )
    relation = models.CharField(
        max_length=20,
        choices=RelationType.choices,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('initiator', 'partner')
