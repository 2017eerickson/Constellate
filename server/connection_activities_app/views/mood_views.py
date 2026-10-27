from django.db import models as db_models
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from connection_activities_app.models import AffectionSending, MoodSetting
from connection_activities_app.serializers import MoodSettingSerializer
from connection_activities_app.views.streak_helpers import record_streak_activity
from connection_activities_app.views.utils import get_partnership
from gamification_app.models import Stardust
from relationship_app.models import Partnership


MOOD_STARDUST_REWARD = 5


class SetMoodView(APIView):
    """
    SUMMARY:        Get a mood for both users within a partnership.
    ENDPOINT:       GET /api/v1/activities/<partnership_id>/mood/
    AUTHENTICATION: Bearer <access_token>
    Request Body: None
    RETURN VALUE:
        {
            "initiator": {"user": int, "mood": str, "timestamp": str | null},
            "partner": {"user": int, "mood": str, "timestamp": str | null}
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

        initiator_mood = MoodSetting.objects.filter(
            user=partnership.initiator,
            partnership=partnership,
        ).order_by('-timestamp').first()

        partner_mood = MoodSetting.objects.filter(
            user=partnership.partner,
            partnership=partnership,
        ).order_by('-timestamp').first()

        return Response({
            'initiator': {
                'user': partnership.initiator_id,
                'mood': initiator_mood.mood if initiator_mood else 'happy',
                'timestamp': initiator_mood.timestamp if initiator_mood else None,
            },
            'partner': {
                'user': partnership.partner_id,
                'mood': partner_mood.mood if partner_mood else 'happy',
                'timestamp': partner_mood.timestamp if partner_mood else None,
            },
        })

    """
        SUMMARY:        Set a mood for the authenticated user within a partnership.
        ENDPOINT:       POST /api/v1/activities/<partnership_id>/mood/
        AUTHENTICATION: Bearer <access_token>
        REQUEST BODY:
            {
                "mood": str (required) — one of MoodChoices values
            }
        RETURN VALUE:
            {
                "id": int,
                "user": int,
                "partnership": int,
                "mood": str,
                "timestamp": str
            }
    """
    def post(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MoodSettingSerializer(data={
            'user': request.user.id,
            'partnership': partnership.id,
            'mood': request.data.get('mood'),
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        stardust, _ = Stardust.objects.get_or_create(partnership=partnership)
        stardust.total += MOOD_STARDUST_REWARD
        stardust.save()

        streak = record_streak_activity(request.user, partnership)

        return Response({
            **serializer.data,
            'stardust': stardust.total,
            'streak': {
                'current_count': streak.current_count,
                'longest_count': streak.longest_count,
                'last_completed_at': streak.last_completed_at,
            },
        }, status=status.HTTP_201_CREATED)


class ReadMoodView(APIView):
    """
    SUMMARY:        Mark unseen partner moods as seen for a partnership.
    ENDPOINT:       PATCH /api/v1/activities/<partnership_id>/mood/read/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   None
    RETURN VALUE:   { "marked": int }
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated = MoodSetting.objects.filter(
            partnership=partnership,
            seen=False,
        ).exclude(user=request.user).update(seen=True)

        return Response({'marked': updated})


class UnreadCountsView(APIView):
    """
    SUMMARY:        Get unread activity counts per partnership for the authenticated user.
    ENDPOINT:       GET /api/v1/activities/unread-counts/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   None
    RETURN VALUE:
        {
            "<partnership_id>": { "affections": int, "moods": int },
            ...
        }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        partnerships = Partnership.objects.filter(
            db_models.Q(initiator=user) | db_models.Q(partner=user),
            status='active',
        )

        counts = {}
        for p in partnerships:
            affections = AffectionSending.objects.filter(
                partnership=p,
                read=False,
            ).exclude(sender=user).count()

            moods = MoodSetting.objects.filter(
                partnership=p,
                seen=False,
            ).exclude(user=user).count()

            if affections > 0 or moods > 0:
                counts[str(p.id)] = {
                    'affections': affections,
                    'moods': moods,
                }

        return Response(counts)
