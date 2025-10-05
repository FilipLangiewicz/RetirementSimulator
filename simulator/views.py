from django.shortcuts import render, redirect
from django.urls import reverse
from datetime import date
import json
from .models import ContractType
from simulator.models import WorkPeriod
from decimal import Decimal
from simulator.utils.pension_calculator import PeriodInput


def home(request):
    """Strona główna - rozpoczęcie symulacji emerytalnej"""
    return render(request, 'simulator/Strona główna - ZUS.html')


def app_home(request):
    return render(request, "simulator/home.html")


def _to_int(val, default=None):
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def conversation_session(request):
    """Wygodny odczyt danych z sesji."""
    return request.session.get("profile_conversation") or {}


def dashboard(request):
    """Dashboard z timeline prostokątów - tryb demo bez logowania"""
    # ---- DOMYŚLNE DANE (fallback) ----
    current_age = 30
    legal_retirement_age = 40
    planned_retirement_year = 2060
    gender = 'M'  # 'M' lub 'K' na potrzeby Twoich wyliczeń/wyświetlania

    # ---- NADPISANIE DANYMI Z SESJI (jeśli są) ----
    sess = conversation_session(request)
    full_name = sess.get("full_name", "").strip()
    first_name = full_name.split()[0] if full_name else "Użytkowniku"
    # rok urodzenia → wylicz wiek
    dob_year = _to_int(sess.get("dob_year"))
    if dob_year:
        this_year = date.today().year
        calc_age = this_year - dob_year
        if 0 < calc_age < 120:
            current_age = calc_age

    # płeć z rozmowy: "Mężczyzna"/"Kobieta" → mapuj na 'M'/'K'
    sess_gender = (sess.get("gender") or "").strip()
    if sess_gender == "Kobieta":
        gender = 'K'
    elif sess_gender == "Mężczyzna":
        gender = 'M'

    legal_retirement_age = 60 if gender == 'K' else 65

    # jeśli chcesz też brać „cel emerytury” (opcjonalnie do prezentacji)
    target_pension = _to_int(sess.get("target_pension"))

    # ---- Twoje dotychczasowe wyliczenia ----
    current_year = date.today().year
    birth_year = current_year - current_age
    planned_retirement_age = legal_retirement_age

    timeline_data = {
        'current_age': current_age,
        'legal_retirement_age': legal_retirement_age,
        'planned_retirement_age': planned_retirement_age,
        'birth_year': birth_year,
        'gender': gender,
        'activities': []
    }

    profile_data = {
        'age': current_age,  # zostawiam, bo Twoje template może tego używać
        'gender': gender,  # 'M' / 'K'
        'planned_retirement_year': planned_retirement_year,
        'retirement_age_legal': legal_retirement_age,
        'dob_year': dob_year,  # dorzucam – jeśli chcesz wyświetlać rok
        'target_pension': target_pension,  # dorzucam – jeśli chcesz pokazać cel
    }

    pension_data = {
        'total_work_years': 0,
        'total_contributions': 0,
        'monthly_pension': target_pension or 0,  # jeśli chcesz zasilić czymkolwiek
        'retirement_age': planned_retirement_age
    }

    # ---- ContractType jak było ----
    contract_types = ContractType.objects.all()
    if not contract_types.exists():
        default_types = [
            {'name': 'EMPLOYMENT', 'display_name': 'Umowa o pracę', 'zus_percentage': 19.52},
            {'name': 'MANDATE', 'display_name': 'Umowa zlecenie', 'zus_percentage': 19.52},
            {'name': 'TASK', 'display_name': 'Umowa o dzieło', 'zus_percentage': 0.00},
            {'name': 'BUSINESS', 'display_name': 'Własna działalność gospodarcza', 'zus_percentage': 19.52},
            {'name': 'B2B', 'display_name': 'Umowa B2B', 'zus_percentage': 9.76},
        ]
        for ct in default_types:
            ContractType.objects.get_or_create(
                name=ct['name'],
                defaults={'display_name': ct['display_name'], 'zus_percentage': ct['zus_percentage']}
            )
        contract_types = ContractType.objects.all()

    pension_amount = target_pension or 0
    pyramid_info = get_pyramid_level(pension_amount)

    context = {
        'profile': profile_data,
        'pension_data': pension_data,
        'timeline_data_json': json.dumps(timeline_data),
        'contract_types': contract_types,
        'formatted_pension': f"{(target_pension or 0):,} zł".replace(",", " ").replace(".0", ""),
        'pyramid_level': pyramid_info['level'],
        'pyramid_title': pyramid_info['title'],
        'pyramid_description': pyramid_info['description'],
        'pyramid_range': pyramid_info['range'],
        'pyramid_text_class': pyramid_info['text_class'],
        'pyramid_border_class': pyramid_info['border_class'],
        'first_name': first_name
    }
    return render(request, 'simulator/dashboard.html', context)

def conversation_profile(request):
    if request.method == "POST":
        data = {
            "full_name": request.POST.get("full_name", "").strip(),
            "dob_day": request.POST.get("dob_day"),
            "dob_month": request.POST.get("dob_month"),
            "dob_year": request.POST.get("dob_year"),
            "gender": request.POST.get("gender"),
            "target_pension": request.POST.get("target_pension"),
        }
        request.session["profile_conversation"] = data
        request.session.modified = True  # DODAJ TO! Wymusza zapis sesji

        # TODO: tu możesz zapisać do modelu Użytkownika / Profilu
        return redirect(reverse("simulator:dashboard"))
    return render(request, "simulator/conversation_form.html")

def build_periods(user_profile) -> list:
    periods = []
    qs = WorkPeriod.objects.filter(user_profile=user_profile).order_by("start_year")
    for wp in qs:
        periods.append(
            PeriodInput(
                start_year=wp.start_year,
                end_year=wp.end_year,
                salary_gross_monthly=Decimal(wp.salary_gross_monthly),
                contract_name=wp.contract_type.name,  # 'EMPLOYMENT', 'MANDATE', 'TASK', 'BUSINESS', 'B2B'
                ref_year=wp.start_year,               # indeksacja odwrotna względem początku okresu
            )
        )
    return periods

def get_pyramid_level(pension_amount):
    """Zwraca numer poziomu piramidy (0-5) oraz szczegóły dla danej emerytury"""
    
    levels = [
    {
        'max': 1000,
        'level': 0,
        'title': 'Warstwa 0 – Brak zabezpieczenia',
        'description': 'Przy emeryturze w wysokości od 0 do 1000 zł miesięcznie nie będziesz w stanie zaspokoić nawet podstawowych potrzeb. Nie starczy Ci na jedzenie, leki, mieszkanie ani opłaty za rachunki. Taka kwota nie pozwoli na samodzielne funkcjonowanie i oznacza całkowitą zależność od pomocy bliskich lub wsparcia społecznego.',
        'range': '0 - 1 000 zł',
        'text_class': 'text-danger',
        'border_class': 'border-danger'
    },
    {
        'max': 2000,
        'level': 1,
        'title': 'Warstwa 1 – Podstawowe potrzeby',
        'description': 'Przy emeryturze w wysokości od 1 000 do 2 000 zł miesięcznie będziesz w stanie pokryć jedynie najprostsze potrzeby, takie jak zakup chleba, mleka, warzyw, mięsa i podstawowych leków. Zabraknie Ci pieniędzy na czynsz, rachunki, transport czy ubrania.',
        'range': '1 000 - 2 000 zł',
        'text_class': 'text-warning',
        'border_class': 'border-warning'
    },
    {
        'max': 3500,
        'level': 2,
        'title': 'Warstwa 2 – Mieszkanie i rachunki',
        'description': 'Emerytura w przedziale od 2 000 do 3 500 zł pozwoli Ci opłacić mieszkanie, rachunki za prąd, gaz i wodę, a także zapewnić podstawowe jedzenie oraz leki. Będziesz mógł pokryć koszty podstawowego transportu. Zabraknie Ci jednak pieniędzy na dodatkowe leczenie, zakup nowych ubrań czy podstawowe formy rozrywki.',
        'range': '2 000 - 3 500 zł',
        'text_class': 'text-info',
        'border_class': 'border-info'
    },
    {
        'max': 6000,
        'level': 3,
        'title': 'Warstwa 3 – Zdrowie i codzienny komfort',
        'description': 'Przy emeryturze wynoszącej od 3 500 do 6 000 zł będziesz mógł pokryć wszystkie podstawowe koszty życia, w tym mieszkanie, rachunki, transport i lepszej jakości jedzenie. Będziesz miał możliwość zakupu ubrań i obuwia, opłacenia internetu i telefonu oraz pokrycia kosztów podstawowych badań i leków. Zabraknie Ci jednak środków na wakacje, hobby czy zakupy o charakterze luksusowym.',
        'range': '3 500 - 6 000 zł',
        'text_class': 'text-primary',
        'border_class': 'border-primary'
    },
    {
        'max': 10000,
        'level': 4,
        'title': 'Warstwa 4 – Rozrywka i wypoczynek',
        'description': 'Emerytura w przedziale od 6 000 do 10 000 zł pozwoli Ci nie tylko pokryć wszystkie niezbędne wydatki, lecz także zapewni dodatkowy komfort. Będziesz mógł chodzić do kina, teatru czy restauracji, pozwolić sobie na krótkie wakacje w Polsce oraz rozwijać hobby. Nadal jednak zabraknie Ci środków na regularne wakacje zagraniczne, nowy samochód czy drogie prezenty.',
        'range': '6 000 - 10 000 zł',
        'text_class': 'text-success',
        'border_class': 'border-success'
    },
    {
        'max': float('inf'),
        'level': 5,
        'title': 'Warstwa 5 – Luksus',
        'description': 'Emerytura w wysokości powyżej 10 000 zł zapewni Ci pełny komfort życia. Będziesz mógł realizować wszystkie potrzeby, w tym podróże zagraniczne, zakup nowego samochodu, korzystanie z dóbr luksusowych, rozwijanie hobby i kupowanie prezentów dla bliskich. Na tym poziomie Twoja emerytura nie będzie w zasadzie ograniczać możliwości konsumpcji.',
        'range': 'powyżej 10 000 zł',
        'text_class': 'text-success',
        'border_class': 'border-success'
    }
]
    
    for level_data in levels:
        if pension_amount <= level_data['max']:
            return level_data
    
    return levels[-1]  # fallback do najwyższego poziomu
