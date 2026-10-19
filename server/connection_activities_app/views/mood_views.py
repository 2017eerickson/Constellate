from django.db import models
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from connection_activities_app.models import MoodSetting
from connection_activities_app.serializers import MoodSettingSerializer
from gamification_app.models import Stardust
from relationship_app.models import Partnership


MOOD_STARDUST_REWARD = 5


class SetMoodView(APIView):
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
    ERROR RESPONSES:
        404 — Partnership not found
        400 — Invalid mood value
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, partnership_id):
        partnership = Partnership.objects.filter(
            models.Q(initiator=request.user) | models.Q(partner=request.user),
            pk=partnership_id,
        ).first()

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

        stardust, _ = Stardust.objects.get_or_create(
            partnership=partnership,
            user=request.user,
        )
        stardust.total += MOOD_STARDUST_REWARD
        stardust.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
