"""
Kalkulator emerytalny – wersja z parametrami rocznymi z Excela,
waloryzacją „w połowie roku” oraz split’em na konto/subkonto.
"""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, getcontext
from datetime import date
from typing import Dict, List, Tuple, Optional

import math
import os

try:
    import pandas as pd
except Exception:
    pd = None  # jeżeli nie ma pandas, użyjemy fallbacku PARAMS_EMBEDDED

getcontext().prec = 28

# --------------------------
# ŁADOWANIE PARAMETRÓW ROCZNYCH
# --------------------------

def load_params_from_excel(path: str) -> Dict[int, Dict[str, float]]:
    """
    Czyta arkusz 'parametry roczne' i zwraca słownik:
    { rok: { 'avg_wage': float, 'val_idx_konto': float, 'val_idx_subkonto': float, 'min_pension': float } }
    """
    if pd is None or not os.path.exists(path):
        return {}

    xls = pd.ExcelFile(path)
    # w pliku nagłówki są w 2. wierszu (0-index:1); wiersze danych od 3. (0-index:2)
    df = pd.read_excel(path, sheet_name="parametry roczne", header=None)
    headers = df.iloc[1].tolist()
    df = df.iloc[2:].copy()
    df.columns = headers
    df = df.rename(columns={headers[0]: "rok"})

    out: Dict[int, Dict[str, float]] = {}
    for _, row in df.iterrows():
        try:
            y = int(row["rok"])
        except Exception:
            continue

        def _f(col: str) -> Optional[float]:
            try:
                v = float(row[col])
                if math.isnan(v):
                    return None
                return v
            except Exception:
                return None

        avg_wage = _f("przeciętne miesięczne wynagrodzenie w gospodarce narodowej**)")
        val_k = _f("wskaźnik waloryzacji składek zewidencjonowanych na koncie oraz kapitału początkowego za dany rok***)")
        val_s = _f("wskaźnik waloryzacji składek zewidencjonowanych na subkoncie za dany rok****)")
        min_p = _f("kwota najniższej emerytury obowiązująca od marca danego roku do lutego następnego roku*****)")

        if avg_wage and val_k and val_s:
            out[y] = {
                "avg_wage": avg_wage,
                "val_idx_konto": val_k,
                "val_idx_subkonto": val_s,
                "min_pension": (min_p or 0.0),
            }
    return out

# Minimalny wbudowany fallback (rozszerz wedle potrzeb)
PARAMS_EMBEDDED: Dict[int, Dict[str, float]] = {
    2019: {"avg_wage": 4918.17, "val_idx_konto": 1.0894, "val_idx_subkonto": 1.0573, "min_pension": 1100.0},
    2020: {"avg_wage": 5167.47, "val_idx_konto": 1.0541, "val_idx_subkonto": 1.0523, "min_pension": 1200.0},
    2021: {"avg_wage": 5662.53, "val_idx_konto": 1.0933, "val_idx_subkonto": 1.0707, "min_pension": 1250.88},
    2022: {"avg_wage": 6346.15, "val_idx_konto": 1.1440, "val_idx_subkonto": 1.0920, "min_pension": 1338.44},
    2023: {"avg_wage": 7155.48, "val_idx_konto": 1.1487, "val_idx_subkonto": 1.0991, "min_pension": 1588.44},
    2024: {"avg_wage": 8181.72, "val_idx_konto": 1.1441, "val_idx_subkonto": 1.0983, "min_pension": 1780.96},
    2025: {"avg_wage": 8766.84, "val_idx_konto": 1.0661, "val_idx_subkonto": 1.1113, "min_pension": 1878.91},
    2026: {"avg_wage": 9312.48, "val_idx_konto": 1.0661, "val_idx_subkonto": 1.1004, "min_pension": 1986.65},
    2027: {"avg_wage": 9850.81, "val_idx_konto": 1.0573, "val_idx_subkonto": 1.0762, "min_pension": 2065.44},
    2028: {"avg_wage": 10378.79, "val_idx_konto": 1.0519, "val_idx_subkonto": 1.0676, "min_pension": 2138.47},
    2029: {"avg_wage": 10926.56, "val_idx_konto": 1.0493, "val_idx_subkonto": 1.0646, "min_pension": 2210.62},
    2030: {"avg_wage": 11497.64, "val_idx_konto": 1.0472, "val_idx_subkonto": 1.0567, "min_pension": 2284.50},
}

def get_params() -> Dict[int, Dict[str, float]]:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "Parametry-III 2025.xlsx")
    params = load_params_from_excel(path)
    return params if params else PARAMS_EMBEDDED


# --------------------------
# DANE POMOCNICZE + KONFIG
# --------------------------

# Proporcje rozbicia 19,52% na konto/subkonto
_EMP_TOTAL = Decimal("0.1952")
_EMP_KONTO = Decimal("0.1222")
_EMP_SUB = Decimal("0.0730")
_SPLIT_K = (_EMP_KONTO / _EMP_TOTAL)  # ~0.626
_SPLIT_S = (_EMP_SUB / _EMP_TOTAL)    # ~0.374

# B2B – łącznie 9,76%, w tych samych proporcjach:
_B2B_TOTAL = Decimal("0.0976")
_B2B_KONTO = (_B2B_TOTAL * _SPLIT_K)  # ~0.0611
_B2B_SUB   = (_B2B_TOTAL * _SPLIT_S)  # ~0.0365

# Działalność – 19,52% od 60% średniej płacy:
_BUS_BASE_FACTOR = Decimal("0.60")

# Kontrakty bez składek:
_ZERO_CONTRACTS = {"TASK", "MANDATE"}

# Minimalna emerytura – weźmiemy z parametrów danego roku (fallback)
MIN_PENSION_FALLBACK = Decimal("1780.96")

# (Twoja) tabela dalszego trwania życia – jak wcześniej
LIFE_EXPECTANCY = {
    60: {"K": 254, "M": 210},
    61: {"K": 244, "M": 202},
    62: {"K": 235, "M": 194},
    63: {"K": 226, "M": 186},
    64: {"K": 217, "M": 178},
    65: {"K": 208, "M": 170},
    66: {"K": 200, "M": 162},
    67: {"K": 192, "M": 154},
    68: {"K": 184, "M": 147},
    69: {"K": 176, "M": 140},
    70: {"K": 169, "M": 133},
}

def _q2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

# --------------------------
# KONSTRUKCJE DANYCH
# --------------------------

@dataclass
class PeriodInput:
    """Minimalny zestaw z WorkPeriod: roczne widełki + płaca referencyjna."""
    start_year: int
    end_year: int
    salary_gross_monthly: Decimal
    contract_name: str
    ref_year: Optional[int] = None  # rok odniesienia do indeksacji (domyślnie start_year)

# --------------------------
# KALKULATOR
# --------------------------

class PensionCalculator:
    def __init__(self, params: Optional[Dict[int, Dict[str, float]]] = None):
        self.params = params or get_params()
        self.current_year = date.today().year

    # --- POMOCNICZE ---

    def avg_wage(self, year: int) -> Decimal:
        rec = self.params.get(year)
        if not rec:
            # prosty extrap/hold – możesz ulepszyć
            near = max(y for y in self.params.keys() if y <= year)
            rec = self.params[near]
        return Decimal(str(rec["avg_wage"]))

    def val_idx_konto(self, year: int) -> Decimal:
        rec = self.params.get(year)
        if rec and rec["val_idx_konto"]:
            return Decimal(str(rec["val_idx_konto"]))
        return Decimal("1.0")

    def val_idx_subkonto(self, year: int) -> Decimal:
        rec = self.params.get(year)
        if rec and rec["val_idx_subkonto"]:
            return Decimal(str(rec["val_idx_subkonto"]))
        return Decimal("1.0")

    def min_pension(self, year: int) -> Decimal:
        rec = self.params.get(year)
        if rec and rec["min_pension"]:
            return Decimal(str(rec["min_pension"]))
        return MIN_PENSION_FALLBACK

    def reverse_index_salary(self, base_salary: Decimal, ref_year: int, target_year: int) -> Decimal:
        """
        Indeksacja odwrotna: rozciąga płacę użytkownika na lata okresu
        wg relacji średnich płac: salary_y = salary_ref * (avg[target] / avg[ref]).
        """
        ref = self.avg_wage(ref_year)
        tgt = self.avg_wage(target_year)
        if ref <= 0:
            return base_salary
        return _q2(base_salary * tgt / ref)

    # --- SKŁADKI ROCZNE ---

    def annual_base_and_rates(self, year: int, salary_monthly: Decimal, contract: str) -> Tuple[Decimal, Decimal, Decimal]:
        """
        Zwraca (podstawa_roczna, rate_konto, rate_subkonto) dla danego roku i kontraktu.
        """
        cname = (contract or "").upper()
        if cname in _ZERO_CONTRACTS:
            return Decimal("0"), Decimal("0"), Decimal("0")

        if cname == "EMPLOYMENT":
            base = salary_monthly * Decimal(12)
            return base, _EMP_KONTO, _EMP_SUB

        if cname == "B2B":
            base = salary_monthly * Decimal(12)
            return base, _B2B_KONTO, _B2B_SUB

        if cname == "BUSINESS":
            # 19,52% od 60% przeciętnego wynagrodzenia
            base_month = self.avg_wage(year) * _BUS_BASE_FACTOR
            base = base_month * Decimal(12)
            return base, _EMP_KONTO, _EMP_SUB  # split taki jak przy 19,52%

        # fallback – jak brak rozpoznania traktuj jak 0%
        return Decimal("0"), Decimal("0"), Decimal("0")

    # --- WALORYZACJA „W POŁOWIE ROKU” ---

    def apply_midyear_valorization(self, year: int, bal_open_prev_year: Decimal, bal_current: Decimal, which: str) -> Decimal:
        """
        Dodaje do bieżącego salda 'bal_current' waloryzację liczona jako:
        (index_year - 1) * balance_open_{year-1}
        'which' = 'konto' | 'subkonto' (wybiera odpowiedni wskaźnik)
        """
        if bal_open_prev_year <= 0:
            return bal_current

        if which == "konto":
            idx = self.val_idx_konto(year)
        else:
            idx = self.val_idx_subkonto(year)

        gain = (idx - Decimal("1.0")) * bal_open_prev_year
        return bal_current + gain

    # --- GŁÓWNE OBLICZENIE ---

    def calculate(self, gender: str, planned_retirement_year: int, birth_year: int, periods: List[PeriodInput]) -> Dict:
        """
        Zwraca słownik z wynikami (kapitał, miesięczna emerytura itd.)
        Uwaga: gender: 'M' | 'K'
        """
        gender = (gender or "M").upper()

        # Rozciągnij okresy do lat, policz składki + waloryzację
        konto_balance = Decimal("0")
        sub_balance   = Decimal("0")

        # trzymamy „opening balance” na początek każdego roku:
        open_konto: Dict[int, Decimal] = {}
        open_sub: Dict[int, Decimal] = {}

        # wyznacz zakres lat, który nas interesuje (do roku emerytury)
        min_year = min(p.start_year for p in periods)
        max_year = planned_retirement_year  # włącznie dodamy składki do roku poprzedzającego emeryturę

        total_work_years = 0
        contrib_breakdown: List[Tuple[int, Decimal, Decimal]] = []  # (rok, konto_add, sub_add)

        last_year_processed = None
        for year in range(min_year, max_year):
            # zachowaj opening (początek roku = saldo z końca poprzedniego)
            open_konto[year] = konto_balance
            open_sub[year]   = sub_balance

            # 1) Waloryzacja „w połowie roku” obliczana od stanu z POCZĄTKU POPRZEDNIEGO ROKU:
            if (year - 1) in open_konto:
                konto_balance = self.apply_midyear_valorization(year, open_konto[year - 1], konto_balance, "konto")
            if (year - 1) in open_sub:
                sub_balance   = self.apply_midyear_valorization(year, open_sub[year - 1],   sub_balance,   "subkonto")

            # 2) Składki za dany rok – zbierz z okresów
            konto_add_year = Decimal("0")
            sub_add_year   = Decimal("0")

            for p in periods:
                if p.start_year <= year <= p.end_year:
                    ref_y = p.ref_year or p.start_year
                    adj_monthly = self.reverse_index_salary(Decimal(p.salary_gross_monthly), ref_y, year)
                    base, rate_k, rate_s = self.annual_base_and_rates(year, adj_monthly, p.contract_name)

                    konto_add = _q2(base * rate_k)
                    sub_add   = _q2(base * rate_s)

                    konto_add_year += konto_add
                    sub_add_year   += sub_add
                    total_work_years += 1  # liczymy „rok pracy” jako udział w danym roku

            # 3) Dodajemy roczne składki do sald
            konto_balance += konto_add_year
            sub_balance   += sub_add_year

            contrib_breakdown.append((year, konto_add_year, sub_add_year))
            last_year_processed = year

        # Wiek emerytalny z planu:
        retirement_age = planned_retirement_year - birth_year

        # Średnie dalsze trwanie życia (miesiące)
        life_months = self._life_expectancy(retirement_age, gender)

        # Kapitał łączny:
        total_capital = konto_balance + sub_balance

        # Miesięczna emerytura: kapitał / (miesiące)
        monthly = Decimal("0.00") if life_months <= 0 else _q2(total_capital / Decimal(life_months))

        # Minimalna emerytura – sprawdź wg ostatniego przeliczonego roku parametry
        check_year = last_year_processed or self.current_year
        min_p = self.min_pension(check_year)

        # Prosty warunek (rozszerz wg płci 20/25 lat jeśli chcesz)
        if monthly < min_p and total_work_years >= (25 if gender == "M" else 20):
            monthly = _q2(min_p)

        return {
            "monthly_pension": monthly,
            "total_contributions_valorized": _q2(total_capital),
            "konto_balance": _q2(konto_balance),
            "subkonto_balance": _q2(sub_balance),
            "life_expectancy_months": life_months,
            "total_work_years": total_work_years,
            "retirement_age": retirement_age,
            "contributions_breakdown": contrib_breakdown,
        }

    # --- pomocnicze: tabela życia ---

    def _life_expectancy(self, retirement_age: int, gender: str) -> int:
        if retirement_age in LIFE_EXPECTANCY:
            return LIFE_EXPECTANCY[retirement_age].get(gender, 200)
        if retirement_age < 60:
            return LIFE_EXPECTANCY[60][gender] + (60 - retirement_age) * 12
        if retirement_age > 70:
            return max(120, LIFE_EXPECTANCY[70][gender] - (retirement_age - 70) * 6)
        return 200
