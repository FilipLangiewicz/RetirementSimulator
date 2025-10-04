"""
Kalkulator emerytalny zgodny z polskim prawem i zasadami ZUS
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import Dict, List, Tuple


class PensionCalculator:
    """Kalkulator emerytalny na podstawie przepisów ZUS"""

    # Stawki składek emerytalnych dla różnych typów umów (w %)
    ZUS_RATES = {
        'EMPLOYMENT': Decimal('19.52'),  # Umowa o pracę
        'MANDATE': Decimal('19.52'),  # Umowa zlecenie
        'TASK': Decimal('0.00'),  # Umowa o dzieło - brak składek
        'BUSINESS': Decimal('19.52'),  # Działalność gospodarcza
        'B2B': Decimal('0.00'),  # B2B - zwykle brak składek
    }

    # Minimalne wynagrodzenie dla składek ZUS (2025)
    MIN_SALARY_ZUS = Decimal('4300.00')

    # Wskaźniki waloryzacji (przykładowe, na podstawie historycznych danych)
    VALORIZATION_RATE = Decimal('1.035')  # 3.5% rocznie średnio

    # Tabela średniego dalszego trwania życia (w miesiącach)
    # Na podstawie danych GUS 2025
    LIFE_EXPECTANCY = {
        60: {'K': 254, 'M': 210},  # Kobiety: ~21 lat, Mężczyźni: ~17.5 lat
        61: {'K': 244, 'M': 202},
        62: {'K': 235, 'M': 194},
        63: {'K': 226, 'M': 186},
        64: {'K': 217, 'M': 178},
        65: {'K': 208, 'M': 170},
        66: {'K': 200, 'M': 162},
        67: {'K': 192, 'M': 154},
        68: {'K': 184, 'M': 147},
        69: {'K': 176, 'M': 140},
        70: {'K': 169, 'M': 133},
    }

    def __init__(self):
        self.current_year = date.today().year

    def calculate_monthly_contribution(self, salary: Decimal, contract_type: str) -> Decimal:
        """Oblicza miesięczną składkę emerytalną"""
        rate = self.ZUS_RATES.get(contract_type, Decimal('0.00'))

        # Dla niektórych umów stosujemy minimum
        if contract_type in ['EMPLOYMENT', 'MANDATE', 'BUSINESS']:
            salary = max(salary, self.MIN_SALARY_ZUS)

        contribution = salary * rate / 100
        return contribution.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_annual_contribution(self, salary: Decimal, contract_type: str) -> Decimal:
        """Oblicza roczną składkę emerytalną"""
        monthly = self.calculate_monthly_contribution(salary, contract_type)
        return monthly * 12

    def valorize_contributions(self, contributions: List[Tuple[int, Decimal]]) -> Decimal:
        """
        Waloryzuje składki emerytalne

        Args:
            contributions: Lista tupli (rok, kwota_składki)

        Returns:
            Zwaloryzowana suma składek
        """
        total = Decimal('0.00')

        for year, contribution in contributions:
            years_diff = self.current_year - year
            valorized = contribution * (self.VALORIZATION_RATE ** years_diff)
            total += valorized

        return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_life_expectancy_months(self, retirement_age: int, gender: str) -> int:
        """Oblicza średnie dalsze trwanie życia w miesiącach"""
        if retirement_age in self.LIFE_EXPECTANCY:
            return self.LIFE_EXPECTANCY[retirement_age].get(gender, 200)

        # Interpolacja dla wieku poza tabelą
        if retirement_age < 60:
            return self.LIFE_EXPECTANCY[60][gender] + (60 - retirement_age) * 12
        elif retirement_age > 70:
            return max(120, self.LIFE_EXPECTANCY[70][gender] - (retirement_age - 70) * 6)

        return 200  # Wartość domyślna

    def calculate_pension(self, user_profile, work_periods: List) -> Dict:
        """
        Główna metoda obliczania emerytury

        Args:
            user_profile: Model UserProfile
            work_periods: Lista okresów pracy (WorkPeriod)

        Returns:
            Dict z wynikami obliczeń
        """
        contributions = []
        total_work_years = 0

        # Zbieranie składek z wszystkich okresów pracy
        for period in work_periods:
            for year in range(period.start_year, period.end_year + 1):
                annual_contribution = self.calculate_annual_contribution(
                    period.salary_gross_monthly,
                    period.contract_type.name
                )
                contributions.append((year, annual_contribution))
                total_work_years += 1

        # Waloryzacja składek
        total_valorized_contributions = self.valorize_contributions(contributions)

        # Obliczenie wieku przejścia na emeryturę
        birth_year = self.current_year - user_profile.age
        retirement_age = user_profile.planned_retirement_year - birth_year

        # Średnie dalsze trwanie życia
        life_expectancy_months = self.calculate_life_expectancy_months(
            retirement_age, user_profile.gender
        )

        # Obliczenie emerytury: Kapitał / Średnie dalsze trwanie życia
        if life_expectancy_months > 0:
            monthly_pension = total_valorized_contributions / life_expectancy_months
        else:
            monthly_pension = Decimal('0.00')

        # Sprawdzenie minimalnej emerytury
        min_pension = Decimal('1780.96')  # Minimalna emerytura 2025
        if monthly_pension < min_pension and total_work_years >= 20:  # 20 lat dla kobiet, 25 dla mężczyzn
            monthly_pension = min_pension

        return {
            'monthly_pension': monthly_pension.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'total_contributions': total_valorized_contributions,
            'life_expectancy_months': life_expectancy_months,
            'total_work_years': total_work_years,
            'retirement_age': retirement_age,
            'contributions_breakdown': contributions
        }

    def calculate_replacement_rate(self, pension: Decimal, last_salary: Decimal) -> Decimal:
        """Oblicza stopę zastąpienia (pension/salary ratio)"""
        if last_salary > 0:
            return (pension / last_salary * 100).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
        return Decimal('0.0')


# Funkcje pomocnicze do integracji z Django

def get_pension_calculation(user_profile):
    """Funkcja do wywoływania z widoków Django"""
    from simulator.models import WorkPeriod

    calculator = PensionCalculator()
    work_periods = WorkPeriod.objects.filter(user_profile=user_profile).order_by('start_year')

    if not work_periods.exists():
        return {
            'monthly_pension': Decimal('0.00'),
            'total_contributions': Decimal('0.00'),
            'life_expectancy_months': 0,
            'total_work_years': 0,
            'retirement_age': 0,
            'error': 'Brak danych o okresach pracy'
        }

    return calculator.calculate_pension(user_profile, work_periods)


def format_currency(amount: Decimal) -> str:
    """Formatuje kwotę jako walutę polską"""
    return f"{amount:,.2f} zł".replace(',', ' ')