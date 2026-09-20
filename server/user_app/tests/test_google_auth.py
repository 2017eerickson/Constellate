from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from user_app.models import User
from user_app.tests.helpers import create_user


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
