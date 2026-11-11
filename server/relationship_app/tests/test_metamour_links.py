from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from relationship_app.models import PartnershipStatus
from relationship_app.tests.helpers import create_partnership, create_user


class MetamourLinksTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('metamour-links')
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.charlie = create_user(email='charlie@example.com')
        self.diana = create_user(email='diana@example.com')
        self.client.force_authenticate(user=self.alice)

    # --- Happy path ---

    def test_returns_metamour_link(self):
        """Two of the user's active partners who are also partnered show as a link."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ACTIVE)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        pair = resp.data[0]
        self.assertEqual(set(pair), {self.bob.pk, self.charlie.pk})

    def test_multiple_metamour_links(self):
        """Multiple cross-partner connections are all returned."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.diana, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.charlie, self.diana, status=PartnershipStatus.ACTIVE)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)
        pairs = [set(p) for p in resp.data]
        self.assertIn({self.bob.pk, self.charlie.pk}, pairs)
        self.assertIn({self.charlie.pk, self.diana.pk}, pairs)

    # --- Unhappy path ---

    def test_partners_not_connected(self):
        """Partners who are not partnered with each other return empty list."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        # Bob and Charlie are NOT partnered
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_no_partners(self):
        """User with no partners (only soulmate) returns empty list."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_only_one_partner(self):
        """User with only one partner returns empty list."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    # --- Auth ---

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_different_user_sees_own_links(self):
        """Each user only sees metamour links for their own partners."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ACTIVE)
        # Diana has no connection to any of them
        self.client.force_authenticate(user=self.diana)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    # --- Excluded statuses ---

    def test_excludes_paused_cross_partnership(self):
        """Paused partnership between partners is not returned."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.PAUSED)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_excludes_ended_cross_partnership(self):
        """Ended partnership between partners is not returned."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ENDED)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_excludes_pending_cross_partnership(self):
        """Pending partnership between partners is not returned."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.PENDING)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_excludes_paused_user_partnership(self):
        """If user's own partnership is paused, that partner is excluded."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.PAUSED)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ACTIVE)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_excludes_soulmate(self):
        """Soulmate partnerships are never included in metamour links."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ACTIVE,
                           relation='soulmate')
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    # --- No duplicates ---

    def test_no_duplicate_pairs(self):
        """Each metamour pair appears only once."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        create_partnership(self.bob, self.charlie, status=PartnershipStatus.ACTIVE)
        resp = self.client.get(self.url)
        pairs = [tuple(sorted(p)) for p in resp.data]
        self.assertEqual(len(pairs), len(set(pairs)))

    # --- Direction doesn't matter ---

    def test_finds_link_regardless_of_initiator_direction(self):
        """Works whether B initiated to C or C initiated to B."""
        create_partnership(self.alice, self.bob, status=PartnershipStatus.ACTIVE)
        create_partnership(self.alice, self.charlie, status=PartnershipStatus.ACTIVE)
        # Charlie initiated to Bob (reversed direction)
        create_partnership(self.charlie, self.bob, status=PartnershipStatus.ACTIVE)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(set(resp.data[0]), {self.bob.pk, self.charlie.pk})
