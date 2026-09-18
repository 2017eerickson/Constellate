from django.conf import settings
from django.core.mail import send_mail
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from user_app.models import User
from user_app.serializers import (
    ForgotPasswordSerializer,
    OnboardingSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)

signer = TimestampSigner()


class ForgotPasswordThrottle(SimpleRateThrottle):
    """Limits forgot-password requests to 1 per day per email."""
    rate = '1/day'

    def get_cache_key(self, request, view):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return None
        return f'forgot-password-{email}'


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


class ForgotPasswordView(APIView):
    """
    SUMMARY:        Sends a password reset email if the account exists and uses email/password auth.
    ENDPOINT:       POST /api/v1/auth/forgot-password/
    AUTHENTICATION: None
    REQUEST BODY:
        {
            "email": str  (required)
        }
    RETURN VALUE:
        { "message": "If an account exists with this email, a reset link has been sent." }
    NOTE: Always returns the same generic message regardless of whether the email exists,
          the user is a Google SSO user, or the account is inactive. This prevents email enumeration.
    """
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower().strip()
        generic_message = 'If an account exists with this email, a reset link has been sent.'

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'message': generic_message})

        if user.google_sub:
            return Response({'message': generic_message})

        hash_prefix = user.password[:8]
        signed = signer.sign(f'{user.pk}:{hash_prefix}')
        token = signed.encode().hex()
        reset_url = request.build_absolute_uri(f'/api/v1/users/auth/reset-password/{token}/')

        send_mail(
            subject='Constellate — Reset your password',
            message=(
                f'Hi {user.first_name},\n\n'
                f'Click the link to reset your password:\n{reset_url}\n\n'
                f'This link expires in 1 hour.\n\n'
                f'If you did not request this, you can ignore this email.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )

        return Response({'message': generic_message})


class ResetPasswordView(APIView):
    """
    SUMMARY:        Resets a user's password using a signed token from the reset email.
    ENDPOINT:       POST /api/v1/auth/reset-password/
    AUTHENTICATION: None
    REQUEST BODY:
        {
            "token": str         (required) — hex-encoded signed token from reset email,
            "new_password": str  (required) — must pass Django password validators
        }
    RETURN VALUE:
        { "message": "Password reset successfully" }
    """
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            signed = bytes.fromhex(token).decode()
            payload = signer.unsign(signed, max_age=3600)
        except SignatureExpired:
            return Response(
                {'error': 'Reset link has expired'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (BadSignature, ValueError):
            return Response(
                {'error': 'Invalid reset link'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_pk, hash_prefix = payload.rsplit(':', 1)
        except ValueError:
            return Response(
                {'error': 'Invalid reset link'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_pk, is_active=True)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.password[:8] != hash_prefix:
            return Response(
                {'error': 'Reset link has already been used'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({'message': 'Password reset successfully'})
