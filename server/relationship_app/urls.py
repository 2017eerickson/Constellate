from django.urls import path

from relationship_app.views import (
    ConnectView,
    PartnershipDetailView,
    PartnershipListView,
    SpecialDateDetailView,
    SpecialDateListCreateView,
)

urlpatterns = [
    path('connect/', ConnectView.as_view(), name='partnership-connect'),
    path('', PartnershipListView.as_view(), name='partnership-list'),
    path('<int:pk>/', PartnershipDetailView.as_view(), name='partnership-detail'),
    path(
        '<int:partnership_id>/special-dates/',
        SpecialDateListCreateView.as_view(),
        name='special-date-list',
    ),
    path(
        '<int:partnership_id>/special-dates/<int:pk>/',
        SpecialDateDetailView.as_view(),
        name='special-date-detail',
    ),
]
