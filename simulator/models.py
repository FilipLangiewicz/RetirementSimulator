from django.db import models
from django.contrib.auth.models import User
from datetime import date
import calendar


class UserProfile(models.Model):
    """Profil użytkownika z podstawowymi danymi"""
    GENDER_CHOICES = [
        ('M', 'Mężczyzna'),
        ('K', 'Kobieta'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    age = models.IntegerField(verbose_name="Wiek")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, verbose_name="Płeć")
    salary_gross = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Wynagrodzenie brutto")
    work_start_year = models.IntegerField(verbose_name="Rok rozpoczęcia pracy")
    planned_retirement_year = models.IntegerField(verbose_name="Planowany rok przejścia na emeryturę")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profil {self.user.username}"

    @property
    def retirement_age_legal(self):
        """Zwraca prawny wiek emerytalny dla danej płci"""
        return 60 if self.gender == 'K' else 65

    @property
    def birth_year(self):
        """Oblicza rok urodzenia na podstawie wieku"""
        return date.today().year - self.age

    class Meta:
        verbose_name = "Profil użytkownika"
        verbose_name_plural = "Profile użytkowników"


class ContractType(models.Model):
    """Typy umów"""
    CONTRACT_TYPES = [
        ('EMPLOYMENT', 'Umowa o pracę'),
        ('MANDATE', 'Umowa zlecenie'),
        ('TASK', 'Umowa o dzieło'),
        ('BUSINESS', 'Własna działalność gospodarcza'),
        ('B2B', 'Umowa B2B'),
    ]

    name = models.CharField(max_length=20, choices=CONTRACT_TYPES, unique=True)
    display_name = models.CharField(max_length=100)
    zus_percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="Procent składki ZUS")

    def __str__(self):
        return self.display_name

    class Meta:
        verbose_name = "Typ umowy"
        verbose_name_plural = "Typy umów"


class WorkPeriod(models.Model):
    """Okres pracy użytkownika"""
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='work_periods')
    contract_type = models.ForeignKey(ContractType, on_delete=models.CASCADE)
    start_year = models.IntegerField(verbose_name="Rok rozpoczęcia")
    end_year = models.IntegerField(verbose_name="Rok zakończenia")
    salary_gross_monthly = models.DecimalField(max_digits=10, decimal_places=2,
                                               verbose_name="Wynagrodzenie brutto miesięczne")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.contract_type.display_name} ({self.start_year}-{self.end_year})"

    @property
    def work_duration_years(self):
        """Długość okresu pracy w latach"""
        return self.end_year - self.start_year + 1

    @property
    def annual_zus_contribution(self):
        """Roczna składka ZUS"""
        return float(self.salary_gross_monthly) * 12 * float(self.contract_type.zus_percentage) / 100

    class Meta:
        verbose_name = "Okres pracy"
        verbose_name_plural = "Okresy pracy"
        ordering = ['start_year']


class RetirementCalculation(models.Model):
    """Obliczenia emerytalne"""
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='calculations')
    calculated_pension = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Obliczona emerytura")
    total_contributions = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Suma składek")
    life_expectancy_months = models.IntegerField(verbose_name="Dalsze trwanie życia w miesiącach")
    calculation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Obliczenie emerytury dla {self.user_profile.user.username}: {self.calculated_pension} zł"

    class Meta:
        verbose_name = "Obliczenie emerytury"
        verbose_name_plural = "Obliczenia emerytur"
        ordering = ['-calculation_date']