from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_self_partnership(sender, instance, created, **kwargs):
    if created:
        from relationship_app.models import Partnership, PartnershipStatus, RelationType

        Partnership.objects.create(
            initiator=instance,
            partner=instance,
            status=PartnershipStatus.ACTIVE,
            relation=RelationType.SOULMATE,
        )
