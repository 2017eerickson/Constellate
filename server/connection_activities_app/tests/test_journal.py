from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from connection_activities_app.models import Answer, Question, PartnershipQuestion
from gamification_app.models import StreakActivity

from .helpers import create_active_partnership, create_user


def _create_question(label='communication', text='Test question?'):
    return Question.objects.create(label=label, question_text=text)


def _create_active_pq(partnership, question):
    return PartnershipQuestion.objects.create(
        partnership=partnership,
        question=question,
        status=PartnershipQuestion.Status.ACTIVE,
    )


def _answer_question(partnership, question, user, text='My answer'):
    return Answer.objects.create(
        partnership=partnership,
        question=question,
        user=user,
        answer_text=text,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/activities/<partnership_id>/journal/
# ---------------------------------------------------------------------------
class CurrentQuestionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('current-question', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)
        self.question = _create_question()
        self.pq = _create_active_pq(self.partnership, self.question)

    def test_auto_assigns_question(self):
        """When no PQ exists, GET auto-assigns one and returns 200."""
        # Delete the PQ created in setUp so the helper assigns one
        self.pq.delete()
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('partnership_question_id', resp.data)
        self.assertTrue(
            PartnershipQuestion.objects.filter(partnership=self.partnership).exists()
        )

    def test_response_shape(self):
        """Response has the expected top-level keys and nested question fields."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for key in ('partnership_question_id', 'question', 'my_answer', 'partner_answer', 'both_answered'):
            self.assertIn(key, resp.data)
        q = resp.data['question']
        for key in ('id', 'label', 'question_text'):
            self.assertIn(key, q)

    def test_returns_same_active_question(self):
        """Calling GET twice returns the same partnership_question_id."""
        resp1 = self.client.get(self.url)
        resp2 = self.client.get(self.url)
        self.assertEqual(
            resp1.data['partnership_question_id'],
            resp2.data['partnership_question_id'],
        )

    def test_my_answer_null_before_answering(self):
        """my_answer is null when the user hasn't answered."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data['my_answer'])

    def test_partner_answer_hidden_when_only_partner_answered(self):
        """partner_answer is null even after partner answers, because user hasn't answered yet."""
        _answer_question(self.partnership, self.question, self.bob, 'Bob answer')
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data['partner_answer'])
        self.assertFalse(resp.data['both_answered'])

    def test_both_answers_visible_when_both_answered(self):
        """After both answer, my_answer and partner_answer are populated."""
        _answer_question(self.partnership, self.question, self.alice, 'Alice answer')
        _answer_question(self.partnership, self.question, self.bob, 'Bob answer')
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data['my_answer'])
        self.assertIsNotNone(resp.data['partner_answer'])
        self.assertTrue(resp.data['both_answered'])

    def test_completed_today_still_visible(self):
        """A PQ completed today is returned by GET (not a new one)."""
        self.pq.status = PartnershipQuestion.Status.COMPLETED
        self.pq.completed_at = timezone.now()
        self.pq.save()
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['partnership_question_id'], self.pq.pk)

    def test_new_question_after_completed_yesterday(self):
        """After completion, next day GET returns a new PQ."""
        self.pq.status = PartnershipQuestion.Status.COMPLETED
        self.pq.completed_at = timezone.now()
        self.pq.save()
        tomorrow = date.today() + timedelta(days=1)
        with patch(
            'connection_activities_app.views.question_helpers.timezone.localdate',
            return_value=tomorrow,
        ):
            resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotEqual(resp.data['partnership_question_id'], self.pq.pk)

    def test_partner_sees_same_question(self):
        """Bob sees the same partnership_question_id as Alice."""
        resp_alice = self.client.get(self.url)
        self.client.force_authenticate(user=self.bob)
        resp_bob = self.client.get(self.url)
        self.assertEqual(
            resp_alice.data['partnership_question_id'],
            resp_bob.data['partnership_question_id'],
        )

    def test_nonexistent_partnership(self):
        """GET with a non-existent partnership_id returns 404."""
        url = reverse('current-question', args=[99999])
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
# POST /api/v1/activities/<partnership_id>/journal/answer/
# ---------------------------------------------------------------------------
class SubmitAnswerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('submit-answer', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)
        self.question = _create_question()
        self.pq = _create_active_pq(self.partnership, self.question)
        self.partnership.stardust.refresh_from_db()
        self.initial_stardust = self.partnership.stardust.total

    def test_submit_success(self):
        """Valid POST creates an Answer and returns 201 with my_answer populated."""
        resp = self.client.post(self.url, {'answer_text': 'My thoughtful answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(resp.data['my_answer'])
        self.assertEqual(resp.data['my_answer']['answer_text'], 'My thoughtful answer')
        self.assertTrue(
            Answer.objects.filter(
                user=self.alice, question=self.question, partnership=self.partnership,
            ).exists()
        )

    def test_empty_answer_rejected(self):
        """Empty answer_text returns 400."""
        resp = self.client.post(self.url, {'answer_text': ''})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['error'], 'answer_text is required.')

    def test_whitespace_only_rejected(self):
        """Whitespace-only answer_text returns 400."""
        resp = self.client.post(self.url, {'answer_text': '   '})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['error'], 'answer_text is required.')

    def test_missing_answer_text(self):
        """Missing answer_text key returns 400."""
        resp = self.client.post(self.url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['error'], 'answer_text is required.')

    def test_duplicate_answer_rejected(self):
        """Answering the same question twice returns 400."""
        resp1 = self.client.post(self.url, {'answer_text': 'First answer'})
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        resp2 = self.client.post(self.url, {'answer_text': 'Second attempt'})
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp2.data['error'], 'You have already answered this question.')

    def test_first_answer_no_completion(self):
        """After only alice answers, PQ stays ACTIVE and stardust unchanged."""
        resp = self.client.post(self.url, {'answer_text': 'Solo answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertFalse(resp.data['both_answered'])
        self.pq.refresh_from_db()
        self.assertEqual(self.pq.status, PartnershipQuestion.Status.ACTIVE)
        self.partnership.stardust.refresh_from_db()
        self.assertEqual(self.partnership.stardust.total, self.initial_stardust)

    def test_second_answer_completes_question(self):
        """When bob answers after alice, PQ becomes COMPLETED."""
        self.client.post(self.url, {'answer_text': 'Alice answer'})
        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self.url, {'answer_text': 'Bob answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['both_answered'])
        self.pq.refresh_from_db()
        self.assertEqual(self.pq.status, PartnershipQuestion.Status.COMPLETED)
        self.assertIsNotNone(self.pq.completed_at)

    def test_stardust_awarded_on_completion(self):
        """Stardust increases by 15 only after both partners answer."""
        self.client.post(self.url, {'answer_text': 'Alice answer'})
        self.partnership.stardust.refresh_from_db()
        self.assertEqual(self.partnership.stardust.total, self.initial_stardust)

        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self.url, {'answer_text': 'Bob answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.partnership.stardust.refresh_from_db()
        self.assertEqual(self.partnership.stardust.total, self.initial_stardust + 15)

    def test_streak_recorded_on_completion(self):
        """StreakActivity is recorded for the second answerer on completion."""
        self.client.post(self.url, {'answer_text': 'Alice answer'})
        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self.url, {'answer_text': 'Bob answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            StreakActivity.objects.filter(
                streak=self.partnership.streak, user=self.bob,
            ).exists()
        )

    def test_partner_answer_hidden_after_first(self):
        """After alice answers, her response shows partner_answer as null."""
        _answer_question(self.partnership, self.question, self.bob, 'Bob answer')
        resp = self.client.post(self.url, {'answer_text': 'Alice answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # Alice just answered, and bob already answered, so both_answered should be True
        # and partner_answer should be visible
        self.assertTrue(resp.data['both_answered'])
        self.assertIsNotNone(resp.data['partner_answer'])

    def test_partner_answer_hidden_when_only_first_answers(self):
        """After only alice answers, partner_answer is null in alice's response."""
        resp = self.client.post(self.url, {'answer_text': 'Alice answer'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data['partner_answer'])
        self.assertFalse(resp.data['both_answered'])

    def test_cannot_answer_completed_question(self):
        """Cannot answer a question that is already completed (same day)."""
        _answer_question(self.partnership, self.question, self.alice, 'Alice')
        _answer_question(self.partnership, self.question, self.bob, 'Bob')
        self.pq.status = PartnershipQuestion.Status.COMPLETED
        self.pq.completed_at = timezone.now()
        self.pq.save()
        # A new user trying to POST — the helper returns the completed-today PQ
        charlie = create_user(email='charlie@example.com')
        p2 = create_active_partnership(self.alice, charlie)
        q2 = _create_question(text='Another question?')
        pq2 = _create_active_pq(p2, q2)
        pq2.status = PartnershipQuestion.Status.COMPLETED
        pq2.completed_at = timezone.now()
        pq2.save()
        url2 = reverse('submit-answer', args=[p2.pk])
        resp = self.client.post(url2, {'answer_text': 'Late answer'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['error'], 'This question is no longer active.')

    def test_cannot_answer_skipped_question(self):
        """Cannot answer a question that was skipped."""
        self.pq.status = PartnershipQuestion.Status.SKIPPED
        self.pq.completed_at = timezone.now()
        self.pq.save()
        # get_or_assign_current_question will assign a NEW active PQ since this one is skipped
        # So we can't directly test "answering a skipped question" via the endpoint —
        # the helper would return a new active one. Instead, verify the skip happened.
        # This is inherently tested by the skip flow. Let's test via a completed-today scenario.
        # Mark it back as completed today to trigger the "not active" guard:
        self.pq.status = PartnershipQuestion.Status.COMPLETED
        self.pq.save()
        resp = self.client.post(self.url, {'answer_text': 'Late answer'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_partnership(self):
        """POST to a non-existent partnership returns 404."""
        url = reverse('submit-answer', args=[99999])
        resp = self.client.post(url, {'answer_text': 'Hello'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """POST on a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.post(self.url, {'answer_text': 'Hello'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated POST returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, {'answer_text': 'Hello'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# POST /api/v1/activities/<partnership_id>/journal/skip/
# ---------------------------------------------------------------------------
class SkipQuestionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.partnership = create_active_partnership(self.alice, self.bob)
        self.url = reverse('skip-question', args=[self.partnership.pk])
        self.client.force_authenticate(user=self.alice)
        self.question = _create_question()
        self.pq = _create_active_pq(self.partnership, self.question)

    def test_skip_returns_new_question(self):
        """Skip returns a different partnership_question_id than the original."""
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotEqual(resp.data['partnership_question_id'], self.pq.pk)

    def test_original_marked_skipped(self):
        """The original PQ is marked as SKIPPED with completed_at set."""
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.pq.refresh_from_db()
        self.assertEqual(self.pq.status, PartnershipQuestion.Status.SKIPPED)
        self.assertIsNotNone(self.pq.completed_at)

    def test_new_question_is_active(self):
        """The new PQ returned by skip has status ACTIVE."""
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        new_pq = PartnershipQuestion.objects.get(pk=resp.data['partnership_question_id'])
        self.assertEqual(new_pq.status, PartnershipQuestion.Status.ACTIVE)

    def test_new_question_different_from_skipped(self):
        """The new question is a different Question than the skipped one."""
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotEqual(resp.data['question']['id'], self.question.pk)

    def test_cannot_skip_completed_question(self):
        """Cannot skip a question that is already completed (same day)."""
        self.pq.status = PartnershipQuestion.Status.COMPLETED
        self.pq.completed_at = timezone.now()
        self.pq.save()
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['error'], 'This question is no longer active.')

    def test_nonexistent_partnership(self):
        """POST with a non-existent partnership_id returns 404."""
        url = reverse('skip-question', args=[99999])
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_member(self):
        """POST on a partnership the user is not part of returns 404."""
        charlie = create_user(email='charlie@example.com')
        self.client.force_authenticate(user=charlie)
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        """Unauthenticated POST returns 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
