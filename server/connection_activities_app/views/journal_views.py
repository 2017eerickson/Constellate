from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from connection_activities_app.models import Answer, PartnershipQuestion
from connection_activities_app.serializers import QuestionSerializer, AnswerSerializer
from connection_activities_app.views.question_helpers import get_or_assign_current_question
from connection_activities_app.views.streak_helpers import record_streak_activity
from connection_activities_app.views.utils import get_partnership
from gamification_app.models import Stardust


JOURNAL_STARDUST_REWARD = 15


def build_journal_response(pq, request_user, partnership):
    """Build the standard journal response dict for a PartnershipQuestion."""
    my_answer = Answer.objects.filter(
        partnership=partnership,
        question=pq.question,
        user=request_user,
    ).first()

    partner_user = (
        partnership.partner if partnership.initiator == request_user
        else partnership.initiator
    )
    partner_answer = Answer.objects.filter(
        partnership=partnership,
        question=pq.question,
        user=partner_user,
    ).first()

    both_answered = my_answer is not None and partner_answer is not None

    return {
        'partnership_question_id': pq.id,
        'question': QuestionSerializer(pq.question).data,
        'my_answer': AnswerSerializer(my_answer).data if my_answer else None,
        'partner_answer': AnswerSerializer(partner_answer).data if both_answered else None,
        'both_answered': both_answered,
    }


class CurrentQuestionView(APIView):
    """
    ENDPOINT:       GET /api/v1/activities/<partnership_id>/journal/
    AUTHENTICATION: Bearer <access_token>
    RETURN VALUE:
        {
            "partnership_question_id": int,
            "question": {"id": int, "label": str, "question_text": str},
            "my_answer": {"id": int, "answer_text": str, "created_at": str} | null,
            "partner_answer": {"id": int, "answer_text": str, "created_at": str} | null,
            "both_answered": bool
        }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        pq = get_or_assign_current_question(partnership)
        return Response(build_journal_response(pq, request.user, partnership))


class SubmitAnswerView(APIView):
    """
    ENDPOINT:       POST /api/v1/activities/<partnership_id>/journal/answer/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   {"answer_text": str}
    RETURN VALUE:   Same shape as CurrentQuestionView
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        pq = get_or_assign_current_question(partnership)

        if pq.status != PartnershipQuestion.Status.ACTIVE:
            return Response(
                {'error': 'This question is no longer active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        answer_text = request.data.get('answer_text', '').strip()
        if not answer_text:
            return Response(
                {'error': 'answer_text is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate answers
        already_answered = Answer.objects.filter(
            partnership=partnership,
            question=pq.question,
            user=request.user,
        ).exists()

        if already_answered:
            return Response(
                {'error': 'You have already answered this question.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Answer.objects.create(
            partnership=partnership,
            question=pq.question,
            user=request.user,
            answer_text=answer_text,
        )

        # Check if both partners have now answered
        answer_count = Answer.objects.filter(
            partnership=partnership,
            question=pq.question,
        ).count()

        if answer_count >= 2:
            pq.status = PartnershipQuestion.Status.COMPLETED
            pq.completed_at = timezone.now()
            pq.save()

            stardust, _ = Stardust.objects.get_or_create(partnership=partnership)
            stardust.total += JOURNAL_STARDUST_REWARD
            stardust.save()

            record_streak_activity(request.user, partnership)

        return Response(
            build_journal_response(pq, request.user, partnership),
            status=status.HTTP_201_CREATED,
        )


class SkipQuestionView(APIView):
    """
    ENDPOINT:       POST /api/v1/activities/<partnership_id>/journal/skip/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   (empty)
    RETURN VALUE:   Same shape as CurrentQuestionView (with the new question)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        pq = get_or_assign_current_question(partnership)

        if pq.status != PartnershipQuestion.Status.ACTIVE:
            return Response(
                {'error': 'This question is no longer active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pq.status = PartnershipQuestion.Status.SKIPPED
        pq.completed_at = timezone.now()
        pq.save()

        # Assign a new question immediately
        new_pq = get_or_assign_current_question(partnership)
        return Response(build_journal_response(new_pq, request.user, partnership))
