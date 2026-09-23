from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from relationship_app.models import Partnership, PartnershipStatus, RelationType
from relationship_app.tests.helpers import create_partnership, create_user


class PartnershipDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.charlie = create_user(email='charlie@example.com')
        self.partnership = create_partnership(self.alice, self.bob)
        self.client.force_authenticate(user=self.alice)

    def _url(self, pk):
        return reverse('partnership-detail', args=[pk])

    # ---------- GET ----------

    def test_retrieve_own(self):
        """Can retrieve a partnership you belong to."""
        resp = self.client.get(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], self.partnership.pk)

    def test_cannot_retrieve_others(self):
        """Cannot access a partnership you are not part of."""
        other = create_partnership(self.bob, self.charlie)
        resp = self.client.get(self._url(other.pk))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---------- PATCH ----------

    def test_accept_as_recipient(self):
        """Recipient can accept a pending partnership."""
        self.client.force_authenticate(user=self.bob)
        resp = self.client.patch(
            self._url(self.partnership.pk),
            {'status': 'active'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.ACTIVE)

    def test_initiator_cannot_accept(self):
        """Initiator cannot accept their own pending request — status stays pending."""
        resp = self.client.patch(
            self._url(self.partnership.pk),
            {'status': 'active'},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.PENDING)

    def test_update_relation(self):
        """Can update the relation label."""
        self.client.force_authenticate(user=self.bob)
        resp = self.client.patch(
            self._url(self.partnership.pk),
            {'relation': 'platonic'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.relation, 'platonic')

    def test_end_partnership_sets_ended_at(self):
        """Setting status to ended populates ended_at."""
        self.partnership.status = PartnershipStatus.ACTIVE
        self.partnership.save()
        resp = self.client.patch(
            self._url(self.partnership.pk),
            {'status': 'ended'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.ENDED)
        self.assertIsNotNone(self.partnership.ended_at)

    def test_pause_partnership(self):
        """Can pause an active partnership."""
        self.partnership.status = PartnershipStatus.ACTIVE
        self.partnership.save()
        resp = self.client.patch(
            self._url(self.partnership.pk),
            {'status': 'paused'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.PAUSED)

    def test_update_status_and_relation_together(self):
        """PATCH with both status and relation updates both fields."""
        self.client.force_authenticate(user=self.bob)
        resp = self.client.patch(
            self._url(self.partnership.pk),
            {'status': 'active', 'relation': 'metamour'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.ACTIVE)
        self.assertEqual(self.partnership.relation, 'metamour')

    # ---------- DELETE ----------

    def test_delete_pending_hard_deletes(self):
        """Deleting a pending partnership removes it from the database."""
        pk = self.partnership.pk
        resp = self.client.delete(self._url(pk))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Partnership.objects.filter(pk=pk).exists())

    def test_delete_active_soft_deletes(self):
        """Deleting an active partnership sets status to ended."""
        self.partnership.status = PartnershipStatus.ACTIVE
        self.partnership.save()
        resp = self.client.delete(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.ENDED)
        self.assertIsNotNone(self.partnership.ended_at)

    def test_delete_active_as_recipient(self):
        """Recipient can also soft-delete an active partnership."""
        self.partnership.status = PartnershipStatus.ACTIVE
        self.partnership.save()
        self.client.force_authenticate(user=self.bob)
        resp = self.client.delete(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.ENDED)
        self.assertIsNotNone(self.partnership.ended_at)

    def test_delete_paused_soft_deletes(self):
        """Deleting a paused partnership sets status to ended."""
        self.partnership.status = PartnershipStatus.PAUSED
        self.partnership.save()
        resp = self.client.delete(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.status, PartnershipStatus.ENDED)
        self.assertIsNotNone(self.partnership.ended_at)

    def test_delete_already_ended_preserves_ended_at(self):
        """Deleting an already-ended partnership does not overwrite ended_at."""
        self.partnership.status = PartnershipStatus.ENDED
        self.partnership.ended_at = timezone.now() - timedelta(days=7)
        self.partnership.save()
        original_ended_at = self.partnership.ended_at
        resp = self.client.delete(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.partnership.refresh_from_db()
        self.assertEqual(self.partnership.ended_at, original_ended_at)

    def test_patch_empty_body(self):
        """PATCH with no fields to update returns 400."""
        self.partnership.status = PartnershipStatus.ACTIVE
        self.partnership.save()
        resp = self.client.patch(self._url(self.partnership.pk), {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ---------- Soulmate ----------

    def test_can_retrieve_soulmate(self):
        """User can view their soulmate partnership."""
        soulmate = Partnership.objects.get(
            initiator=self.alice, relation=RelationType.SOULMATE,
        )
        resp = self.client.get(self._url(soulmate.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['relation'], RelationType.SOULMATE)

    def test_cannot_update_soulmate(self):
        """Cannot modify a soulmate partnership — relation stays unchanged."""
        soulmate = Partnership.objects.get(
            initiator=self.alice, relation=RelationType.SOULMATE,
        )
        resp = self.client.patch(self._url(soulmate.pk), {'status': 'ended'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        soulmate.refresh_from_db()
        self.assertEqual(soulmate.relation, RelationType.SOULMATE)
        self.assertNotEqual(soulmate.status, PartnershipStatus.ENDED)

    def test_cannot_delete_soulmate(self):
        """Cannot delete a soulmate partnership — still exists in DB."""
        soulmate = Partnership.objects.get(
            initiator=self.alice, relation=RelationType.SOULMATE,
        )
        resp = self.client.delete(self._url(soulmate.pk))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Partnership.objects.filter(pk=soulmate.pk).exists())
