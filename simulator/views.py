from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.db import transaction
from django.core.serializers.json import DjangoJSONEncoder
import json
from datetime import date

from .models import UserProfile, WorkPeriod, ContractType, RetirementCalculation
from .forms import UserProfileForm, WorkPeriodForm, WorkPeriodAjaxForm
from .utils.pension_calculator import get_pension_calculation, format_currency


def home(request):
    """Strona główna - rozpoczęcie symulacji emerytalnej"""
    return render(request, 'simulator/home.html')


def dashboard(request):
    """Dashboard z timeline - działa bez logowania"""
    # Sprawdź czy użytkownik ma profil
    profile = None
    work_periods = []
    pension_data = {}

    if request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            work_periods = WorkPeriod.objects.filter(user_profile=profile).order_by('start_year')
            pension_data = get_pension_calculation(profile)
        except UserProfile.DoesNotExist:
            pass

    # Domyślne dane dla trybu demo
    if not profile:
        profile_data = {
            'age': 30,
            'gender': 'M',
            'planned_retirement_year': 2060,
            'retirement_age_legal': 65
        }
    else:
        profile_data = profile

    # Przygotuj dane dla timeline z wiekiem
    current_year = date.today().year
    current_age = profile_data.get('age', 30) if hasattr(profile_data, 'get') else profile_data['age']
    birth_year = current_year - current_age

    # Oblicz kluczowe wieki
    legal_retirement_age = profile_data.get('retirement_age_legal', 65) if hasattr(profile_data, 'get') else \
    profile_data['retirement_age_legal']
    planned_retirement_year = profile_data.get('planned_retirement_year', 2060) if hasattr(profile_data, 'get') else \
    profile_data['planned_retirement_year']
    planned_retirement_age = planned_retirement_year - birth_year

    # Przygotuj dane JSON dla JavaScript
    timeline_data = {
        'current_age': current_age,
        'legal_retirement_age': legal_retirement_age,
        'planned_retirement_age': planned_retirement_age,
        'work_periods': [
            {
                'id': wp.id,
                'start_year': wp.start_year,
                'end_year': wp.end_year,
                'contract_type': wp.contract_type.display_name,
                'contract_type_id': wp.contract_type.id,
                'salary': float(wp.salary_gross_monthly)
            }
            for wp in work_periods
        ] if work_periods else []
    }

    # Formatuj emeryturę
    formatted_pension = '0,00 zł'
    if pension_data and 'monthly_pension' in pension_data:
        formatted_pension = format_currency(pension_data['monthly_pension'])

    context = {
        'profile': profile_data,
        'work_periods': work_periods,
        'pension_data': pension_data,
        'timeline_data_json': json.dumps(timeline_data, cls=DjangoJSONEncoder),
        'contract_types': ContractType.objects.all(),
        'formatted_pension': formatted_pension
    }

    return render(request, 'simulator/dashboard.html', context)


def profile_create(request):
    """Tworzenie profilu użytkownika - wymaga logowania"""
    if not request.user.is_authenticated:
        return redirect('admin:login')

    # Sprawdź czy użytkownik już ma profil
    try:
        profile = UserProfile.objects.get(user=request.user)
        return redirect('simulator:dashboard')
    except UserProfile.DoesNotExist:
        pass

    if request.method == 'POST':
        form = UserProfileForm(request.POST)
        if form.is_valid():
            profile = form.save(commit=False)
            profile.user = request.user
            profile.save()
            messages.success(request, 'Profil został utworzony pomyślnie!')
            return redirect('simulator:dashboard')
    else:
        form = UserProfileForm()

    return render(request, 'simulator/profile_form.html', {
        'form': form,
        'title': 'Utwórz profil emerytalny'
    })


def profile_edit(request):
    """Edycja profilu użytkownika - wymaga logowania"""
    if not request.user.is_authenticated:
        return redirect('admin:login')

    profile = get_object_or_404(UserProfile, user=request.user)

    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profil został zaktualizowany!')
            return redirect('simulator:dashboard')
    else:
        form = UserProfileForm(instance=profile)

    return render(request, 'simulator/profile_form.html', {
        'form': form,
        'title': 'Edytuj profil emerytalny',
        'profile': profile
    })


@csrf_exempt
def ajax_work_period(request):
    """AJAX endpoint do dodawania/edycji/usuwania okresów pracy"""
    # Działa tylko dla zalogowanych użytkowników z profilem
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'Profile not found'}, status=404)

    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action')

        if action == 'create':
            return _create_work_period(profile, data)
        elif action == 'update':
            return _update_work_period(profile, data)
        elif action == 'delete':
            return _delete_work_period(profile, data)

    return JsonResponse({'error': 'Invalid request'}, status=400)


def _create_work_period(profile, data):
    """Tworzy nowy okres pracy"""
    try:
        contract_type = ContractType.objects.get(id=data['contract_type_id'])

        work_period = WorkPeriod.objects.create(
            user_profile=profile,
            contract_type=contract_type,
            start_year=data['start_year'],
            end_year=data['end_year'],
            salary_gross_monthly=data['salary_gross_monthly']
        )

        return JsonResponse({
            'success': True,
            'work_period': {
                'id': work_period.id,
                'start_year': work_period.start_year,
                'end_year': work_period.end_year,
                'contract_type': work_period.contract_type.display_name,
                'salary': float(work_period.salary_gross_monthly)
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


def _update_work_period(profile, data):
    """Aktualizuje istniejący okres pracy"""
    try:
        work_period = WorkPeriod.objects.get(
            id=data['work_period_id'],
            user_profile=profile
        )

        if 'contract_type_id' in data:
            work_period.contract_type = ContractType.objects.get(id=data['contract_type_id'])
        if 'start_year' in data:
            work_period.start_year = data['start_year']
        if 'end_year' in data:
            work_period.end_year = data['end_year']
        if 'salary_gross_monthly' in data:
            work_period.salary_gross_monthly = data['salary_gross_monthly']

        work_period.save()

        return JsonResponse({
            'success': True,
            'work_period': {
                'id': work_period.id,
                'start_year': work_period.start_year,
                'end_year': work_period.end_year,
                'contract_type': work_period.contract_type.display_name,
                'salary': float(work_period.salary_gross_monthly)
            }
        })
    except WorkPeriod.DoesNotExist:
        return JsonResponse({'error': 'Work period not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


def _delete_work_period(profile, data):
    """Usuwa okres pracy"""
    try:
        work_period = WorkPeriod.objects.get(
            id=data['work_period_id'],
            user_profile=profile
        )
        work_period.delete()

        return JsonResponse({'success': True})
    except WorkPeriod.DoesNotExist:
        return JsonResponse({'error': 'Work period not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


def calculate_pension(request):
    """AJAX endpoint do przeliczania emerytury"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        profile = UserProfile.objects.get(user=request.user)
        pension_data = get_pension_calculation(profile)

        # Zapisz obliczenia w bazie danych
        calculation = RetirementCalculation.objects.create(
            user_profile=profile,
            calculated_pension=pension_data['monthly_pension'],
            total_contributions=pension_data['total_contributions'],
            life_expectancy_months=pension_data['life_expectancy_months']
        )

        return JsonResponse({
            'success': True,
            'pension_data': {
                'monthly_pension': float(pension_data['monthly_pension']),
                'formatted_pension': format_currency(pension_data['monthly_pension']),
                'total_contributions': float(pension_data['total_contributions']),
                'life_expectancy_months': pension_data['life_expectancy_months'],
                'total_work_years': pension_data['total_work_years'],
                'retirement_age': pension_data['retirement_age']
            }
        })
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'Profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def update_retirement_year(request):
    """AJAX endpoint do aktualizacji planowanego roku emerytury"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            profile = UserProfile.objects.get(user=request.user)

            new_year = int(data['planned_retirement_year'])
            birth_year = date.today().year - profile.age
            legal_retirement_year = birth_year + profile.retirement_age_legal

            if new_year < legal_retirement_year:
                return JsonResponse({
                    'error': f'Nie można przejść na emeryturę wcześniej niż w {legal_retirement_year} roku'
                }, status=400)

            profile.planned_retirement_year = new_year
            profile.save()

            return JsonResponse({'success': True, 'new_year': new_year})
        except UserProfile.DoesNotExist:
            return JsonResponse({'error': 'Profile not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request'}, status=400)