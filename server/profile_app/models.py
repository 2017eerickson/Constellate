from django.conf import settings
from django.db import models


class RelationshipStyle(models.TextChoices):
    HIERARCHICAL = 'hierarchical'
    NON_HIERARCHICAL = 'non_hierarchical'
    RELATIONSHIP_ANARCHY = 'relationship_anarchy'
    PARALLEL = 'parallel'
    OTHER = 'other'


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    relationship_style = models.CharField(
        max_length=30,
        choices=RelationshipStyle.choices,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
