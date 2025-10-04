from django.urls import path
from . import views

app_name = 'simulator'

urlpatterns = [
    path("", views.home, name="landing"),  # /  -> kopia ZUS
    path("home/", views.app_home, name="home"),
    path('dashboard/', views.dashboard, name='dashboard'),
    path("profil/rozmowa/", views.conversation_profile, name="conversation_profile"),
]