from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from user_app.views import GoogleAuthView, MeView, OnboardingView

urlpatterns = [
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
