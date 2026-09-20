from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from relationship_app.models import RelationType
from relationship_app.tests.helpers import create_partnership, create_user


class PartnershipListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('partnership-list')
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=self.alice)

    def test_lists_initiated_partnerships(self):
        """User sees partnerships they initiated."""
        create_partnership(self.alice, self.bob)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        partner_ids = [p['partner']['id'] for p in resp.data]
        self.assertIn(self.bob.pk, partner_ids)

    def test_lists_received_partnerships(self):
        """User sees partnerships others initiated with them."""
        create_partnership(self.bob, self.alice)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        initiator_ids = [p['initiator']['id'] for p in resp.data]
        self.assertIn(self.bob.pk, initiator_ids)

    def test_excludes_other_users(self):
        """User does not see partnerships they are not part of."""
        create_partnership(self.bob, self.charlie)
        resp = self.client.get(self.url)
        # Alice should only see her soulmate, not Bob-Charlie
        for p in resp.data:
            self.assertTrue(
                p['initiator']['id'] == self.alice.pk
                or p['partner']['id'] == self.alice.pk,
            )

    def test_soulmate_in_list(self):
        """Soulmate partnership appears in the list."""
        resp = self.client.get(self.url)
        relations = [p['relation'] for p in resp.data]
        self.assertIn(RelationType.SOULMATE, relations)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
