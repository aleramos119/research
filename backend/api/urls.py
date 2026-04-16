from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"users", views.UserViewSet)
router.register(r"publications", views.PublicationViewSet, basename="publication")
router.register(r"reports", views.ReportViewSet, basename="report")

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("auth/register/", views.register, name="auth_register"),
    path("auth/login/", views.user_login, name="auth_login"),
    path("auth/logout/", views.user_logout, name="auth_logout"),
    path("auth/me/", views.me, name="auth_me"),
    path("search/", views.search, name="search"),
    path("", include(router.urls)),
]
