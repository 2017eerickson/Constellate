from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from user_app.views import (
    AdminDeleteUserView,
    ForgotPasswordView,
    GoogleAuthView,
    LoginView,
    LogoutView,
    MeView,
    OnboardingView,
    RegisterView,
    ResetPasswordView,
    VerifyEmailView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('admin/<int:user_id>/', AdminDeleteUserView.as_view(), name='admin-delete-user'),
]
