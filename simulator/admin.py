from django.contrib import admin
from .models import UserProfile, ContractType, WorkPeriod, RetirementCalculation


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'age', 'gender', 'salary_gross', 'work_start_year', 'planned_retirement_year']
    list_filter = ['gender', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ContractType)
class ContractTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name', 'zus_percentage']
    list_editable = ['display_name', 'zus_percentage']


@admin.register(WorkPeriod)
class WorkPeriodAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'contract_type', 'start_year', 'end_year', 'salary_gross_monthly']
    list_filter = ['contract_type', 'start_year']
    search_fields = ['user_profile__user__username']


@admin.register(RetirementCalculation)
class RetirementCalculationAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'calculated_pension', 'total_contributions', 'calculation_date']
    list_filter = ['calculation_date']
    search_fields = ['user_profile__user__username']
    readonly_fields = ['calculation_date']