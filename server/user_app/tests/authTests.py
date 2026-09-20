from unittest.mock import patch
import time as time_module

from django.core import mail
from django.core.cache import cache
from django.core.signing import TimestampSigner
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from user_app.models import User


signer = TimestampSigner()


def create_user(email='testing@example.com', password='SecurePass123!', **kwargs):
    defaults = {'username': email, 'first_name': 'Test', 'is_verified': True}
    defaults.update(kwargs)
    return User.objects.create_user(email=email, password=password, **defaults)


def make_expired_token(value, max_age):
    """Sign a value as if it were signed max_age+1 seconds ago."""
    past = time_module.time() - max_age - 1
    with patch('django.core.signing.time.time', return_value=past):
        signed = signer.sign(value)
    return signed.encode().hex()


# ---------- 1. Register ----------

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('register')
        self.valid_data = {
            'email': 'new@example.com',
            'first_name': 'New',
            'password': 'SecurePass123!',
        }

    def test_success(self):
        """Valid data returns 201 with JWT pair and user."""
        resp = self.client.post(self.url, self.valid_data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertTrue(resp.data['is_new_user'])

    def test_duplicate_email(self):
        """Duplicate email returns 400 because email must be unique."""
        create_user(email='new@example.com')
        resp = self.client.post(self.url, self.valid_data)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields(self):
        """Missing required fields returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password(self):
        """Weak password is rejected by Django validators."""
        resp = self.client.post(self.url, {**self.valid_data, 'password': '123'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_partner_code_generated(self):
        """New user gets an auto-generated 8-char partner_code."""
        self.client.post(self.url, self.valid_data)
        user = User.objects.get(email='new@example.com')
        self.assertEqual(len(user.partner_code), 8)

    def test_verification_email_sent(self):
        """Registration sends a verification email."""
        self.client.post(self.url, self.valid_data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Verify', mail.outbox[0].subject)


# ---------- 2. Login ----------

class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('login')
        self.user = create_user()

    def test_success(self):
        """Correct credentials return 200 with JWT pair."""
        resp = self.client.post(self.url, {
            'email': 'testing@example.com', 'password': 'SecurePass123!',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_wrong_password(self):
        """Wrong password returns 401 with generic error."""
        resp = self.client.post(self.url, {
            'email': 'testing@example.com', 'password': 'wrong',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_email(self):
        """Non-existent email returns same 401 to prevent enumeration."""
        resp = self.client.post(self.url, {
            'email': 'nobody@example.com', 'password': 'whatever',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user(self):
        """Deactivated user cannot log in."""
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        resp = self.client.post(self.url, {
            'email': 'testing@example.com', 'password': 'SecurePass123!',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_fields(self):
        """Missing credentials returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------- 3. Verify Email ----------

class VerifyEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = create_user(is_verified=False)

    def _make_token(self):
        signed = signer.sign(str(self.user.pk))
        return signed.encode().hex()

    def test_success(self):
        """Valid token verifies the user's email."""
        resp = self.client.get(reverse('verify-email', args=[self._make_token()]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_already_verified(self):
        """Already-verified user gets idempotent success message."""
        self.user.is_verified = True
        self.user.save(update_fields=['is_verified'])
        resp = self.client.get(reverse('verify-email', args=[self._make_token()]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('already', resp.data['message'].lower())

    def test_expired_token(self):
        """Token older than 24 hours is rejected."""
        token = make_expired_token(str(self.user.pk), max_age=86400)
        resp = self.client.get(reverse('verify-email', args=[token]))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_token(self):
        """Tampered token is rejected."""
        resp = self.client.get(reverse('verify-email', args=['aabbccdd']))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_user(self):
        """Token for deleted user returns 404."""
        token = self._make_token()
        self.user.delete()
        resp = self.client.get(reverse('verify-email', args=[token]))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ---------- 4. Google Auth ----------

@patch('user_app.views.google.google_id_token.verify_oauth2_token')
class GoogleAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('google-auth')
        self.google_payload = {
            'sub': 'google-123',
            'email': 'google@example.com',
            'given_name': 'Googler',
        }

    def test_new_user(self, mock_verify):
        """Valid Google token creates a new user with is_new_user=True."""
        mock_verify.return_value = self.google_payload
        resp = self.client.post(self.url, {'id_token': 'valid-token'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_new_user'])
        self.assertTrue(User.objects.filter(google_sub='google-123').exists())

    def test_returning_user(self, mock_verify):
        """Returning Google user gets is_new_user=False, no duplicate created."""
        create_user(email='google@example.com', google_sub='google-123')
        mock_verify.return_value = self.google_payload
        resp = self.client.post(self.url, {'id_token': 'valid-token'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['is_new_user'])
        self.assertEqual(User.objects.filter(google_sub='google-123').count(), 1)

    def test_invalid_token(self, mock_verify):
        """Invalid Google token returns 401."""
        mock_verify.side_effect = ValueError('Invalid token')
        resp = self.client.post(self.url, {'id_token': 'bad-token'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_email_updated(self, mock_verify):
        """If Google email changes, the stored email is updated."""
        user = create_user(email='old@example.com', google_sub='google-123')
        self.google_payload['email'] = 'new@example.com'
        mock_verify.return_value = self.google_payload
        self.client.post(self.url, {'id_token': 'valid-token'})
        user.refresh_from_db()
        self.assertEqual(user.email, 'new@example.com')

    def test_missing_id_token(self, mock_verify):
        """Missing id_token field returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------- 5. Onboarding ----------

class OnboardingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('onboarding')
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_success(self):
        """Valid birthday completes onboarding."""
        resp = self.client.post(self.url, {'birthday': '1995-06-15'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.onboarding_complete)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, {'birthday': '1995-06-15'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_date(self):
        """Invalid date format returns 400."""
        resp = self.client.post(self.url, {'birthday': 'not-a-date'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_birthday(self):
        """Missing birthday field returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------- 6. Logout ----------

class LogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('logout')
        self.user = create_user()
        self.client.force_authenticate(user=self.user)
        self.refresh = str(RefreshToken.for_user(self.user))

    def test_success(self):
        """Valid refresh token is blacklisted, returns 205."""
        resp = self.client.post(self.url, {'refresh': self.refresh})
        self.assertEqual(resp.status_code, status.HTTP_205_RESET_CONTENT)

    def test_missing_refresh(self):
        """Missing refresh token returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_blacklisted(self):
        """Using an already-blacklisted token returns 400."""
        self.client.post(self.url, {'refresh': self.refresh})
        resp = self.client.post(self.url, {'refresh': self.refresh})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, {'refresh': self.refresh})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------- 7. Me ----------

class MeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('me')
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_get_success(self):
        """Authenticated GET returns current user data."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['user']['email'], 'testing@example.com')

    def test_get_unauthenticated(self):
        """Unauthenticated GET returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_success(self):
        """Correct password soft-deletes the account."""
        resp = self.client.delete(self.url, {'password': 'SecurePass123!'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_delete_wrong_password(self):
        """Wrong password returns 403 to prevent unauthorized deletion."""
        resp = self.client.delete(self.url, {'password': 'wrong'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_missing_password(self):
        """Missing password returns 400."""
        resp = self.client.delete(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_unauthenticated(self):
        """Unauthenticated DELETE returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.delete(self.url, {'password': 'SecurePass123!'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------- 8. Forgot Password ----------

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ForgotPasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('forgot-password')
        self.user = create_user()
        cache.clear()

    def test_success(self):
        """Existing email user gets generic message and reset email is sent."""
        resp = self.client.post(self.url, {'email': 'testing@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_nonexistent_email(self):
        """Non-existent email gets same generic message, no email sent."""
        resp = self.client.post(self.url, {'email': 'nobody@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_google_sso_user(self):
        """Google SSO user gets same generic message, no email sent."""
        self.user.google_sub = 'google-123'
        self.user.save(update_fields=['google_sub'])
        resp = self.client.post(self.url, {'email': 'testing@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_user(self):
        """Inactive user gets same generic message, no email sent."""
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        resp = self.client.post(self.url, {'email': 'testing@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_throttle(self):
        """Second request for same email within a day returns 429."""
        self.client.post(self.url, {'email': 'test@example.com'})
        resp = self.client.post(self.url, {'email': 'testing@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_missing_email(self):
        """Missing email field returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------- 9. Reset Password ----------

class ResetPasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('reset-password')
        self.user = create_user()

    def _make_token(self):
        hash_prefix = self.user.password[:8]
        signed = signer.sign(f'{self.user.pk}:{hash_prefix}')
        return signed.encode().hex()

    def test_success(self):
        """Valid token and strong password resets the password."""
        token = self._make_token()
        resp = self.client.post(self.url, {
            'token': token, 'new_password': 'NewSecure456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewSecure456!'))

    def test_token_reuse(self):
        """Same token used twice fails because password hash changed."""
        token = self._make_token()
        first = self.client.post(self.url, {
            'token': token, 'new_password': 'Xk9$mPqR2vLw!',
        })
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        resp = self.client.post(self.url, {
            'token': token, 'new_password': 'Yt7#nJsQ4wMx!',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already been used', resp.data['error'])

    def test_expired_token(self):
        """Token older than 1 hour is rejected."""
        hash_prefix = self.user.password[:8]
        token = make_expired_token(
            f'{self.user.pk}:{hash_prefix}', max_age=3600,
        )
        resp = self.client.post(self.url, {
            'token': token, 'new_password': 'NewSecure456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tampered_token(self):
        """Tampered token is rejected."""
        resp = self.client.post(self.url, {
            'token': 'abcdef1234', 'new_password': 'NewSecure456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password(self):
        """Weak new password is rejected by Django validators."""
        token = self._make_token()
        resp = self.client.post(self.url, {
            'token': token, 'new_password': '123',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_user(self):
        """Token for inactive user returns 404."""
        token = self._make_token()
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        resp = self.client.post(self.url, {
            'token': token, 'new_password': 'NewSecure456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_fields(self):
        """Missing token or password returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------- 10. Admin Delete User ----------

class AdminDeleteUserTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = create_user(email='admin@example.com', is_staff=True)
        self.target = create_user(email='target@example.com')
        self.client.force_authenticate(user=self.admin)

    def _url(self, user_id):
        return reverse('admin-delete-user', args=[user_id])

    def test_success(self):
        """Admin deactivates an active user."""
        resp = self.client.delete(self._url(self.target.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_already_deactivated(self):
        """Deactivating an already-inactive user returns idempotent message."""
        self.target.is_active = False
        self.target.save(update_fields=['is_active'])
        resp = self.client.delete(self._url(self.target.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('already', resp.data['message'].lower())

    def test_non_admin(self):
        """Non-admin user gets 403."""
        self.client.force_authenticate(user=self.target)
        resp = self.client.delete(self._url(self.target.pk))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.delete(self._url(self.target.pk))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user(self):
        """Non-existent user_id returns 404."""
        resp = self.client.delete(self._url(99999))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)