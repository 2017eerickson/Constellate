from django.urls import path

from relationship_app.views import ConnectView, PartnershipDetailView, PartnershipListView

urlpatterns = [
    path('connect/', ConnectView.as_view(), name='partnership-connect'),
    path('', PartnershipListView.as_view(), name='partnership-list'),
    path('<int:pk>/', PartnershipDetailView.as_view(), name='partnership-detail'),
]
