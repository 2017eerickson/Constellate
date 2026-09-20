import secrets
import string

from django.contrib.auth.models import AbstractUser
from django.db import models


def generate_unique_partner_code():
    while True:
        code = ''.join(
            secrets.choice(string.ascii_uppercase + string.digits)
            for _ in range(8)
        )
        if not User.objects.filter(partner_code=code).exists():
            return code


class User(AbstractUser):
    first_name = models.CharField(max_length=30, default=None)
    email = models.EmailField(unique=True, default=None)
    birthday = models.DateField(null=True, blank=True, default=None)
    is_verified = models.BooleanField(default=False)
    partner_code = models.CharField(max_length=8, unique=True, editable=False)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)
    onboarding_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'birthday',]

    def save(self, *args, **kwargs):
        if not self.partner_code:
            self.partner_code = generate_unique_partner_code()
        super().save(*args, **kwargs)
