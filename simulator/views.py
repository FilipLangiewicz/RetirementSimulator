from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import date

from .models import ContractType


def home(request):
    """Strona główna - rozpoczęcie symulacji emerytalnej"""
    return render(request, 'simulator/home.html')


def dashboard(request):
    """Dashboard z timeline prostokątów - tryb demo bez logowania"""
    # Domyślne dane dla trybu demo
    current_age = 30
    legal_retirement_age = 65
    planned_retirement_year = 2060
    gender = 'M'

    # Przygotuj dane dla timeline z wiekiem
    current_year = date.today().year
    birth_year = current_year - current_age
    planned_retirement_age = planned_retirement_year - birth_year

    # Przygotuj dane JSON dla JavaScript (puste aktywności)
    timeline_data = {
        'current_age': current_age,
        'legal_retirement_age': legal_retirement_age,
        'planned_retirement_age': planned_retirement_age,
        'birth_year': birth_year,
        'activities': []
    }

    # Przygotuj obiekt profilu do template
    profile_data = {
        'age': current_age,
        'gender': gender,
        'planned_retirement_year': planned_retirement_year,
        'retirement_age_legal': legal_retirement_age
    }

    # Domyślne dane emerytalne
    pension_data = {
        'total_work_years': 0,
        'total_contributions': 0,
        'monthly_pension': 0,
        'retirement_age': planned_retirement_age
    }

    # Pobierz wszystkie typy umów z bazy danych
    contract_types = ContractType.objects.all()
    if not contract_types.exists():
        # Jeśli brak typów umów, utwórz domyślne
        default_types = [
            {'name': 'EMPLOYMENT', 'display_name': 'Umowa o pracę', 'zus_percentage': 19.52},
            {'name': 'MANDATE', 'display_name': 'Umowa zlecenie', 'zus_percentage': 19.52},
            {'name': 'TASK', 'display_name': 'Umowa o dzieło', 'zus_percentage': 0.00},
            {'name': 'BUSINESS', 'display_name': 'Własna działalność gospodarcza', 'zus_percentage': 19.52},
            {'name': 'B2B', 'display_name': 'Umowa B2B', 'zus_percentage': 0.00},
        ]

        for contract_data in default_types:
            ContractType.objects.get_or_create(
                name=contract_data['name'],
                defaults={
                    'display_name': contract_data['display_name'],
                    'zus_percentage': contract_data['zus_percentage']
                }
            )

        contract_types = ContractType.objects.all()

    context = {
        'profile': profile_data,
        'pension_data': pension_data,
        'timeline_data_json': json.dumps(timeline_data),
        'contract_types': contract_types,
        'formatted_pension': '0,00 zł'
    }

    return render(request, 'simulator/dashboard.html', context)