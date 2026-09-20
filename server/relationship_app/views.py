from django.db import models
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from relationship_app.models import Partnership, PartnershipStatus, RelationType
from relationship_app.serializers import (
    ConnectSerializer,
    PartnershipSerializer,
    UpdatePartnershipSerializer,
)
from user_app.models import User


class ConnectView(generics.CreateAPIView):
    """
    SUMMARY:        Sends a partnership request to another user via their partner code.
    ENDPOINT:       POST /api/v1/relationships/connect/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:
        {
            "partner_code": str  (required) — 8-character unique partner code
        }
    RETURN VALUE:
        {
            "id": int,
            "initiator": dict,
            "partner": dict,
            "status": str,
            "relation": str,
            "streak": dict | null,
            "stardust": int,
            "started_at": str,
            "ended_at": str | null
        }
    ERROR RESPONSES:
        404 — No user found with that partner code
        400 — Cannot connect with yourself
        409 — A partnership already exists with this user
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConnectSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        partner_code = serializer.validated_data['partner_code']

        try:
            partner = User.objects.get(partner_code=partner_code)
        except User.DoesNotExist:
            return Response(
                {'error': 'No user found with that partner code.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if partner == request.user:
            return Response(
                {'error': 'You cannot connect with yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Partnership.objects.filter(
            models.Q(initiator=request.user, partner=partner)
            | models.Q(initiator=partner, partner=request.user),
        ).exclude(status=PartnershipStatus.ENDED).first()

        if existing:
            return Response(
                {'error': 'A partnership already exists with this user.'},
                status=status.HTTP_409_CONFLICT,
            )

        partnership = Partnership.objects.create(
            initiator=request.user,
            partner=partner,
            status=PartnershipStatus.PENDING,
            relation=RelationType.ROMANTIC,
        )

        return Response(
            PartnershipSerializer(partnership, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PartnershipListView(generics.ListAPIView):
    """
    SUMMARY:        Lists all partnerships for the authenticated user.
    ENDPOINT:       GET /api/v1/relationships/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:   None
    RETURN VALUE:
        [
            {
                "id": int,
                "initiator": dict,
                "partner": dict,
                "status": str,       — "pending" | "active" | "paused" | "ended"
                "relation": str,     — free-text label (e.g. "romantic", "platonic", or custom)
                "streak": dict | null,
                "stardust": int,
                "started_at": str,
                "ended_at": str | null
            }
        ]
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PartnershipSerializer

    def get_queryset(self):
        return Partnership.objects.filter(
            models.Q(initiator=self.request.user)
            | models.Q(partner=self.request.user),
        )


class PartnershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    SUMMARY:        Retrieve, update, or remove a partnership.
    ENDPOINT:       GET/PATCH/DELETE /api/v1/relationships/<id>/
    AUTHENTICATION: Bearer <access_token>

    GET — Retrieve a single partnership
    REQUEST BODY:   None
    RETURN VALUE:
        {
            "id": int,
            "initiator": dict,
            "partner": dict,
            "status": str,
            "relation": str,
            "streak": dict | null,
            "stardust": int,
            "started_at": str,
            "ended_at": str | null
        }

    PATCH — Update partnership status and/or relation
    REQUEST BODY:
        {
            "status": str    (optional) — "active" | "paused" | "ended"
            "relation": str  (optional) — free-text label (max 50 chars)
        }
    RETURN VALUE:
        Same as GET
    ERROR RESPONSES:
        403 — Only the recipient can accept a pending partnership request

    DELETE — Decline or end a partnership
    REQUEST BODY:   None
    RETURN VALUE:   204 No Content
    BEHAVIOR:
        - Pending partnerships are hard-deleted
        - Active/paused partnerships are soft-deleted (status → "ended", ended_at set)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PartnershipSerializer

    def get_queryset(self):
        return Partnership.objects.filter(
            models.Q(initiator=self.request.user)
            | models.Q(partner=self.request.user),
        ).exclude(relation=RelationType.SOULMATE)

    def update(self, request, *args, **kwargs):
        partnership = self.get_object()
        serializer = UpdatePartnershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        new_relation = serializer.validated_data.get('relation')

        if new_status:
            # Only the recipient can accept a pending request
            if (
                partnership.status == PartnershipStatus.PENDING
                and new_status == PartnershipStatus.ACTIVE
                and request.user != partnership.partner
            ):
                return Response(
                    {'error': 'Only the recipient can accept a partnership request.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            partnership.status = new_status
            if new_status == PartnershipStatus.ENDED:
                partnership.ended_at = timezone.now()

        if new_relation:
            partnership.relation = new_relation

        partnership.save()

        return Response(PartnershipSerializer(partnership, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        partnership = self.get_object()

        if partnership.status == PartnershipStatus.PENDING:
            partnership.delete()
        else:
            partnership.status = PartnershipStatus.ENDED
            partnership.ended_at = timezone.now()
            partnership.save()

        return Response(status=status.HTTP_204_NO_CONTENT)
