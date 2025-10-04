from django.apps import AppConfig


class SimulatorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'simulator'
    verbose_name = 'Symulator Emerytalny'

    def ready(self):
        # Import sygnałów jeśli są potrzebne
        pass