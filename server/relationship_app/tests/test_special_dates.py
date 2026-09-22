from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from relationship_app.models import PartnershipStatus, SpecialDate
from relationship_app.tests.helpers import create_partnership, create_user
from relationship_app.views import create_default_special_dates


class DefaultSpecialDateTests(TestCase):
    """Tests for auto-creation of special dates when a partnership is accepted."""

    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(
            email='alice@example.com', first_name='Alice',
            birthday=date(1995, 3, 10),
        )
        self.bob = create_user(
            email='bob@example.com', first_name='Bob',
            birthday=date(1993, 7, 22),
        )
        self.partnership = create_partnership(
            self.alice, self.bob, status=PartnershipStatus.PENDING,
        )
        self.partnership.anniversary = date(2022, 12, 25)
        self.partnership.save()

    def _accept(self):
        """Accept the partnership as the recipient (bob)."""
        self.client.force_authenticate(user=self.bob)
        url = reverse('partnership-detail', args=[self.partnership.pk])
        return self.client.patch(url, {'status': 'active'})

    def test_accepting_creates_default_dates(self):
        """Accepting a pending partnership creates anniversary + birthday special dates."""
        resp = self._accept()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        dates = self.partnership.special_dates.order_by('title')
        titles = list(dates.values_list('title', flat=True))
        self.assertIn('Anniversary', titles)
        self.assertIn("Alice's Birthday", titles)
        self.assertIn("Bob's Birthday", titles)
        self.assertEqual(dates.count(), 3)

    def test_anniversary_defaults_to_today(self):
        """If no anniversary was set, the default special date uses today's date."""
        self.partnership.anniversary = None
        self.partnership.save()
        self._accept()
        anniv = self.partnership.special_dates.get(title='Anniversary')
        self.assertEqual(anniv.date, date.today())

    def test_birthday_skipped_when_null(self):
        """Users without birthdays do not get a birthday special date."""
        self.bob.birthday = None
        self.bob.save()
        self._accept()
        titles = list(
            self.partnership.special_dates.values_list('title', flat=True),
        )
        self.assertIn("Alice's Birthday", titles)
        self.assertNotIn("Bob's Birthday", titles)
        self.assertEqual(self.partnership.special_dates.count(), 2)

    def test_both_birthdays_created(self):
        """Both initiator and partner birthdays are created when present."""
        self._accept()
        alice_bday = self.partnership.special_dates.get(title="Alice's Birthday")
        bob_bday = self.partnership.special_dates.get(title="Bob's Birthday")
        self.assertEqual(alice_bday.date, date(1995, 3, 10))
        self.assertEqual(bob_bday.date, date(1993, 7, 22))

    def test_no_birthdays_creates_only_anniversary(self):
        """When neither user has a birthday, only the anniversary is created."""
        self.alice.birthday = None
        self.alice.save()
        self.bob.birthday = None
        self.bob.save()
        self._accept()
        self.assertEqual(self.partnership.special_dates.count(), 1)
        self.assertEqual(
            self.partnership.special_dates.first().title, 'Anniversary',
        )


class SpecialDateListCreateTests(TestCase):
    """Tests for GET/POST /api/v1/relationships/<id>/special-dates/"""

    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.charlie = create_user(email='charlie@example.com')
        self.partnership = create_partnership(
            self.alice, self.bob, status=PartnershipStatus.ACTIVE,
        )
        self.client.force_authenticate(user=self.alice)

    def _url(self, partnership_id):
        return reverse('special-date-list', args=[partnership_id])

    def test_list_special_dates(self):
        """GET returns all special dates with correct titles and dates."""
        SpecialDate.objects.create(
            partnership=self.partnership, title='Anniversary', date=date(2022, 12, 25),
        )
        SpecialDate.objects.create(
            partnership=self.partnership, title='First Trip', date=date(2023, 5, 1),
        )
        resp = self.client.get(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)
        titles = [d['title'] for d in resp.data]
        self.assertIn('Anniversary', titles)
        self.assertIn('First Trip', titles)

    def test_create_custom_special_date(self):
        """POST creates a new special date linked to the correct partnership."""
        resp = self.client.post(self._url(self.partnership.pk), {
            'title': 'First Date',
            'date': '2023-02-14',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['title'], 'First Date')
        self.assertEqual(resp.data['date'], '2023-02-14')
        sd = SpecialDate.objects.get(
            partnership=self.partnership, title='First Date',
        )
        self.assertEqual(sd.date, date(2023, 2, 14))

    def test_create_missing_fields(self):
        """POST without required fields returns 400."""
        resp = self.client.post(self._url(self.partnership.pk), {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_empty_for_nonexistent_partnership(self):
        """Requesting special dates for a non-existent partnership returns empty list."""
        resp = self.client.get(self._url(99999))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_non_member_cannot_list(self):
        """A user not in the partnership gets an empty list."""
        self.client.force_authenticate(user=self.charlie)
        SpecialDate.objects.create(
            partnership=self.partnership, title='Secret', date=date(2023, 1, 1),
        )
        resp = self.client.get(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_partner_can_create(self):
        """The other partner (bob) can also create special dates."""
        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self._url(self.partnership.pk), {
            'title': 'Our Song', 'date': '2023-06-01',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        sd = SpecialDate.objects.get(
            partnership=self.partnership, title='Our Song',
        )
        self.assertEqual(sd.date, date(2023, 6, 1))

    def test_non_member_cannot_create(self):
        """A user not in the partnership cannot create special dates."""
        self.client.force_authenticate(user=self.charlie)
        count_before = SpecialDate.objects.count()
        resp = self.client.post(self._url(self.partnership.pk), {
            'title': 'Hack', 'date': '2023-01-01',
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(SpecialDate.objects.count(), count_before)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(self._url(self.partnership.pk))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class SpecialDateDetailTests(TestCase):
    """Tests for GET/PATCH/DELETE /api/v1/relationships/<id>/special-dates/<pk>/"""

    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.charlie = create_user(email='charlie@example.com')
        self.partnership = create_partnership(
            self.alice, self.bob, status=PartnershipStatus.ACTIVE,
        )
        self.special_date = SpecialDate.objects.create(
            partnership=self.partnership, title='Anniversary', date=date(2022, 12, 25),
        )
        self.client.force_authenticate(user=self.alice)

    def _url(self, partnership_id, pk):
        return reverse('special-date-detail', args=[partnership_id, pk])

    # ---------- GET ----------

    def test_retrieve_special_date(self):
        """Can retrieve a specific special date."""
        resp = self.client.get(
            self._url(self.partnership.pk, self.special_date.pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Anniversary')
        self.assertEqual(resp.data['date'], '2022-12-25')

    def test_partner_can_retrieve(self):
        """The other partner can also retrieve the special date."""
        self.client.force_authenticate(user=self.bob)
        resp = self.client.get(
            self._url(self.partnership.pk, self.special_date.pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # ---------- PATCH ----------

    def test_update_special_date(self):
        """PATCH updates the title and/or date."""
        resp = self.client.patch(
            self._url(self.partnership.pk, self.special_date.pk),
            {'title': 'Our Anniversary', 'date': '2023-01-01'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.special_date.refresh_from_db()
        self.assertEqual(self.special_date.title, 'Our Anniversary')
        self.assertEqual(self.special_date.date, date(2023, 1, 1))

    def test_partial_update(self):
        """PATCH with only title updates just the title."""
        resp = self.client.patch(
            self._url(self.partnership.pk, self.special_date.pk),
            {'title': 'Updated Title'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.special_date.refresh_from_db()
        self.assertEqual(self.special_date.title, 'Updated Title')
        self.assertEqual(self.special_date.date, date(2022, 12, 25))

    # ---------- DELETE ----------

    def test_delete_special_date(self):
        """DELETE removes the special date and returns 204."""
        pk = self.special_date.pk
        resp = self.client.delete(
            self._url(self.partnership.pk, pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SpecialDate.objects.filter(pk=pk).exists())

    # ---------- Access control ----------

    def test_non_member_cannot_retrieve(self):
        """A user not in the partnership gets 404 on GET."""
        self.client.force_authenticate(user=self.charlie)
        resp = self.client.get(
            self._url(self.partnership.pk, self.special_date.pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_member_cannot_update(self):
        """A user not in the partnership gets 404 on PATCH — data unchanged."""
        self.client.force_authenticate(user=self.charlie)
        resp = self.client.patch(
            self._url(self.partnership.pk, self.special_date.pk),
            {'title': 'Hacked'},
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.special_date.refresh_from_db()
        self.assertEqual(self.special_date.title, 'Anniversary')

    def test_non_member_cannot_delete(self):
        """A user not in the partnership gets 404 on DELETE — date still exists."""
        self.client.force_authenticate(user=self.charlie)
        resp = self.client.delete(
            self._url(self.partnership.pk, self.special_date.pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(SpecialDate.objects.filter(pk=self.special_date.pk).exists())

    def test_wrong_partnership_id_in_url(self):
        """Special date exists but under a different partnership — returns 404."""
        other_partnership = create_partnership(
            self.bob, self.charlie, status=PartnershipStatus.ACTIVE,
        )
        resp = self.client.get(
            self._url(other_partnership.pk, self.special_date.pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.get(
            self._url(self.partnership.pk, self.special_date.pk),
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
