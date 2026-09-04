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
    email = models.EmailField(unique=True)
    birthday = models.DateField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    partner_code = models.CharField(max_length=8, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def save(self, *args, **kwargs):
        if not self.partner_code:
            self.partner_code = generate_unique_partner_code()
        super().save(*args, **kwargs)
