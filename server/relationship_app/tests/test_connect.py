from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from relationship_app.models import Partnership, PartnershipStatus
from relationship_app.tests.helpers import create_partnership, create_user


class ConnectTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('partnership-connect')
        self.user = create_user(email='alice@example.com')
        self.partner = create_user(email='bob@example.com')
        self.client.force_authenticate(user=self.user)

    def test_success(self):
        """Valid partner code creates a pending partnership."""
        resp = self.client.post(self.url, {'partner_code': self.partner.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], PartnershipStatus.PENDING)
        self.assertTrue(
            Partnership.objects.filter(
                initiator=self.user, partner=self.partner,
            ).exists(),
        )

    def test_self_connect(self):
        """Cannot connect with yourself."""
        resp = self.client.post(self.url, {'partner_code': self.user.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_partner_code(self):
        """Non-existent partner code returns 404."""
        resp = self.client.post(self.url, {'partner_code': 'ZZZZZZZZ'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_duplicate_partnership(self):
        """Cannot create a second partnership with the same user."""
        create_partnership(self.user, self.partner)
        resp = self.client.post(self.url, {'partner_code': self.partner.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_duplicate_reverse_direction(self):
        """Conflict even if the other user initiated first."""
        create_partnership(self.partner, self.user)
        resp = self.client.post(self.url, {'partner_code': self.partner.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_can_reconnect_after_ended(self):
        """Reconnecting after an ended partnership reactivates the existing row."""
        ended = create_partnership(
            self.user, self.partner, status=PartnershipStatus.ENDED,
        )
        resp = self.client.post(self.url, {'partner_code': self.partner.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        ended.refresh_from_db()
        self.assertEqual(ended.status, PartnershipStatus.PENDING)
        self.assertIsNone(ended.ended_at)

    def test_reconnect_reverse_direction(self):
        """Reconnecting swaps initiator/partner to the new requester."""
        ended = create_partnership(
            self.partner, self.user, status=PartnershipStatus.ENDED,
        )
        resp = self.client.post(self.url, {'partner_code': self.partner.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        ended.refresh_from_db()
        self.assertEqual(ended.initiator, self.user)
        self.assertEqual(ended.partner, self.partner)
        self.assertEqual(ended.status, PartnershipStatus.PENDING)

    def test_missing_partner_code(self):
        """Missing partner_code returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, {'partner_code': self.partner.partner_code})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
