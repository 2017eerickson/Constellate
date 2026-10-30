from django.urls import path

from connection_activities_app.views import (
    SetMoodView,
    ReadMoodView,
    UnreadCountsView,
    SendAffectionView,
    RetrieveAffectionsView,
    ReadAffectionView,
    AffectionCooldownView,
    CurrentQuestionView,
    SubmitAnswerView,
    SkipQuestionView,
)

urlpatterns = [
    path('unread-counts/', UnreadCountsView.as_view(), name='unread-counts'),
    path('<int:partnership_id>/mood/', SetMoodView.as_view(), name='set-mood'),
    path('<int:partnership_id>/mood/read/', ReadMoodView.as_view(), name='read-mood'),
    path('<int:partnership_id>/affection/', RetrieveAffectionsView.as_view(), name='retrieve-affections'),
    path('<int:partnership_id>/affection/send/', SendAffectionView.as_view(), name='send-affection'),
    path('<int:partnership_id>/affection/cooldown/', AffectionCooldownView.as_view(), name='affection-cooldown'),
    path('<int:partnership_id>/affection/<int:affection_id>/read/', ReadAffectionView.as_view(), name='read-affection'),
    path('<int:partnership_id>/journal/', CurrentQuestionView.as_view(), name='current-question'),
    path('<int:partnership_id>/journal/answer/', SubmitAnswerView.as_view(), name='submit-answer'),
    path('<int:partnership_id>/journal/skip/', SkipQuestionView.as_view(), name='skip-question'),
]
