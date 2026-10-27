from django.db.models.signals import post_save
from django.dispatch import receiver

from relationship_app.models import Partnership

from connection_activities_app.models import MoodSetting


@receiver(post_save, sender=Partnership)
def create_default_moods(sender, instance, created, **kwargs):
    if created:
        MoodSetting.objects.create(user=instance.initiator, partnership=instance)
        MoodSetting.objects.create(user=instance.partner, partnership=instance)
