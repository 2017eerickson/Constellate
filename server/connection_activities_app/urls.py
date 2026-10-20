from django.urls import path

from connection_activities_app.views import (
    SetMoodView,
    SendAffectionView,
    RetrieveAffectionsView,
    ReadAffectionView,
    AffectionCooldownView,
)

urlpatterns = [
    path('<int:partnership_id>/mood/', SetMoodView.as_view(), name='set-mood'),
    path('<int:partnership_id>/affection/', RetrieveAffectionsView.as_view(), name='retrieve-affections'),
    path('<int:partnership_id>/affection/send/', SendAffectionView.as_view(), name='send-affection'),
    path('<int:partnership_id>/affection/cooldown/', AffectionCooldownView.as_view(), name='affection-cooldown'),
    path('<int:partnership_id>/affection/<int:affection_id>/read/', ReadAffectionView.as_view(), name='read-affection'),
]
