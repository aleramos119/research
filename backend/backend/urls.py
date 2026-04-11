"""
URL configuration for backend project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# PDFs are served through /api/publications/<id>/file/ (auth-checked).
# Avatars are public images served directly from /media/avatars/ in development.
if settings.DEBUG:
    urlpatterns += static('/media/avatars/', document_root=settings.MEDIA_ROOT / 'avatars')
