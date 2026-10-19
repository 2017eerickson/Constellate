from django.apps import AppConfig


class ConnectionActivitiesAppConfig(AppConfig):
    name = 'connection_activities_app'

    def ready(self):
        import connection_activities_app.signals  # noqa: F401
