from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from simulator import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('simulator.urls')),
    path('dashboard/', views.dashboard, name='dashboard')

]

# Dodaj obsługę plików statycznych w trybie DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Konfiguracja panelu administracyjnego
admin.site.site_header = "Symulator Emerytalny ZUS"
admin.site.site_title = "Admin ZUS"
admin.site.index_title = "Panel administracyjny"