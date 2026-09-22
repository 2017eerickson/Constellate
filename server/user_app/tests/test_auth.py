from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from user_app.models import User
from user_app.tests.helpers import create_user


# ---------- Register ----------

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('register')
        self.valid_data = {
            'email': 'new@example.com',
            'first_name': 'New',
            'password': 'testing',
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
        """Registration sends a verification email with a valid link."""
        self.client.post(self.url, self.valid_data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Verify', mail.outbox[0].subject)
        body = mail.outbox[0].body
        self.assertIn('/verify-email/', body)
        self.assertRegex(body, r'/verify-email/[0-9a-f]+/')


# ---------- Login ----------

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


# ---------- Logout ----------

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
