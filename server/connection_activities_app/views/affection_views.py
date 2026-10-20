from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from connection_activities_app.models import AffectionSending
from connection_activities_app.serializers import AffectionSendingSerializer
from connection_activities_app.views.utils import get_partnership

AFFECTION_STARDUST_REWARD = 10
AFFECTION_COOLDOWN = timedelta(hours=1, minutes=11)


class SendAffectionView(APIView):
    """
    SUMMARY:        Send an affection to your partner within a partnership.
    ENDPOINT:       POST /api/v1/activities/<partnership_id>/affection/send/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:
        {
            "type": str (required) — one of AffectionChoices values
        }
    RETURN VALUE:
        {
            "id": int,
            "sender": int,
            "partnership": int,
            "type": str,
            "read": bool,
            "timestamp": str
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Cooldown: 1 hour 11 minutes between sends
        last_affection = AffectionSending.objects.filter(
            sender=request.user,
            partnership=partnership,
        ).order_by('-timestamp').first()

        if last_affection and (timezone.now() - last_affection.timestamp) < AFFECTION_COOLDOWN:
            remaining = AFFECTION_COOLDOWN - (timezone.now() - last_affection.timestamp)
            return Response(
                {
                    'error': 'Cooldown active.',
                    'remaining_seconds': int(remaining.total_seconds()),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = AffectionSendingSerializer(data={
            'sender': request.user.id,
            'partnership': partnership.id,
            'type': request.data.get('type'),
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Award stardust to the partnership
        stardust = partnership.stardust
        stardust.total += AFFECTION_STARDUST_REWARD
        stardust.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RetrieveAffectionsView(APIView):
    """
    SUMMARY:        Get all unread affections sent to the authenticated user.
    ENDPOINT:       GET /api/v1/activities/<partnership_id>/affection/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   None
    RETURN VALUE:   [{ "id", "sender", "partnership", "type", "read", "timestamp" }, ...]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, partnership_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        unread_affections = AffectionSending.objects.filter(
            partnership=partnership,
            read=False,
        ).exclude(sender=request.user)

        serializer = AffectionSendingSerializer(unread_affections, many=True)
        return Response(serializer.data)


class ReadAffectionView(APIView):
    """
    SUMMARY:        Mark a specific affection as read.
    ENDPOINT:       PUT /api/v1/activities/<partnership_id>/affection/<affection_id>/read/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   None
    RETURN VALUE:   { "id", "sender", "partnership", "type", "read", "timestamp" }
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, partnership_id, affection_id):
        partnership = get_partnership(request.user, partnership_id)

        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        affection = AffectionSending.objects.filter(
            pk=affection_id,
            partnership=partnership,
            read=False,
        ).exclude(sender=request.user).first()

        if not affection:
            return Response(
                {'error': 'Affection not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        affection.read = True
        affection.save()

        serializer = AffectionSendingSerializer(affection)
        return Response(serializer.data)
