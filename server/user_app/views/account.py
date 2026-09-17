from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from user_app.serializers import OnboardingSerializer, UserSerializer


class OnboardingView(APIView):
    """
    SUMMARY:        Completes user onboarding by collecting their birthday.
    ENDPOINT:       POST /api/v1/auth/onboarding/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:
        {
            "birthday": str  (required) — date in "YYYY-MM-DD" format
        }
    RETURN VALUE:
        {
            "user": dict
        }
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


class LogoutView(APIView):
    """
    SUMMARY:        Blacklists the refresh token to log the user out.
    ENDPOINT:       POST /api/v1/auth/logout/
    AUTHENTICATION: Bearer <access_token>
    REQUEST BODY:
        {
            "refresh": str  (required) — the refresh token to invalidate
        }
    RETURN VALUE:   205 Reset Content (no body)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    """
    SUMMARY:        Returns the current authenticated user's data or soft-deletes their account.
    ENDPOINTS:
        GET  /api/v1/users/auth/me/     — returns current user
        DELETE /api/v1/users/auth/me/    — deactivates account (soft delete)
    AUTHENTICATION: Bearer <access_token>
    DELETE REQUEST BODY:
        {
            "password": str  (required) — user's password to confirm deletion
        }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user': UserSerializer(request.user).data})

    def delete(self, request):
        user = request.user
        password = request.data.get('password')

        if not password:
            return Response(
                {'error': 'Password is required to delete your account'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Incorrect password'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.is_active = False
        user.save(update_fields=['is_active'])

        return Response({'message': 'Account deactivated successfully'})
