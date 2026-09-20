from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from user_app.tests.helpers import create_user


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
