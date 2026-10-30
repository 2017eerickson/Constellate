from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from connection_activities_app.models import AffectionSending, MoodSetting
from connection_activities_app.models.mood_models import MoodChoices
from gamification_app.models import StreakActivity

from .helpers import create_active_partnership, create_user


# ---------------------------------------------------------------------------
# GET /api/v1/activities/<partnership_id>/mood/
# ---------------------------------------------------------------------------
class SetMoodGetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('set-mood', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)

    def test_get_moods_returns_both_users(self):
        """GET returns mood data for both initiator and partner."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('initiator', resp.data)
        self.assertIn('partner', resp.data)
        for key in ('user', 'mood', 'timestamp'):
            self.assertIn(key, resp.data['initiator'])
            self.assertIn(key, resp.data['partner'])

    def test_get_moods_default_happy(self):
        """Default mood is 'happy' for both users."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.data['initiator']['mood'], 'happy')
        self.assertEqual(resp.data['partner']['mood'], 'happy')

    def test_get_moods_reflects_latest_after_post(self):
        """After setting a mood, GET reflects the new value."""
        self.client.post(self.url, {'mood': 'excited'})
        resp = self.client.get(self.url)
        user_moods = {
            resp.data['initiator']['user']: resp.data['initiator']['mood'],
            resp.data['partner']['user']: resp.data['partner']['mood'],
        }
        self.assertEqual(user_moods[self.alice.pk], 'excited')

    def test_get_moods_partner_can_read(self):
        """The partner can also GET moods for the shared partnership."""
        self.client.force_authenticate(user=self.bob)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_get_moods_nonexistent_partnership(self):
        """GET with a non-existent partnership_id returns 404."""
        url = reverse('set-mood', args=[99999])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_moods_not_member(self):
        """GET on a partnership the user does not belong to returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_moods_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# POST /api/v1/activities/<partnership_id>/mood/
# ---------------------------------------------------------------------------
class SetMoodPostTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('set-mood', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)
        self.partnership.stardust.refresh_from_db()
        self.initial_stardust = self.partnership.stardust.total

    def test_set_mood_success(self):
        """Valid POST creates a MoodSetting and returns 201 with stardust & streak."""
        resp = self.client.post(self.url, {'mood': 'excited'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['mood'], 'excited')
        self.assertIn('stardust', resp.data)
        self.assertIn('streak', resp.data)

    def test_set_mood_creates_db_record(self):
        """POST creates a new MoodSetting row in the database."""
        resp = self.client.post(self.url, {'mood': 'calm'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            MoodSetting.objects.filter(
                user=self.alice, partnership=self.partnership, mood='calm',
            ).exists()
        )

    def test_set_mood_awards_stardust(self):
        """Setting a mood awards 5 stardust to the partnership."""
        resp = self.client.post(self.url, {'mood': 'loved'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.partnership.stardust.refresh_from_db()
        self.assertEqual(
            self.partnership.stardust.total, self.initial_stardust + 5,
        )

    def test_set_mood_records_streak_activity(self):
        """POST records a StreakActivity for the user."""
        resp = self.client.post(self.url, {'mood': 'grateful'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            StreakActivity.objects.filter(
                streak=self.partnership.streak, user=self.alice,
            ).exists()
        )

    def test_set_mood_response_includes_streak(self):
        """Response includes streak data."""
        resp = self.client.post(self.url, {'mood': 'happy'})
        streak = resp.data['streak']
        self.assertIn('current_count', streak)
        self.assertIn('longest_count', streak)
        self.assertIn('last_completed_at', streak)

    def test_set_mood_all_valid_choices(self):
        """Every MoodChoices value is accepted."""
        for choice in MoodChoices:
            resp = self.client.post(self.url, {'mood': choice.value})
            self.assertEqual(
                resp.status_code, status.HTTP_201_CREATED,
                f'Mood {choice.value!r} was rejected',
            )

    def test_set_mood_invalid_choice(self):
        """An invalid mood string returns 400."""
        resp = self.client.post(self.url, {'mood': 'angry'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_mood_missing_field(self):
        """Missing 'mood' key returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_mood_nonexistent_partnership(self):
        """POST to a non-existent partnership returns 404."""
        url = reverse('set-mood', args=[99999])
        resp = self.client.post(url, {'mood': 'happy'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_set_mood_not_member(self):
        """POST to a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.post(self.url, {'mood': 'happy'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_set_mood_unauthenticated(self):
        """Unauthenticated POST returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, {'mood': 'happy'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_set_mood_new_mood_unseen(self):
        """Newly created MoodSetting defaults to seen=False."""
        resp = self.client.post(self.url, {'mood': 'tired'})
        mood = MoodSetting.objects.get(pk=resp.data['id'])
        self.assertFalse(mood.seen)


# ---------------------------------------------------------------------------
# PATCH /api/v1/activities/<partnership_id>/mood/read/
# ---------------------------------------------------------------------------
class ReadMoodTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('read-mood', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)
        # Mark all existing signal-created moods as seen so they don't affect counts
        MoodSetting.objects.filter(partnership=self.partnership).update(seen=True)

    def test_marks_partner_moods_as_seen(self):
        """PATCH marks unseen moods from the partner as seen."""
        mood = MoodSetting.objects.create(
            user=self.bob, partnership=self.partnership, mood='sad',
        )
        resp = self.client.patch(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['marked'], 1)
        mood.refresh_from_db()
        self.assertTrue(mood.seen)

    def test_does_not_mark_own_moods(self):
        """PATCH does not mark the requesting user's own unseen moods."""
        own_mood = MoodSetting.objects.create(
            user=self.alice, partnership=self.partnership, mood='anxious',
        )
        resp = self.client.patch(self.url)
        self.assertEqual(resp.data['marked'], 0)
        own_mood.refresh_from_db()
        self.assertFalse(own_mood.seen)

    def test_already_seen_not_counted(self):
        """Already-seen moods are not counted in the response."""
        MoodSetting.objects.create(
            user=self.bob, partnership=self.partnership, mood='calm', seen=True,
        )
        resp = self.client.patch(self.url)
        self.assertEqual(resp.data['marked'], 0)

    def test_nonexistent_partnership(self):
        """PATCH with a non-existent partnership_id returns 404."""
        url = reverse('read-mood', args=[99999])
        resp = self.client.patch(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """PATCH on a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.patch(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated PATCH returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.patch(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# GET /api/v1/activities/unread-counts/
# ---------------------------------------------------------------------------
class UnreadCountsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('unread-counts')
        self.client.force_authenticate(user=self.alice)
        # Mark all signal-created moods as seen so baseline is clean
        MoodSetting.objects.filter(partnership=self.partnership).update(seen=True)

    def test_counts_unread_affections(self):
        """Unread affections from partner appear in counts."""
        AffectionSending.objects.create(
            sender=self.bob, partnership=self.partnership, type='kiss',
        )
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pid = str(self.partnership.pk)
        self.assertEqual(resp.data[pid]['affections'], 1)

    def test_counts_unread_moods(self):
        """Unseen moods from partner appear in counts."""
        MoodSetting.objects.create(
            user=self.bob, partnership=self.partnership, mood='excited',
        )
        resp = self.client.get(self.url)
        pid = str(self.partnership.pk)
        self.assertEqual(resp.data[pid]['moods'], 1)

    def test_excludes_own_items(self):
        """User's own sent affections and moods are not counted."""
        AffectionSending.objects.create(
            sender=self.alice, partnership=self.partnership, type='hug',
        )
        MoodSetting.objects.create(
            user=self.alice, partnership=self.partnership, mood='stressed',
        )
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pid = str(self.partnership.pk)
        self.assertNotIn(pid, resp.data)

    def test_zero_counts_omitted(self):
        """Partnerships with zero unread items are not in the response."""
        resp = self.client.get(self.url)
        pid = str(self.partnership.pk)
        self.assertNotIn(pid, resp.data)

    def test_multiple_partnerships(self):
        """Counts are returned per-partnership."""
        charlie = create_user(email='charlie@example.com')
        p2 = create_active_partnership(self.alice, charlie)
        MoodSetting.objects.filter(partnership=p2).update(seen=True)
        AffectionSending.objects.create(
            sender=self.bob, partnership=self.partnership, type='poke',
        )
        AffectionSending.objects.create(
            sender=charlie, partnership=p2, type='bite',
        )
        resp = self.client.get(self.url)
        self.assertIn(str(self.partnership.pk), resp.data)
        self.assertIn(str(p2.pk), resp.data)

    def test_unauthenticated(self):
        """Unauthenticated GET returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
