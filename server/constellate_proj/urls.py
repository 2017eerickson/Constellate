from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/users/', include('user_app.urls')),
    path('api/v1/relationships/', include('relationship_app.urls')),
]
