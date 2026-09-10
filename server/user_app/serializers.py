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
