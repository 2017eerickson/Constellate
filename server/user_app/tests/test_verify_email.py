from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from user_app.tests.helpers import create_user, make_expired_token, signer


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
