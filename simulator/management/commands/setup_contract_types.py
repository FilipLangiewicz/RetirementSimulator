from django.core.management.base import BaseCommand
from simulator.models import ContractType


class Command(BaseCommand):
    help = 'Inicjalizuje typy umów z odpowiednimi stawkami ZUS'

    def handle(self, *args, **options):
        contract_types = [
            {
                'name': 'EMPLOYMENT',
                'display_name': 'Umowa o pracę',
                'zus_percentage': 19.52
            },
            {
                'name': 'MANDATE',
                'display_name': 'Umowa zlecenie',
                'zus_percentage': 19.52
            },
            {
                'name': 'TASK',
                'display_name': 'Umowa o dzieło',
                'zus_percentage': 0.00
            },
            {
                'name': 'BUSINESS',
                'display_name': 'Własna działalność gospodarcza',
                'zus_percentage': 19.52
            },
            {
                'name': 'B2B',
                'display_name': 'Umowa B2B',
                'zus_percentage': 0.00
            },
        ]

        for contract_data in contract_types:
            contract_type, created = ContractType.objects.get_or_create(
                name=contract_data['name'],
                defaults={
                    'display_name': contract_data['display_name'],
                    'zus_percentage': contract_data['zus_percentage']
                }
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Utworzono typ umowy: {contract_type.display_name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Typ umowy już istnieje: {contract_type.display_name}')
                )

        self.stdout.write(self.style.SUCCESS('Inicjalizacja typów umów zakończona pomyślnie!'))

