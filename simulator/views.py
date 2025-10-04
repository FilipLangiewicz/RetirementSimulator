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
    """Dashboard z timeline - tryb demo bez logowania"""
    # Domyślne dane dla trybu demo
    current_age = 30
    legal_retirement_age = 65
    planned_retirement_year = 2060
    gender = 'M'

    # Przygotuj dane dla timeline z wiekiem
    current_year = date.today().year
    birth_year = current_year - current_age
    planned_retirement_age = planned_retirement_year - birth_year

    # Przygotuj dane JSON dla JavaScript (puste okresy pracy)
    timeline_data = {
        'current_age': current_age,
        'legal_retirement_age': legal_retirement_age,
        'planned_retirement_age': planned_retirement_age,
        'work_periods': []
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
        'monthly_pension': 0
    }

    context = {
        'profile': profile_data,
        'pension_data': pension_data,
        'timeline_data_json': json.dumps(timeline_data),
        'contract_types': ContractType.objects.all(),
        'formatted_pension': '0,00 zł'
    }

    return render(request, 'simulator/dashboard.html', context)