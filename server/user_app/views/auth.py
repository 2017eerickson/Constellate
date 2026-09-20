from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from user_app.models import User
from user_app.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)

signer = TimestampSigner()


def send_verification_email(user, request):
    signed = signer.sign(str(user.pk))
    token = signed.encode().hex()
    verify_url = request.build_absolute_uri(f'/api/v1/users/auth/verify-email/{token}/')
    send_mail(
        subject='Constellate — Verify your email',
        message=f'Hi {user.first_name},\n\nClick the link to verify your email:\n{verify_url}',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


class RegisterView(APIView):
    """
    SUMMARY:        Registers a new user with email and password and returns a JWT pair.
    ENDPOINT:       POST /api/v1/auth/register/
    AUTHENTICATION: None
    REQUEST BODY:
        {
            "email": str       (required),
            "first_name": str  (required),
            "password": str    (required) — must pass Django password validators
        }
    RETURN VALUE:
        {
            "access": str,
            "refresh": str,
            "is_new_user": true,
            "user": dict
        }
    """
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        send_verification_email(user, request)

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'is_new_user': True,
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    SUMMARY:        Authenticates a user with email and password and returns a JWT pair.
    ENDPOINT:       POST /api/v1/auth/login/
    AUTHENTICATION: None
    REQUEST BODY:
        {
            "email": str     (required),
            "password": str  (required)
        }
    RETURN VALUE:
        {
            "access": str,
            "refresh": str,
            "user": dict
        }
    """
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )

        if user is None:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class VerifyEmailView(APIView):
    """
    SUMMARY:        Verifies a user's email via a signed token link.
    ENDPOINT:       GET /api/v1/auth/verify-email/<token>/
    AUTHENTICATION: None
    RETURN VALUE:   200 with success message, or 400 if token is invalid/expired
    """
    def get(self, request, token):
        try:
            signed = bytes.fromhex(token).decode()
            user_pk = signer.unsign(signed, max_age=86400)
        except SignatureExpired:
            return Response(
                {'error': 'Verification link has expired'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (BadSignature, ValueError, UnicodeDecodeError):
            return Response(
                {'error': 'Invalid verification link'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_pk)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_verified:
            return Response({'message': 'Email already verified'})

        user.is_verified = True
        user.save(update_fields=['is_verified'])

        return Response({'message': 'Email verified successfully'})
