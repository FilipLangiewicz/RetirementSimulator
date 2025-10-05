from django.urls import path
from . import views
from .views import AdvisorChatView, advisor_chat_api

app_name = 'simulator'

urlpatterns = [
    path("", views.home, name="landing"),  # /  -> kopia ZUS
    path("home/", views.app_home, name="home"),
    path('dashboard/', views.dashboard, name='dashboard'),
    path("profil/rozmowa/", views.conversation_profile, name="conversation_profile"),
    path('update-profile/', views.update_profile, name='update_profile'),
    path("doradca/", AdvisorChatView.as_view(), name="advisor_chat"),
    path("api/doradca/", advisor_chat_api, name="advisor_chat_api"),
]