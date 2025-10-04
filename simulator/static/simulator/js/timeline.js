/**
 * Timeline z dynamiczną tabelą - wiersz nagłówka + wiersze aktywności
 * Implementuje dwustopniowy proces wyboru aktywności z obsługą nakładających się aktywności
 */

class DynamicTimeline {
    constructor() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isAgeMode = true; // true = wiek życia, false = lata kalendarzowe

        // Dane aplikacji
        this.appData = {
            currentAge: 30,
            gender: 'M',
            birthYear: 1995,
            legalRetirementAge: 65,
            plannedRetirementAge: 65,
            activities: [] // {startAge, endAge, type, contractType?, salary?, row}
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
        this.renderTable();
        this.renderVerticalLines(); // nowa metoda
        this.updateTimelineMode();
    }

    renderVerticalLines() {
        const overlay = document.getElementById('timeline-overlay');
        const labels = document.getElementById('timeline-line-labels');
        if (!overlay || !labels) return;
        overlay.innerHTML = '';
        labels.innerHTML = '';

        // Aktualny rok
        const currentYear = new Date().getFullYear();
        // Rok ustawowego wieku emerytalnego
        const legalYear = this.appData.birthYear + this.appData.legalRetirementAge;
        // Rok planowanego wieku emerytalnego
        const plannedYear = this.appData.birthYear + this.appData.plannedRetirementAge;

        const lines = [
            {
                posAge: this.appData.currentAge,
                className: 'current-age-line',
                labelClassName: 'current-age-label',
                text: this.isAgeMode
                    ? `Obecny wiek (${this.appData.currentAge})`
                    : `Obecny rok (${currentYear})`
            },
            {
                posAge: this.appData.legalRetirementAge,
                className: 'legal-retirement-line',
                labelClassName: 'legal-retirement-label',
                text: this.isAgeMode
                    ? `Ustawowy wiek emerytury (${this.appData.legalRetirementAge})`
                    : `Ustawowy rok emerytury (${legalYear})`
            },
            {
                posAge: this.appData.plannedRetirementAge,
                className: 'planned-retirement-line',
                labelClassName: 'planned-retirement-label',
                text: this.isAgeMode
                    ? `Planowany wiek emerytury (${this.appData.plannedRetirementAge})`
                    : `Planowany rok emerytury (${plannedYear})`
            }
        ];

        lines.forEach(lineData => {
            const age = lineData.posAge;
            if (age >= 10 && age <= 80) {
                const position = ((age - 10) / 70) * 100;
                // Pionowa linia
                const line = document.createElement('div');
                line.className = `timeline-vertical-line ${lineData.className}`;
                line.style.left = `${position}%`;
                overlay.appendChild(line);
                // Etykieta pod tabelą
                const label = document.createElement('div');
                label.className = `timeline-line-label ${lineData.labelClassName}`;
                label.style.left = `${position}%`;
                label.textContent = lineData.text;
                labels.appendChild(label);
            }
        });
    }

    renderTable() {
        const table = document.getElementById('timeline-table');
        table.innerHTML = '';

        // Oblicz liczbę wierszy (nagłówek + wiersze aktywności)
        const maxRow = Math.max(0, ...this.appData.activities.map(a => a.row || 0));
        const totalRows = maxRow + 2; // nagłówek + 1 pusty wiersz + wiersze aktywności

        // Ustaw grid-template-rows
        const rowHeights = ['25px', ...Array(totalRows - 1).fill('35px')];
        table.style.gridTemplateRows = rowHeights.join(' ');

        // Renderuj nagłówek
        this.renderHeader();

        // Renderuj wiersze aktywności
        for (let row = 0; row < totalRows - 1; row++) {
            this.renderActivityRow(row);
        }
    }

    renderHeader() {
        const table = document.getElementById('timeline-table');

        // Renderuj tylko etykiety co 10 lat
        for (let age = 10; age <= 80; age += 10) {
            const header = document.createElement('div');
            header.className = 'year-header';
            header.style.gridRow = '1';
            header.style.gridColumn = (age - 9).toString();

            if (this.isAgeMode) {
                header.textContent = age.toString();
            } else {
                header.textContent = (this.appData.birthYear + age).toString();
            }

            table.appendChild(header);
        }
    }

    renderActivityRow(rowIndex) {
        const table = document.getElementById('timeline-table');

        for (let age = 10; age <= 80; age++) {
            const block = document.createElement('div');
            block.className = 'year-block';
            block.dataset.age = age;
            block.dataset.row = rowIndex;
            block.style.gridRow = (rowIndex + 2).toString(); // +2 bo pierwszy wiersz to nagłówek
            block.style.gridColumn = (age - 9).toString(); // age 10 = kolumna 1

            // Znajdź aktywność dla tego wieku i wiersza
            const activity = this.findActivityForPosition(age, rowIndex);
            if (activity) {
                block.classList.add(activity.type);

                // Dodaj tekst
                if (activity.type === 'work') {
                    block.textContent = activity.contractType ? activity.contractType.slice(0, 3) : 'PR';
                } else if (activity.type === 'sick-leave') {
                    block.textContent = 'UZ';
                } else if (activity.type === 'break') {
                    block.textContent = 'PR';
                }
            }

            table.appendChild(block);
        }
    }

    findActivityForPosition(age, row) {
        return this.appData.activities.find(activity =>
            age >= activity.startAge &&
            age <= activity.endAge &&
            (activity.row || 0) === row
        );
    }

    bindEvents() {
        const table = document.getElementById('timeline-table');
        const modeSwitch = document.getElementById('timelineMode');
        const salarySlider = document.getElementById('salarySlider');

        // Timeline events
        if (table) {
            table.addEventListener('mousedown', this.onMouseDown.bind(this));
            table.addEventListener('mousemove', this.onMouseMove.bind(this));
            table.addEventListener('mouseup', this.onMouseUp.bind(this));
            table.addEventListener('mouseleave', this.onMouseUp.bind(this));
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

        e.target.classList.add('selecting');
    }

    onMouseMove(e) {
        if (!this.isSelecting) return;

        const target = e.target;
        if (!target.classList.contains('year-block')) return;

        const currentAge = parseInt(target.dataset.age);

        // Tylko w prawo
        if (currentAge >= this.selectionStart) {
            this.selectionEnd = currentAge;
            this.updateSelection();
        }
    }

    onMouseUp(e) {
        if (!this.isSelecting) return;

        this.isSelecting = false;

        // Usuń zaznaczenie
        document.querySelectorAll('.year-block.selecting').forEach(block => {
            block.classList.remove('selecting');
        });

        // Pokaż modal
        if (this.selectionEnd >= this.selectionStart) {
            this.showActivityModal();
        }
    }

    updateSelection() {
        // Usuń poprzednie zaznaczenie
        document.querySelectorAll('.year-block.selecting').forEach(block => {
            block.classList.remove('selecting');
        });

        // Dodaj zaznaczenie do zakresu
        document.querySelectorAll('.year-block').forEach(block => {
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
        // Znajdź odpowiedni wiersz dla nowej aktywności
        const targetRow = this.findAvailableRow(this.selectionStart, this.selectionEnd);

        // Dodaj nową aktywność
        const newActivity = {
            startAge: this.selectionStart,
            endAge: this.selectionEnd,
            type: type,
            contractType: contractType,
            salary: salary,
            row: targetRow
        };

        this.appData.activities.push(newActivity);

        // Przebuduj timeline
        this.renderTimeline();
        this.updatePensionDisplay();

        this.showMessage(`Dodano aktywność: ${this.getActivityDisplayName(type)} (${this.selectionStart}-${this.selectionEnd} lat)`, 'success');
    }

    findAvailableRow(startAge, endAge) {
        // Sprawdź które wiersze są zajęte w danym przedziale wiekowym
        const occupiedRows = new Set();

        this.appData.activities.forEach(activity => {
            // Sprawdź czy aktywności się nakładają
            if (!(activity.endAge < startAge || activity.startAge > endAge)) {
                occupiedRows.add(activity.row || 0);
            }
        });

        // Znajdź pierwszy wolny wiersz
        let row = 0;
        while (occupiedRows.has(row)) {
            row++;
        }

        return row;
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
        this.renderTable(); // Przebuduj całą tabelę z nowymi etykietami
        this.renderVerticalLines();
    }

    updateTimelineMode() {
        const label = document.getElementById('timelineModeLabel');
        const range = document.getElementById('timeline-range');

        if (this.isAgeMode) {
            label.textContent = 'Wiek życia';
            range.textContent = '10 - 80 lat';
        } else {
            label.textContent = 'Lata kalendarzowe';
            const startYear = this.appData.birthYear + 10;
            const endYear = this.appData.birthYear + 80;
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
    new DynamicTimeline();
});