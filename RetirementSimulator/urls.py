from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Usunięto path('admin/', admin.site.urls) - nie potrzebujemy panelu admin
    path('', include('simulator.urls')),
]

# Dodaj obsługę plików statycznych w trybie DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)