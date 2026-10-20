from django.urls import path


from connection_activities_app.views import SetMoodView, SendAffectionView

urlpatterns = [
    path('<int:partnership_id>/mood/', SetMoodView.as_view(), name='set-mood'),
    path('<int:partnership_id>/affection/', SendAffectionView.as_view(), name='send-affection'),
]
