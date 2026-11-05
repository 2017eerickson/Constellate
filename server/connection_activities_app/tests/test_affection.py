from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from connection_activities_app.models import AffectionSending, MoodSetting
from connection_activities_app.models.affection_models import AffectionChoices
from gamification_app.models import StreakActivity

from .helpers import create_active_partnership, create_user


# ---------------------------------------------------------------------------
# POST /api/v1/activities/<partnership_id>/affection/send/
# ---------------------------------------------------------------------------
class SendAffectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('send-affection', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)
        self.partnership.stardust.refresh_from_db()
        self.initial_stardust = self.partnership.stardust.total

    def test_send_success(self):
        """Valid POST creates an AffectionSending and returns 201."""
        resp = self.client.post(self.url, {'type': 'kiss'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['type'], 'kiss')
        self.assertIn('stardust', resp.data)
        self.assertIn('streak', resp.data)

    def test_creates_db_record(self):
        """POST creates a new AffectionSending row in the database."""
        resp = self.client.post(self.url, {'type': 'hug'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            AffectionSending.objects.filter(
                sender=self.alice, partnership=self.partnership, type='hug',
            ).exists()
        )

    def test_defaults_unread(self):
        """Newly sent affection has read=False."""
        resp = self.client.post(self.url, {'type': 'kiss'})
        affection = AffectionSending.objects.get(pk=resp.data['id'])
        self.assertFalse(affection.read)

    def test_awards_stardust(self):
        """Sending an affection awards 10 stardust."""
        resp = self.client.post(self.url, {'type': 'gratitude'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.partnership.stardust.refresh_from_db()
        self.assertEqual(
            self.partnership.stardust.total, self.initial_stardust + 10,
        )

    def test_response_includes_stardust(self):
        """Response body includes updated stardust total."""
        resp = self.client.post(self.url, {'type': 'poke'})
        self.assertEqual(resp.data['stardust'], self.initial_stardust + 10)

    def test_records_streak_activity(self):
        """POST records a StreakActivity for the user."""
        resp = self.client.post(self.url, {'type': 'bite'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            StreakActivity.objects.filter(
                streak=self.partnership.streak, user=self.alice,
            ).exists()
        )

    def test_response_includes_streak(self):
        """Response includes streak data."""
        resp = self.client.post(self.url, {'type': 'tease'})
        streak = resp.data['streak']
        self.assertIn('current_count', streak)
        self.assertIn('longest_count', streak)
        self.assertIn('last_completed_at', streak)

    def test_all_valid_types(self):
        """Every AffectionChoices value is accepted."""
        for i, choice in enumerate(AffectionChoices):
            future = timezone.now() + timedelta(hours=2 * i)
            with patch(
                'connection_activities_app.views.affection_views.timezone.now',
                return_value=future,
            ):
                resp = self.client.post(self.url, {'type': choice.value})
            self.assertEqual(
                resp.status_code, status.HTTP_201_CREATED,
                f'Affection type {choice.value!r} was rejected',
            )

    def test_invalid_type(self):
        """An invalid affection type returns 400."""
        resp = self.client.post(self.url, {'type': 'slap'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_type_field(self):
        """Missing 'type' key returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cooldown_blocks_repeat(self):
        """Second send within 1h11m returns 429."""
        self.client.post(self.url, {'type': 'kiss'})
        resp = self.client.post(self.url, {'type': 'hug'})
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_cooldown_returns_remaining(self):
        """429 response includes remaining_seconds and error message."""
        self.client.post(self.url, {'type': 'kiss'})
        resp = self.client.post(self.url, {'type': 'hug'})
        self.assertEqual(resp.data['error'], 'Cooldown active.')
        self.assertGreater(resp.data['remaining_seconds'], 0)

    def test_send_after_cooldown_expires(self):
        """Sending succeeds after the cooldown period has elapsed."""
        self.client.post(self.url, {'type': 'kiss'})
        future = timezone.now() + timedelta(hours=1, minutes=12)
        with patch(
            'connection_activities_app.views.affection_views.timezone.now',
            return_value=future,
        ):
            resp = self.client.post(self.url, {'type': 'hug'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_cooldown_per_user(self):
        """Cooldown is per-user: bob can send right after alice."""
        self.client.post(self.url, {'type': 'kiss'})
        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self.url, {'type': 'hug'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_cooldown_per_partnership(self):
        """Alice can send in a different partnership during cooldown."""
        self.client.post(self.url, {'type': 'kiss'})
        charlie = create_user(email='charlie@example.com')
        p2 = create_active_partnership(self.alice, charlie)
        url2 = reverse('send-affection', args=[p2.pk])
        resp = self.client.post(url2, {'type': 'hug'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_nonexistent_partnership(self):
        """POST to a non-existent partnership returns 404."""
        url = reverse('send-affection', args=[99999])
        resp = self.client.post(url, {'type': 'kiss'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """POST to a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.post(self.url, {'type': 'kiss'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated POST returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, {'type': 'kiss'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# GET /api/v1/activities/<partnership_id>/affection/
# ---------------------------------------------------------------------------
class RetrieveAffectionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('retrieve-affections', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)

    def test_returns_unread_from_partner(self):
        """GET returns unread affections sent by the partner."""
        AffectionSending.objects.create(
            sender=self.bob, partnership=self.partnership, type='kiss',
        )
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['type'], 'kiss')

    def test_excludes_own_sent(self):
        """GET does not return affections sent BY the authenticated user."""
        AffectionSending.objects.create(
            sender=self.alice, partnership=self.partnership, type='hug',
        )
        resp = self.client.get(self.url)
        self.assertEqual(len(resp.data), 0)

    def test_excludes_read_affections(self):
        """GET does not return already-read affections."""
        AffectionSending.objects.create(
            sender=self.bob, partnership=self.partnership, type='poke',
            read=True,
        )
        resp = self.client.get(self.url)
        self.assertEqual(len(resp.data), 0)

    def test_multiple_unread(self):
        """GET returns all unread partner affections."""
        for t in ('kiss', 'hug', 'poke'):
            AffectionSending.objects.create(
                sender=self.bob, partnership=self.partnership, type=t,
            )
        resp = self.client.get(self.url)
        self.assertEqual(len(resp.data), 3)

    def test_response_fields(self):
        """Each affection has the expected serializer fields."""
        AffectionSending.objects.create(
            sender=self.bob, partnership=self.partnership, type='tease',
        )
        resp = self.client.get(self.url)
        item = resp.data[0]
        for field in ('id', 'sender', 'partnership', 'type', 'read', 'timestamp'):
            self.assertIn(field, item)

    def test_empty_when_none(self):
        """GET returns an empty list when there are no unread affections."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.data, [])

    def test_nonexistent_partnership(self):
        """GET with a non-existent partnership_id returns 404."""
        url = reverse('retrieve-affections', args=[99999])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """GET on a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated GET returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# PUT /api/v1/activities/<partnership_id>/affection/<affection_id>/read/
# ---------------------------------------------------------------------------
class ReadAffectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.client.force_authenticate(user=self.alice)
        # Create an unread affection from bob to alice
        self.affection = AffectionSending.objects.create(
            sender=self.bob, partnership=self.partnership, type='kiss',
        )
        self.url = reverse(
            'read-affection',
            args=[self.partnership.pk, self.affection.pk],
        )

    def test_marks_as_read(self):
        """PUT marks the affection as read."""
        resp = self.client.put(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['read'])
        self.affection.refresh_from_db()
        self.assertTrue(self.affection.read)

    def test_cannot_read_own_sent(self):
        """User cannot mark their own sent affection as read."""
        own = AffectionSending.objects.create(
            sender=self.alice, partnership=self.partnership, type='hug',
        )
        url = reverse('read-affection', args=[self.partnership.pk, own.pk])
        resp = self.client.put(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_already_read(self):
        """PUT on an already-read affection returns 404."""
        self.affection.read = True
        self.affection.save()
        resp = self.client.put(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_wrong_partnership(self):
        """Affection ID from a different partnership returns 404."""
        charlie = create_user(email='charlie@example.com')
        p2 = create_active_partnership(self.alice, charlie)
        url = reverse('read-affection', args=[p2.pk, self.affection.pk])
        resp = self.client.put(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonexistent_affection(self):
        """PUT with a non-existent affection_id returns 404."""
        url = reverse('read-affection', args=[self.partnership.pk, 99999])
        resp = self.client.put(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonexistent_partnership(self):
        """PUT with a non-existent partnership_id returns 404."""
        url = reverse('read-affection', args=[99999, self.affection.pk])
        resp = self.client.put(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """PUT on a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.put(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated PUT returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.put(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# GET /api/v1/activities/<partnership_id>/affection/cooldown/
# ---------------------------------------------------------------------------
class AffectionCooldownTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('affection-cooldown', args=[self.partnership.pk])
        self.send_url = reverse('send-affection', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)

    def test_zero_when_never_sent(self):
        """Returns remaining_seconds=0 when no affection has ever been sent."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['remaining_seconds'], 0)

    def test_active_after_send(self):
        """Returns remaining_seconds > 0 immediately after sending."""
        self.client.post(self.send_url, {'type': 'kiss'})
        resp = self.client.get(self.url)
        self.assertGreater(resp.data['remaining_seconds'], 0)

    def test_zero_after_expiry(self):
        """Returns remaining_seconds=0 after cooldown period has elapsed."""
        self.client.post(self.send_url, {'type': 'kiss'})
        future = timezone.now() + timedelta(hours=1, minutes=12)
        with patch(
            'connection_activities_app.views.affection_views.timezone.now',
            return_value=future,
        ):
            resp = self.client.get(self.url)
        self.assertEqual(resp.data['remaining_seconds'], 0)

    def test_per_user(self):
        """Bob's cooldown is independent of Alice's."""
        self.client.post(self.send_url, {'type': 'kiss'})
        self.client.force_authenticate(user=self.bob)
        resp = self.client.get(self.url)
        self.assertEqual(resp.data['remaining_seconds'], 0)

    def test_nonexistent_partnership(self):
        """GET with a non-existent partnership_id returns 404."""
        url = reverse('affection-cooldown', args=[99999])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """GET on a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated GET returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
