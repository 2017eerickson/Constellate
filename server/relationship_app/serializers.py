from rest_framework import serializers

from gamification_app.models import Streak
from relationship_app.models import Partnership, PartnershipStatus
from user_app.serializers import UserSerializer


class ConnectSerializer(serializers.Serializer):
    partner_code = serializers.CharField(required=True, max_length=8)


class StreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = Streak
        fields = ['current_count', 'longest_count', 'last_completed_at']
        read_only_fields = fields


class PartnershipSerializer(serializers.ModelSerializer):
    initiator = UserSerializer(read_only=True)
    partner = UserSerializer(read_only=True)
    streak = StreakSerializer(read_only=True)
    stardust = serializers.SerializerMethodField()

    class Meta:
        model = Partnership
        fields = [
            'id', 'initiator', 'partner', 'status',
            'relation', 'streak', 'stardust', 'started_at', 'ended_at',
        ]
        read_only_fields = fields

    def get_stardust(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        stardust = obj.stardust.filter(user=request.user).first()
        return stardust.total if stardust else 0


class UpdatePartnershipSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            PartnershipStatus.ACTIVE,
            PartnershipStatus.PAUSED,
            PartnershipStatus.ENDED,
        ],
        required=False,
    )
    relation = serializers.CharField(max_length=50, required=False)
