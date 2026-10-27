from rest_framework import serializers

from connection_activities_app.models import MoodSetting, AffectionSending


class MoodSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodSetting
        fields = ['id', 'user', 'partnership', 'mood', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class AffectionSendingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffectionSending
        fields = ['id', 'sender', 'partnership', 'type', 'read', 'timestamp']
        read_only_fields = ['id', 'read', 'timestamp']
