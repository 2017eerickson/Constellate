from django.urls import path

from connection_activities_app.views import SetMoodView

urlpatterns = [
    path('<int:partnership_id>/mood/', SetMoodView.as_view(), name='set-mood'),
]
