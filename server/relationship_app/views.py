from django.db import models
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from datetime import date

from relationship_app.models import Partnership, PartnershipStatus, RelationType, SpecialDate
from relationship_app.serializers import (
    ConnectSerializer,
    CreateSpecialDateSerializer,
    PartnershipSerializer,
    SpecialDateSerializer,
    UpdatePartnershipSerializer,
)
from user_app.models import User


def create_default_special_dates(partnership):
    """Create default special dates (anniversary + birthdays) for a partnership."""
    dates_to_create = [
        SpecialDate(
            partnership=partnership,
            title='Anniversary',
            date=partnership.anniversary or date.today(),
        ),
    ]

    for user, label in [
        (partnership.initiator, f"{partnership.initiator.first_name}'s Birthday"),
        (partnership.partner, f"{partnership.partner.first_name}'s Birthday"),
    ]:
        if user.birthday:
            dates_to_create.append(
                SpecialDate(partnership=partnership, title=label, date=user.birthday)
            )

    SpecialDate.objects.bulk_create(dates_to_create)


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
        relation = serializer.validated_data.get('relation', 'romantic')
        anniversary = serializer.validated_data.get('anniversary')

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
        ).first()

        if existing:
            if existing.status != PartnershipStatus.ENDED:
                return Response(
                    {'error': 'A partnership already exists with this user.'},
                    status=status.HTTP_409_CONFLICT,
                )

            existing.initiator = request.user
            existing.partner = partner
            existing.status = PartnershipStatus.PENDING
            existing.relation = relation
            existing.anniversary = anniversary
            existing.ended_at = None
            existing.save()
            existing.special_dates.all().delete()
            partnership = existing
        else:
            partnership = Partnership.objects.create(
                initiator=request.user,
                partner=partner,
                status=PartnershipStatus.PENDING,
                relation=relation,
                anniversary=anniversary,
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
                "special_dates": list,  — list of special dates (e.g. anniversaries, birthdays) in ISO 8601 format
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
            "special_dates": list,  — list of special dates (e.g. anniversaries, birthdays) in ISO 8601 format
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
        )

    def update(self, request, *args, **kwargs):
        partnership = self.get_object()

        if partnership.relation == RelationType.SOULMATE:
            return Response(
                {'error': 'Cannot modify soulmate partnership.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UpdatePartnershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        new_relation = serializer.validated_data.get('relation')

        if not new_status and not new_relation:
            return Response(
                {'error': 'No fields to update.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

            was_pending = partnership.status == PartnershipStatus.PENDING
            partnership.status = new_status

            if new_status == PartnershipStatus.ACTIVE and was_pending:
                create_default_special_dates(partnership)

            if new_status == PartnershipStatus.ENDED:
                partnership.ended_at = timezone.now()

        if new_relation:
            partnership.relation = new_relation

        partnership.save()

        return Response(PartnershipSerializer(partnership, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        partnership = self.get_object()

        if partnership.relation == RelationType.SOULMATE:
            return Response(
                {'error': 'Cannot delete soulmate partnership.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if partnership.status == PartnershipStatus.PENDING:
            partnership.delete()
        elif partnership.status == PartnershipStatus.ENDED:
            pass
        else:
            partnership.status = PartnershipStatus.ENDED
            partnership.ended_at = timezone.now()
            partnership.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


class SpecialDateListCreateView(generics.ListCreateAPIView):
    """
    SUMMARY:        List or create special dates for a partnership.
    ENDPOINTS:
        GET  /api/v1/relationships/<partnership_id>/special-dates/
        POST /api/v1/relationships/<partnership_id>/special-dates/
    AUTHENTICATION: Bearer <access_token>
    POST REQUEST BODY:
        {
            "title": str   (required),
            "date": str    (required) — "YYYY-MM-DD"
        }
    """
    permission_classes = [IsAuthenticated]

    def get_partnership(self):
        return Partnership.objects.filter(
            models.Q(initiator=self.request.user)
            | models.Q(partner=self.request.user),
            pk=self.kwargs['partnership_id'],
        ).first()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateSpecialDateSerializer
        return SpecialDateSerializer

    def get_queryset(self):
        partnership = self.get_partnership()
        if not partnership:
            return SpecialDate.objects.none()
        return partnership.special_dates.all()

    def create(self, request, *args, **kwargs):
        partnership = self.get_partnership()
        if not partnership:
            return Response(
                {'error': 'Partnership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CreateSpecialDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(partnership=partnership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SpecialDateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    SUMMARY:        Retrieve, update, or delete a special date.
    ENDPOINT:       GET/PATCH/DELETE /api/v1/relationships/<partnership_id>/special-dates/<id>/
    AUTHENTICATION: Bearer <access_token>
    PATCH REQUEST BODY:
        {
            "title": str   (optional),
            "date": str    (optional) — "YYYY-MM-DD"
        }
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SpecialDateSerializer

    def get_queryset(self):
        return SpecialDate.objects.filter(
            partnership_id=self.kwargs['partnership_id'],
        ).filter(
            models.Q(partnership__initiator=self.request.user)
            | models.Q(partnership__partner=self.request.user),
        )
