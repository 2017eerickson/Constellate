from datetime import timedelta
from unittest.mock import patch
import time as time_module

from django.core.signing import TimestampSigner
from rest_framework_simplejwt.tokens import AccessToken

from user_app.models import User

signer = TimestampSigner()


def create_user(email='testing@example.com', password='SecurePass123!', **kwargs):
    defaults = {'username': email, 'first_name': 'Test', 'is_verified': True}
    defaults.update(kwargs)
    return User.objects.create_user(email=email, password=password, **defaults)


def make_expired_jwt(user):
    """Create a JWT access token that is already expired."""
    token = AccessToken.for_user(user)
    token.set_exp(lifetime=-timedelta(seconds=1))
    return str(token)


def make_expired_token(value, max_age):
    """Sign a value as if it were signed max_age+1 seconds ago."""
    past = time_module.time() - max_age - 1
    with patch('django.core.signing.time.time', return_value=past):
        signed = signer.sign(value)
    return signed.encode().hex()
