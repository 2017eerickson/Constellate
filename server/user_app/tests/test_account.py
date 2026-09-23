from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from user_app.tests.helpers import create_user, make_expired_jwt


# ---------- Onboarding ----------

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

    def test_expired_token(self):
        """Expired JWT returns 401."""
        self.client.force_authenticate(user=None)
        expired = make_expired_jwt(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired}')
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


# ---------- Me ----------

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

    def test_get_expired_token(self):
        """Expired JWT on GET returns 401."""
        self.client.force_authenticate(user=None)
        expired = make_expired_jwt(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired}')
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_expired_token(self):
        """Expired JWT on DELETE returns 401."""
        self.client.force_authenticate(user=None)
        expired = make_expired_jwt(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired}')
        resp = self.client.delete(self.url, {'password': 'SecurePass123!'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
