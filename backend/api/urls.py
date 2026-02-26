from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'publications', views.PublicationViewSet)

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('', include(router.urls)),
]
