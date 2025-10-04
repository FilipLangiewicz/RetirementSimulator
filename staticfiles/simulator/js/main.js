/**
 * Główny plik JavaScript dla Symulatora Emerytalnego
 */

// Dodaj loading indicator
function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    loader.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    loader.style.zIndex = '9999';
    loader.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Ładowanie...</span>
        </div>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.remove();
    }
}

// Format liczb jako waluty
function formatCurrency(amount) {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN'
    }).format(amount);
}

// Walidacja formularzy
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    return isValid;
}

// Smooth scroll dla linków kotwiowych
document.addEventListener('DOMContentLoaded', function() {
    const anchors = document.querySelectorAll('a[href^="#"]');

    anchors.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Tooltips Bootstrap
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Popovers Bootstrap
document.addEventListener('DOMContentLoaded', function() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});

// Obsługa klawiatury dla dostępności
document.addEventListener('keydown', function(e) {
    // Skip link
    if (e.key === 'Tab' && !e.shiftKey && e.target === document.body) {
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.focus();
        }
    }

    // Escape zamyka modalne okna
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }
});

// Auto-hide alerts
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const alertInstance = new bootstrap.Alert(alert);
            alertInstance.close();
        }, 5000);
    });
});

// Funkcje pomocnicze dla formularzy
function updateRetirementYear() {
    const ageInput = document.getElementById('id_age');
    const genderInput = document.getElementById('id_gender');
    const retirementInput = document.getElementById('id_planned_retirement_year');

    if (ageInput && genderInput && retirementInput) {
        const age = parseInt(ageInput.value);
        const gender = genderInput.value;

        if (age && gender) {
            const retirementAge = gender === 'K' ? 60 : 65;
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - age;
            const plannedYear = birthYear + retirementAge;

            retirementInput.value = plannedYear;
        }
    }
}

// Dodaj event listenery dla automatycznego obliczania wieku emerytury
document.addEventListener('DOMContentLoaded', function() {
    const ageInput = document.getElementById('id_age');
    const genderInput = document.getElementById('id_gender');

    if (ageInput && genderInput) {
        ageInput.addEventListener('change', updateRetirementYear);
        genderInput.addEventListener('change', updateRetirementYear);
    }
});

// Funkcje walidacji specyficzne dla symulatora
function validateAge(age) {
    return age >= 18 && age <= 80;
}

function validateSalary(salary) {
    return salary > 0 && salary <= 1000000;
}

function validateYear(year) {
    const currentYear = new Date().getFullYear();
    return year >= 1970 && year <= currentYear + 50;
}

// Export dla innych modułów
window.SimulatorUtils = {
    showLoading,
    hideLoading,
    formatCurrency,
    validateForm,
    validateAge,
    validateSalary,
    validateYear,
    updateRetirementYear
};
