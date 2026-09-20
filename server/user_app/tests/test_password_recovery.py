from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from user_app.tests.helpers import create_user, make_expired_token, signer


# ---------- Forgot Password ----------

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ForgotPasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('forgot-password')
        self.user = create_user()
        cache.clear()

    def test_success(self):
        """Existing email user gets generic message and reset email contains a valid link."""
        resp = self.client.post(self.url, {'email': 'testing@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn('/reset-password/', body)
        self.assertRegex(body, r'/reset-password/[0-9a-f]+/')

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
        self.client.post(self.url, {'email': 'testing@example.com'})
        resp = self.client.post(self.url, {'email': 'testing@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_missing_email(self):
        """Missing email field returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------- Reset Password ----------

class ResetPasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('reset-password')
        self.user = create_user()

    def _make_token(self):
        hash_prefix = self.user.password[-8:]
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
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Xk9$mPqR2vLw!'))

    def test_expired_token(self):
        """Token older than 1 hour is rejected."""
        hash_prefix = self.user.password[-8:]
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
