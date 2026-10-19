from rest_framework import serializers

from connection_activities_app.models import MoodSetting


class MoodSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodSetting
        fields = ['id', 'user', 'partnership', 'mood', 'timestamp']
        read_only_fields = ['id', 'timestamp']
