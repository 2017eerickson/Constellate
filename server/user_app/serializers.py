from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from user_app.models import User


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'birthday', 'partner_code',
            'is_verified', 'onboarding_complete', 'created_at',
        ]
        read_only_fields = [
            'id', 'email', 'partner_code', 'is_verified', 'created_at',
        ]


class OnboardingSerializer(serializers.Serializer):
    birthday = serializers.DateField(required=True)
    first_name = serializers.CharField(required=False)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(required=False, default='')

    class Meta:
        model = User
        fields = ['email', 'first_name', 'password']

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            password=validated_data['password'],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
