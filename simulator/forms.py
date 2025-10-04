from django import forms
from .models import UserProfile, WorkPeriod, ContractType
from datetime import date


class UserProfileForm(forms.ModelForm):
    """Formularz profilu użytkownika"""

    class Meta:
        model = UserProfile
        fields = ['age', 'gender', 'salary_gross', 'work_start_year', 'planned_retirement_year']
        widgets = {
            'age': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '18',
                'max': '80',
                'placeholder': 'Podaj swój wiek'
            }),
            'gender': forms.Select(attrs={
                'class': 'form-control'
            }),
            'salary_gross': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': 'np. 5000.00'
            }),
            'work_start_year': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1970',
                'max': str(date.today().year),
                'placeholder': 'np. 2020'
            }),
            'planned_retirement_year': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': str(date.today().year),
                'max': '2080',
                'placeholder': 'np. 2060'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Automatyczne ustawienie planowanego roku emerytury na podstawie płci i wieku
        if 'gender' in self.data and 'age' in self.data:
            try:
                gender = self.data['gender']
                age = int(self.data['age'])
                retirement_age = 60 if gender == 'K' else 65
                planned_year = date.today().year + (retirement_age - age)
                self.fields['planned_retirement_year'].initial = planned_year
            except (ValueError, TypeError):
                pass

    def clean(self):
        cleaned_data = super().clean()
        age = cleaned_data.get('age')
        gender = cleaned_data.get('gender')
        planned_retirement_year = cleaned_data.get('planned_retirement_year')
        work_start_year = cleaned_data.get('work_start_year')

        if age and gender and planned_retirement_year:
            retirement_age_legal = 60 if gender == 'K' else 65
            current_year = date.today().year
            birth_year = current_year - age
            legal_retirement_year = birth_year + retirement_age_legal

            if planned_retirement_year < legal_retirement_year:
                raise forms.ValidationError(
                    f'Nie możesz przejść na emeryturę wcześniej niż w wieku {retirement_age_legal} lat. '
                    f'Najwcześniejszy rok przejścia na emeryturę: {legal_retirement_year}'
                )

        if work_start_year and age:
            birth_year = date.today().year - age
            if work_start_year < birth_year + 15:  # Minimumna 15 lat
                raise forms.ValidationError('Rok rozpoczęcia pracy nie może być wcześniejszy niż 15. rok życia.')

        return cleaned_data


class WorkPeriodForm(forms.ModelForm):
    """Formularz okresu pracy"""

    class Meta:
        model = WorkPeriod
        fields = ['contract_type', 'start_year', 'end_year', 'salary_gross_monthly']
        widgets = {
            'contract_type': forms.Select(attrs={
                'class': 'form-control'
            }),
            'start_year': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1970',
                'max': str(date.today().year + 50)
            }),
            'end_year': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1970',
                'max': str(date.today().year + 50)
            }),
            'salary_gross_monthly': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': 'Wynagrodzenie brutto miesięczne'
            }),
        }

    def clean(self):
        cleaned_data = super().clean()
        start_year = cleaned_data.get('start_year')
        end_year = cleaned_data.get('end_year')

        if start_year and end_year:
            if start_year > end_year:
                raise forms.ValidationError('Rok rozpoczęcia nie może być późniejszy niż rok zakończenia.')

            if end_year - start_year > 50:
                raise forms.ValidationError('Okres pracy nie może przekraczać 50 lat.')

        return cleaned_data


class WorkPeriodAjaxForm(forms.Form):
    """Formularz AJAX do dodawania/edycji okresów pracy w timeline"""
    contract_type = forms.ModelChoiceField(
        queryset=ContractType.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    start_year = forms.IntegerField(
        widget=forms.NumberInput(attrs={'class': 'form-control', 'readonly': True})
    )
    end_year = forms.IntegerField(
        widget=forms.NumberInput(attrs={'class': 'form-control', 'readonly': True})
    )
    salary_gross_monthly = forms.DecimalField(
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'min': '0',
            'placeholder': 'Wynagrodzenie brutto miesięczne'
        })
    )