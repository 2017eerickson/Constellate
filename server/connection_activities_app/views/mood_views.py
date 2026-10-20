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

    def get_partnership(self, request, partnership_id):
        return Partnership.objects.filter(
            models.Q(initiator=request.user) | models.Q(partner=request.user),
            pk=partnership_id,
        ).first()

    def get(self, request, partnership_id):
        partnership = self.get_partnership(request, partnership_id)

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
                'mood': initiator_mood.mood,
                'timestamp': initiator_mood.timestamp,
            },
            'partner': {
                'user': partnership.partner_id,
                'mood': partner_mood.mood,
                'timestamp': partner_mood.timestamp,
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
        partnership = self.get_partnership(request, partnership_id)

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

        return Response(serializer.data, status=status.HTTP_201_CREATED)
