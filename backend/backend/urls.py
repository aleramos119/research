"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# Media files are served through /api/publications/<id>/file/ (auth-checked).
# Raw /media/ URLs are intentionally NOT exposed, even in development.
