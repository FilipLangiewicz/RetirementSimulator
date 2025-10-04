/**
 * Timeline z prostokątami - każdy rok to osobny blok
 * Implementuje dwustopniowy proces wyboru aktywności
 */

class RectangleTimeline {
    constructor() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedBlocks = [];
        this.isAgeMode = true; // true = wiek życia, false = lata kalendarzowe

        // Dane aplikacji
        this.appData = {
            currentAge: 30,
            gender: 'M',
            birthYear: 1995,
            legalRetirementAge: 65,
            plannedRetirementAge: 65,
            activities: [] // Tablica aktywności: {startAge, endAge, type, contractType?, salary?}
        };

        this.init();
    }

    init() {
        this.setupAppData();
        this.renderTimeline();
        this.bindEvents();
        this.updatePensionDisplay();
    }

    setupAppData() {
        const currentYear = new Date().getFullYear();
        this.appData.birthYear = currentYear - this.appData.currentAge;
        this.appData.legalRetirementAge = this.appData.gender === 'K' ? 60 : 65;
        this.appData.plannedRetirementAge = this.appData.legalRetirementAge;
    }

    renderTimeline() {
        this.renderGrid();
        this.renderLabels();
        this.updateTimelineMode();
    }

    renderGrid() {
        const grid = document.getElementById('timeline-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // Tworzymy 90 prostokątów (lata 10-100)
        for (let age = 10; age <= 99; age++) {
            const block = document.createElement('div');
            block.className = 'year-block';
            block.dataset.age = age;

            // Oznacz specjalne wieki
            if (age === this.appData.currentAge) {
                block.classList.add('current-age');
            }
            if (age === this.appData.legalRetirementAge) {
                block.classList.add('legal-retirement');
            }
            if (age === this.appData.plannedRetirementAge) {
                block.classList.add('planned-retirement');
            }

            // Sprawdź czy ten wiek ma przypisaną aktywność
            const activity = this.findActivityForAge(age);
            if (activity) {
                block.classList.add(activity.type);
                if (activity.type === 'work') {
                    block.textContent = activity.contractType ? activity.contractType.substring(0, 3) : 'PR';
                } else if (activity.type === 'sick-leave') {
                    block.textContent = 'UZ';
                } else if (activity.type === 'break') {
                    block.textContent = 'PR';
                }
            }

            grid.appendChild(block);
        }
    }

    renderLabels() {
        const labelsContainer = document.getElementById('year-labels');
        if (!labelsContainer) return;

        labelsContainer.innerHTML = '';

        // Etykiety co 10 lat lub co 10 lat kalendarzowych
        for (let i = 0; i < 90; i += 10) {
            const label = document.createElement('div');
            label.className = 'year-label';

            if (this.isAgeMode) {
                label.textContent = (10 + i).toString();
            } else {
                const year = this.appData.birthYear + 10 + i;
                label.textContent = year.toString();
            }

            labelsContainer.appendChild(label);
        }
    }

    findActivityForAge(age) {
        return this.appData.activities.find(activity =>
            age >= activity.startAge && age <= activity.endAge
        );
    }

    bindEvents() {
        const grid = document.getElementById('timeline-grid');
        const modeSwitch = document.getElementById('timelineMode');
        const salarySlider = document.getElementById('salarySlider');

        // Timeline events
        if (grid) {
            grid.addEventListener('mousedown', this.onMouseDown.bind(this));
            grid.addEventListener('mousemove', this.onMouseMove.bind(this));
            grid.addEventListener('mouseup', this.onMouseUp.bind(this));
            grid.addEventListener('mouseleave', this.onMouseUp.bind(this));
        }

        // Mode switch
        if (modeSwitch) {
            modeSwitch.addEventListener('change', this.toggleTimelineMode.bind(this));
        }

        // Activity selection
        document.querySelectorAll('.activity-btn').forEach(btn => {
            btn.addEventListener('click', this.selectActivity.bind(this));
        });

        // Salary slider
        if (salarySlider) {
            salarySlider.addEventListener('input', this.updateSalaryDisplay.bind(this));
        }

        // Modal events
        const saveWorkDetails = document.getElementById('saveWorkDetails');
        const saveProfile = document.getElementById('saveProfile');

        if (saveWorkDetails) {
            saveWorkDetails.addEventListener('click', this.saveWorkDetails.bind(this));
        }

        if (saveProfile) {
            saveProfile.addEventListener('click', this.saveProfile.bind(this));
        }

        // Prevent text selection during drag
        document.addEventListener('selectstart', e => {
            if (this.isSelecting) e.preventDefault();
        });
    }

    onMouseDown(e) {
        if (!e.target.classList.contains('year-block')) return;

        e.preventDefault();
        this.isSelecting = true;
        this.selectionStart = parseInt(e.target.dataset.age);
        this.selectionEnd = this.selectionStart;
        this.selectedBlocks = [e.target];

        e.target.classList.add('selecting');
    }

    onMouseMove(e) {
        if (!this.isSelecting) return;

        const target = e.target;
        if (!target.classList.contains('year-block')) return;

        const currentAge = parseInt(target.dataset.age);

        // Sprawdź czy przeciągamy w prawo (tylko w prawo dozwolone)
        if (currentAge >= this.selectionStart) {
            this.selectionEnd = currentAge;
            this.updateSelection();
        }
    }

    onMouseUp(e) {
        if (!this.isSelecting) return;

        this.isSelecting = false;

        // Usuń klasę selecting ze wszystkich bloków
        document.querySelectorAll('.year-block.selecting').forEach(block => {
            block.classList.remove('selecting');
        });

        // Jeśli zaznaczono przynajmniej jeden rok, pokaż modal
        if (this.selectionEnd >= this.selectionStart) {
            this.showActivityModal();
        }

        this.selectedBlocks = [];
    }

    updateSelection() {
        // Usuń poprzednie zaznaczenie
        document.querySelectorAll('.year-block.selecting').forEach(block => {
            block.classList.remove('selecting');
        });

        // Dodaj zaznaczenie do nowego zakresu
        const grid = document.getElementById('timeline-grid');
        const blocks = grid.querySelectorAll('.year-block');

        blocks.forEach(block => {
            const age = parseInt(block.dataset.age);
            if (age >= this.selectionStart && age <= this.selectionEnd) {
                block.classList.add('selecting');
            }
        });
    }

    showActivityModal() {
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        const periodSpan = document.getElementById('activity-period');

        let periodText;
        if (this.isAgeMode) {
            periodText = `${this.selectionStart}-${this.selectionEnd} lat`;
        } else {
            const startYear = this.appData.birthYear + this.selectionStart;
            const endYear = this.appData.birthYear + this.selectionEnd;
            periodText = `${startYear}-${endYear}`;
        }

        periodSpan.textContent = periodText;
        modal.show();
    }

    selectActivity(e) {
        const activityType = e.target.dataset.activity;
        const modal = bootstrap.Modal.getInstance(document.getElementById('activityModal'));
        modal.hide();

        if (activityType === 'work') {
            this.showWorkDetailsModal();
        } else {
            // Dla urlopu zdrowotnego i przerwy w pracy od razu zapisz
            this.saveActivity(activityType);
        }
    }

    showWorkDetailsModal() {
        const modal = new bootstrap.Modal(document.getElementById('workDetailsModal'));
        const periodDisplay = document.getElementById('work-period-display');

        let periodText;
        if (this.isAgeMode) {
            periodText = `${this.selectionStart}-${this.selectionEnd} lat`;
        } else {
            const startYear = this.appData.birthYear + this.selectionStart;
            const endYear = this.appData.birthYear + this.selectionEnd;
            periodText = `${startYear}-${endYear}`;
        }

        periodDisplay.value = periodText;

        // Reset form
        document.getElementById('salarySlider').value = 5000;
        this.updateSalaryDisplay();

        modal.show();
    }

    updateSalaryDisplay() {
        const slider = document.getElementById('salarySlider');
        const display = document.getElementById('salary-display');

        if (slider && display) {
            const value = parseInt(slider.value);
            display.textContent = value.toLocaleString('pl-PL') + ' zł';
        }
    }

    saveWorkDetails() {
        const contractSelect = document.getElementById('contractType');
        const salarySlider = document.getElementById('salarySlider');

        const contractText = contractSelect.options[contractSelect.selectedIndex].text;
        const salary = parseInt(salarySlider.value);

        this.saveActivity('work', contractText, salary);

        const modal = bootstrap.Modal.getInstance(document.getElementById('workDetailsModal'));
        modal.hide();
    }

    saveActivity(type, contractType = null, salary = null) {
        // Usuń istniejące aktywności w tym zakresie
        this.appData.activities = this.appData.activities.filter(activity =>
            !(activity.startAge <= this.selectionEnd && activity.endAge >= this.selectionStart)
        );

        // Dodaj nową aktywność
        const newActivity = {
            startAge: this.selectionStart,
            endAge: this.selectionEnd,
            type: type,
            contractType: contractType,
            salary: salary
        };

        this.appData.activities.push(newActivity);

        // Przebuduj timeline
        this.renderGrid();
        this.updatePensionDisplay();

        this.showMessage(`Dodano aktywność: ${this.getActivityDisplayName(type)} 
                         (${this.selectionStart}-${this.selectionEnd} lat)`, 'success');
    }

    getActivityDisplayName(type) {
        const names = {
            'work': 'Praca',
            'sick-leave': 'Urlop zdrowotny',
            'break': 'Przerwa w pracy'
        };
        return names[type] || type;
    }

    toggleTimelineMode() {
        this.isAgeMode = !this.isAgeMode;
        this.updateTimelineMode();
        this.renderLabels();
    }

    updateTimelineMode() {
        const label = document.getElementById('timelineModeLabel');
        const range = document.getElementById('timeline-range');

        if (this.isAgeMode) {
            label.textContent = 'Wiek życia';
            range.textContent = '10 - 100 lat';
        } else {
            label.textContent = 'Lata kalendarzowe';
            const startYear = this.appData.birthYear + 10;
            const endYear = this.appData.birthYear + 99;
            range.textContent = `${startYear} - ${endYear}`;
        }
    }

    saveProfile() {
        const ageInput = document.getElementById('profileAge');
        const genderInput = document.getElementById('profileGender');
        const retirementInput = document.getElementById('profileRetirementYear');

        if (ageInput) {
            this.appData.currentAge = parseInt(ageInput.value) || 30;
            this.appData.birthYear = new Date().getFullYear() - this.appData.currentAge;
        }

        if (genderInput) {
            this.appData.gender = genderInput.value;
            this.appData.legalRetirementAge = genderInput.value === 'K' ? 60 : 65;
        }

        if (retirementInput) {
            const retirementYear = parseInt(retirementInput.value);
            this.appData.plannedRetirementAge = retirementYear - this.appData.birthYear;
        }

        // Przebuduj timeline
        this.renderTimeline();
        this.updatePensionDisplay();

        // Aktualizuj wyświetlane dane
        const currentAgeDisplay = document.getElementById('current-age');
        if (currentAgeDisplay) {
            currentAgeDisplay.textContent = this.appData.currentAge;
        }

        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        this.showMessage('Profil został zaktualizowany', 'success');
    }

    updatePensionDisplay() {
        // Oblicz statystyki z aktywności
        let totalWorkYears = 0;
        let totalContributions = 0;

        this.appData.activities.forEach(activity => {
            if (activity.type === 'work') {
                const years = activity.endAge - activity.startAge + 1;
                totalWorkYears += years;

                if (activity.salary) {
                    // Różne stawki składek w zależności od typu umowy
                    let contributionRate = 0.1952; // 19.52% domyślnie

                    if (activity.contractType &&
                        (activity.contractType.includes('dzieło') || activity.contractType.includes('B2B'))) {
                        contributionRate = 0; // 0% dla dzieła i B2B
                    }

                    totalContributions += activity.salary * 12 * years * contributionRate;
                }
            }
        });

        // Oblicz emeryturę
        const lifeExpectancyMonths = this.appData.gender === 'K' ? 260 : 220;
        const estimatedPension = totalContributions / lifeExpectancyMonths;

        // Aktualizuj UI
        this.updateUI({
            pension: estimatedPension,
            workYears: totalWorkYears,
            contributions: totalContributions,
            retirementAge: this.appData.plannedRetirementAge
        });
    }

    updateUI(data) {
        const elements = {
            'pension-amount': data.pension.toLocaleString('pl-PL', {
                style: 'currency',
                currency: 'PLN'
            }),
            'work-years': data.workYears,
            'total-contributions': Math.round(data.contributions),
            'retirement-age': data.retirementAge
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    showMessage(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('.main-content .container-fluid') || document.body;
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RectangleTimeline();
});