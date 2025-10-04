from django.urls import path
from . import views

app_name = 'simulator'

urlpatterns = [
    path('', views.home, name='home'),
    path('profile/create/', views.profile_create, name='profile_create'),
    path('profile/edit/', views.profile_edit, name='profile_edit'),
    path('dashboard/', views.dashboard, name='dashboard'),

    # AJAX endpoints
    path('ajax/work-period/', views.ajax_work_period, name='ajax_work_period'),
    path('ajax/calculate-pension/', views.calculate_pension, name='calculate_pension'),
    path('ajax/update-retirement-year/', views.update_retirement_year, name='update_retirement_year'),
]
'''

print(urls_code)
print("\n")

# Admin
print("=== ADMIN.PY ===")
admin_code = '''
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