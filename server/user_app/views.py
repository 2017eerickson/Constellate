from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from user_app.models import User
from user_app.serializers import (
    GoogleAuthSerializer,
    OnboardingSerializer,
    UserSerializer,
)


class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Authentication: None

    Request body:
        {
            "id_token": str  (required) — Google ID token from mobile Google Sign-In
        }

    Success response (200):
        {
            "access": str,        — short-lived JWT access token
            "refresh": str,       — long-lived JWT refresh token
            "is_new_user": bool,  — True if user was just created
            "user": {
                "id": int,
                "email": str,
                "first_name": str,
                "birthday": str | null,       — "YYYY-MM-DD" or null
                "partner_code": str,          — 8-char unique code
                "is_verified": bool,
                "onboarding_complete": bool,
                "created_at": str             — ISO 8601 datetime
            }
        }

    Error responses:
        400 — missing or invalid id_token field
        401 — Google token verification failed (expired, tampered, wrong audience)
    """
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['id_token']

        # Verify the Google ID token
        try:
            payload = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {'error': 'Invalid Google token'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Extract user info from verified token
        google_sub = payload['sub']
        email = payload['email']
        first_name = payload.get('given_name', '')

        # Find existing user or create new one
        user, created = User.objects.get_or_create(
            google_sub=google_sub,
            defaults={
                'email': email,
                'username': email,
                'first_name': first_name,
                'is_verified': True,
            },
        )

        # If returning user, update email in case it changed on Google's side
        if not created and user.email != email:
            user.email = email
            user.username = email
            user.save(update_fields=['email', 'username'])

        # Generate JWT pair
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'is_new_user': created,
            'user': UserSerializer(user).data,
        })


class OnboardingView(APIView):
    """
    POST /api/auth/onboarding/
    Authentication: Bearer <access_token>

    Request body:
        {
            "birthday": str  (required) — date in "YYYY-MM-DD" format
        }

    Success response (200):
        {
            "user": {
                "id": int,
                "email": str,
                "first_name": str,
                "birthday": str,              — "YYYY-MM-DD"
                "partner_code": str,          — 8-char unique code
                "is_verified": bool,
                "onboarding_complete": bool,  — will be True
                "created_at": str             — ISO 8601 datetime
            }
        }

    Error responses:
        400 — missing or invalid birthday field
        401 — missing or invalid access token
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.birthday = serializer.validated_data['birthday']
        user.onboarding_complete = True
        user.save(update_fields=['birthday', 'onboarding_complete'])

        return Response({'user': UserSerializer(user).data})


class MeView(APIView):
    """
    GET /api/auth/me/
    Authentication: Bearer <access_token>

    Request body: None

    Success response (200):
        {
            "user": {
                "id": int,
                "email": str,
                "first_name": str,
                "birthday": str | null,       — "YYYY-MM-DD" or null
                "partner_code": str,          — 8-char unique code
                "is_verified": bool,
                "onboarding_complete": bool,
                "created_at": str             — ISO 8601 datetime
            }
        }

    Error responses:
        401 — missing or invalid access token
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user': UserSerializer(request.user).data})
