from django.db import models

from relationship_app.models import Partnership


def get_partnership(user, partnership_id):
    return Partnership.objects.filter(
        models.Q(initiator=user) | models.Q(partner=user),
        pk=partnership_id,
    ).first()
