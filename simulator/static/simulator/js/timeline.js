// Znajduje się w pliku: static/js/timeline.js (lub odpowiedni plik z klasą DynamicTimeline)

class DynamicTimeline {
    constructor() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isAgeMode = true;
        this.selectedActivity = null;

        this.appData = this.loadDataFromDjango();


        this.init();
    }

    init() {
        this.renderTimeline();
        this.bindEvents();
        this.updatePensionDisplay();
    }

    loadDataFromDjango() {
        const dataElement = document.getElementById('timeline-data');

        if (!dataElement) {
            console.error('Nie znaleziono elementu #timeline-data');
            // Fallback - domyślne dane
            return {
                currentAge: 30,
                gender: 'M',
                birthYear: 1995,
                legalRetirementAge: 65,
                plannedRetirementAge: 65,
                activities: []
            };
        }

        try {
            const djangoData = JSON.parse(dataElement.textContent);

            // Mapuj dane z Django na appData
            return {
                currentAge: djangoData.current_age || 30,
                gender: djangoData.gender || 'M',
                birthYear: djangoData.birth_year || 1995,
                legalRetirementAge: djangoData.legal_retirement_age || 65,
                plannedRetirementAge: djangoData.planned_retirement_age || 65,
                activities: djangoData.activities || []
            };
        } catch (error) {
            console.error('Błąd parsowania danych z Django:', error);
            // Fallback
            return {
                currentAge: 30,
                gender: 'M',
                birthYear: 1995,
                legalRetirementAge: 65,
                plannedRetirementAge: 65,
                activities: []
            };
        }
    }

    // USUŃ metodę setupAppData() - nie jest już potrzebna!
    // setupAppData() {
    //     const currentYear = new Date().getFullYear();
    //     this.appData.birthYear = currentYear - this.appData.currentAge;
    //     this.appData.legalRetirementAge = this.appData.gender === 'K' ? 60 : 65;
    //     this.appData.plannedRetirementAge = this.appData.legalRetirementAge;
    // }

    init() {
        // setupAppData() nie jest już potrzebne - dane pochodzą z Django
        this.renderTimeline();
        this.bindEvents();
        this.updatePensionDisplay();
    }

    bindEvents() {
        const table = document.getElementById('timeline-table');
        const modeSwitch = document.getElementById('timelineMode');

        if (table) {
            table.addEventListener('mousedown', this.onMouseDown.bind(this));
            table.addEventListener('mousemove', this.onMouseMove.bind(this));
            table.addEventListener('mouseup', this.onMouseUp.bind(this));
            table.addEventListener('mouseleave', this.onMouseUp.bind(this));
            table.addEventListener('click', this.onActivityClick.bind(this));

            // Context menu
            table.addEventListener('contextmenu', (e) => {
                const bar = e.target.closest('.activity-bar');
                if (!bar) return;
                e.preventDefault();
                const idx = parseInt(bar.dataset.activityId, 10);
                this.selectedActivity = this.appData.activities[idx];
                const menu = document.getElementById('contextMenu');
                if (menu) {
                    menu.style.display = 'block';
                    menu.style.left = `${e.pageX}px`;
                    menu.style.top = `${e.pageY}px`;
                }
            });
        }

        // Hide context menu
        document.addEventListener('click', () => {
            const menu = document.getElementById('contextMenu');
            if (menu) menu.style.display = 'none';
        });

        // Context menu actions
        const editBtn = document.getElementById('editActivity');
        const deleteBtn = document.getElementById('deleteActivity');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.hideContextMenu();
                this.showEditActivityModal(this.selectedActivity);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.hideContextMenu();
                this.deleteActivity(this.selectedActivity);
            });
        }

        // Mode switch
        if (modeSwitch) {
            modeSwitch.addEventListener('change', this.toggleTimelineMode.bind(this));
        }

        // Activity selection buttons
        document.querySelectorAll('.activity-btn').forEach(btn => {
            btn.addEventListener('click', this.selectActivity.bind(this));
        });

        // Salary slider
        const salarySlider = document.getElementById('salarySlider');
        if (salarySlider) {
            salarySlider.addEventListener('input', this.updateSalaryDisplay.bind(this));
        }

        // Save work details
        const saveWorkDetails = document.getElementById('saveWorkDetails');
        if (saveWorkDetails) {
            saveWorkDetails.addEventListener('click', this.saveWorkDetails.bind(this));
        }

        // Edit activity form
        const editActivityType = document.getElementById('editActivityType');
        const editSalarySlider = document.getElementById('editSalarySlider');
        const saveEditedActivity = document.getElementById('saveEditedActivity');

        if (editActivityType) {
            editActivityType.addEventListener('change', (e) => {
                const workDetails = document.getElementById('editWorkDetails');
                if (workDetails) {
                    workDetails.style.display = e.target.value === 'work' ? 'block' : 'none';
                }
            });
        }

        if (editSalarySlider) {
            editSalarySlider.addEventListener('input', this.updateEditSalaryDisplay.bind(this));
        }

        if (saveEditedActivity) {
            saveEditedActivity.addEventListener('click', this.saveEditedActivity.bind(this));
        }

        // Prevent text selection during drag
        document.addEventListener('selectstart', e => {
            if (this.isSelecting) e.preventDefault();
        });
    }

    // Logika TYLKO dla kliknięcia paska — edycja aktywności!
    onActivityClick(e) {
        const bar = e.target.closest('.activity-bar');
        if (!bar) return;
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(bar.dataset.activityId, 10);
        this.selectedActivity = this.appData.activities[idx];
        this.showEditActivityModal(this.selectedActivity);
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
        if (!e.target.classList.contains('year-block')) return;
        const age = parseInt(e.target.dataset.age);
        if (age >= this.selectionStart) {
            this.selectionEnd = age;
            this.updateSelection();
        }
    }

    onMouseUp(e) {
        if (!this.isSelecting) return;
        this.isSelecting = false;
        document.querySelectorAll('.year-block.selecting').forEach(block =>
            block.classList.remove('selecting')
        );
        if (this.selectionEnd >= this.selectionStart)
            this.showActivityModal();
    }

    updateSelection() {
        document.querySelectorAll('.year-block.selecting').forEach(block =>
            block.classList.remove('selecting'));
        document.querySelectorAll('.year-block').forEach(block => {
            const age = parseInt(block.dataset.age);
            if (age >= this.selectionStart && age <= this.selectionEnd)
                block.classList.add('selecting');
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

    updateEditSalaryDisplay() {
        const slider = document.getElementById('editSalarySlider');
        const display = document.getElementById('edit-salary-display');

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

    saveActivity(type, contractType=null, salary=null) {
        let row = this.findAvailableRow(this.selectionStart, this.selectionEnd);

        this.appData.activities.push({
            id: Date.now() + Math.random(),
            startAge: this.selectionStart,
            endAge: this.selectionEnd,
            type, contractType, salary, row
        });

        if (this.shouldAddExtraRow(this.selectionStart, this.selectionEnd)) {
            this.forceAddRow();
        }

        this.renderTimeline();
        this.renderActivitiesTable?.();
        this.updatePensionDisplay();
        this.showMessage(`Dodano aktywność: ${this.getActivityDisplayName(type)} (${this.selectionStart}-${this.selectionEnd} lat)`, 'success');
    }

    findAvailableRow(startAge, endAge) {
        const allRows = this.appData.activities.map(a => a.row).filter(x => typeof x === "number");
        const maxRow = allRows.length ? Math.max(...allRows) : -1;

        for (let testRow = 0; testRow <= maxRow + 2; testRow++) {
            const collision = this.appData.activities.some(a =>
                a.row === testRow && !(a.endAge < startAge || a.startAge > endAge)
            );
            if (!collision) return testRow;
        }

        return (maxRow + 2);
    }

    shouldAddExtraRow(startAge, endAge) {
        const allRows = this.appData.activities.map(a => a.row).filter(x => typeof x === "number");
        if (allRows.length === 0) return false;

        const maxRow = Math.max(...allRows);

        for (let age = startAge; age <= endAge; age++) {
            let busyRows = 0;
            for (let row = 0; row <= maxRow; row++) {
                const inRow = this.appData.activities.some(a =>
                    a.row === row && a.startAge <= age && a.endAge >= age
                );
                if (inRow) busyRows++;
            }
            if (busyRows > maxRow) {
                return true;
            }
        }
        return false;
    }

    forceAddRow() {
        // Pusty wiersz pojawia się automatycznie przez renderTable
    }

    getActivityDisplayName(type) {
        const names = {
            'work': 'Praca',
            'sick-leave': 'Urlop zdrowotny',
            'break': 'Przerwa w pracy'
        };
        return names[type] || type;
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) menu.style.display = 'none';
    }

    showEditActivityModal(activity) {
        const modal = new bootstrap.Modal(document.getElementById('editActivityModal'));
        const period = document.getElementById('edit-period-display');
        const typeSelect = document.getElementById('editActivityType');
        const workDetails = document.getElementById('editWorkDetails');

        let periodText = this.isAgeMode
            ? `${activity.startAge}-${activity.endAge} lat`
            : `${this.appData.birthYear + activity.startAge}-${this.appData.birthYear + activity.endAge}`;

        period.value = periodText;
        typeSelect.value = activity.type;

        if (activity.type === 'work') {
            workDetails.style.display = 'block';
            const contractSelect = document.getElementById('editContractType');
            const salarySlider = document.getElementById('editSalarySlider');

            if (contractSelect && activity.contractType) {
                for (let option of contractSelect.options) {
                    if (option.text === activity.contractType) {
                        option.selected = true;
                        break;
                    }
                }
            }

            if (salarySlider && activity.salary) {
                salarySlider.value = activity.salary;
                this.updateEditSalaryDisplay();
            }
        } else {
            workDetails.style.display = 'none';
        }

        modal.show();
    }

    saveEditedActivity() {
        if (!this.selectedActivity) return;

        const typeSelect = document.getElementById('editActivityType');
        const contractSelect = document.getElementById('editContractType');
        const salarySlider = document.getElementById('editSalarySlider');

        this.selectedActivity.type = typeSelect.value;

        if (typeSelect.value === 'work') {
            if (contractSelect) {
                this.selectedActivity.contractType = contractSelect.options[contractSelect.selectedIndex].text;
            }
            if (salarySlider) {
                this.selectedActivity.salary = parseInt(salarySlider.value);
            }
        } else {
            delete this.selectedActivity.contractType;
            delete this.selectedActivity.salary;
        }

        this.renderTimeline();
        this.updatePensionDisplay();

        bootstrap.Modal.getInstance(document.getElementById('editActivityModal')).hide();
        this.showMessage('Aktywność została zaktualizowana', 'success');
    }

    deleteActivity(activity) {
        if (!confirm('Czy na pewno chcesz usunąć tę aktywność?')) return;

        const idx = this.appData.activities.indexOf(activity);
        if (idx > -1) {
            this.appData.activities.splice(idx, 1);
            this.renderTimeline();
            this.updatePensionDisplay();
            this.showMessage('Aktywność została usunięta', 'success');
        }
    }

    toggleTimelineMode() {
        this.isAgeMode = !this.isAgeMode;
        this.updateTimelineMode();
        this.renderTable();
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

    // Rendering methods
    renderTimeline() {
        this.renderTable();
        this.renderVerticalLines();
        this.updateTimelineMode();
    }

    renderTable() {
        const table = document.getElementById('timeline-table');
        table.innerHTML = '';

        const allRows = this.appData.activities.map(a => a.row).filter(x => typeof x === "number");
        const maxRow = allRows.length ? Math.max(...allRows) : -1;
        const totalRows = maxRow + 3;

        const rowHeights = ['25px', ...Array(totalRows - 1).fill('35px')];
        table.style.gridTemplateRows = rowHeights.join(' ');

        this.renderHeader();
        for (let row = 0; row < totalRows - 1; row++) {
            this.renderActivityRow(row);
        }
    }

    renderHeader() {
        const table = document.getElementById('timeline-table');

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

        const rowActivities = this.appData.activities.filter(activity =>
            (activity.row || 0) === rowIndex
        );

        for (let age = 10; age <= 80; age++) {
            const block = document.createElement('div');
            block.className = 'year-block';
            block.dataset.age = age;
            block.dataset.row = rowIndex;
            block.style.gridRow = (rowIndex + 2).toString();
            block.style.gridColumn = (age - 9).toString();
            table.appendChild(block);
        }

        rowActivities.forEach((activity) => {
            this.renderActivityBar(activity, rowIndex);
        });
    }

    renderActivityBar(activity, rowIndex) {
        const table = document.getElementById('timeline-table');
        const bar = document.createElement('div');
        bar.className = `activity-bar ${activity.type}`;
        bar.dataset.activityId = this.appData.activities.indexOf(activity);

        const startCol = activity.startAge - 9;
        const endCol = activity.endAge - 9;
        const span = endCol - startCol + 1;

        bar.style.gridRow = (rowIndex + 2);
        bar.style.gridColumnStart = startCol;
        bar.style.gridColumnEnd = startCol + span;

        if (activity.type === 'work') {
            bar.textContent = activity.contractType || 'Praca';
        } else if (activity.type === 'sick-leave') {
            bar.textContent = 'Urlop zdrowotny';
        } else if (activity.type === 'break') {
            bar.textContent = 'Przerwa w pracy';
        }

        table.appendChild(bar);
    }

    /**
     * POPRAWIONA METODA - Generuje pionowe linie z etykietami wyśrodkowanymi bezpośrednio pod nimi
     */
    renderVerticalLines() {
        const overlay = document.getElementById('timeline-overlay');
        const labels = document.getElementById('timeline-line-labels');
        if (!overlay || !labels) return;

        overlay.innerHTML = '';
        labels.innerHTML = '';

        // Oblicz liczbę wierszy aktywności
        const allRows = this.appData.activities.map(a => a.row).filter(x => typeof x === "number");
        const maxRow = allRows.length ? Math.max(...allRows) : -1;
        const totalActivityRows = maxRow + 2;

        // Wysokości
        const headerHeight = 25;
        const rowHeight = 35;
        const linesStartY = headerHeight;
        const linesHeight = (totalActivityRows + 2) * rowHeight;
        const labelsY = headerHeight + linesHeight + 5;

        const currentYear = new Date().getFullYear();
        const legalYear = this.appData.birthYear + this.appData.legalRetirementAge;
        const plannedYear = this.appData.birthYear + this.appData.plannedRetirementAge;

        const lines = [
            {
                age: this.appData.currentAge,
                className: 'current-age-line',
                labelClass: 'current-age-label',
                text: this.isAgeMode ? `${this.appData.currentAge} lat` : `${currentYear}`
            },
            {
                age: this.appData.legalRetirementAge,
                className: 'legal-retirement-line',
                labelClass: 'legal-retirement-label',
                text: this.isAgeMode ? `Emerytura ${this.appData.legalRetirementAge}` : `Emerytura ${legalYear}`
            },
            {
                age: this.appData.plannedRetirementAge,
                className: 'planned-retirement-line',
                labelClass: 'planned-retirement-label',
                text: this.isAgeMode ? `Plan ${this.appData.plannedRetirementAge}` : `Plan ${plannedYear}`
            }
        ];

        lines.forEach(line => {
            if (line.age < 10 || line.age > 80) return;

            // POPRAWIONE OBLICZENIE: Pozycja środka kolumny
            // Timeline ma 71 kolumn (wiek 10-80)
            // Dla wieku X: kolumna = X - 10, środek kolumny = (X - 10 + 0.5) / 71
            const xPercent = ((line.age - 10 + 0.5) / 71) * 100;

            // Linia przerywana - wyśrodkowana względem pozycji
            const lineEl = document.createElement('div');
            lineEl.className = `timeline-vertical-line ${line.className}`;
            lineEl.style.left = `${xPercent}%`;
            lineEl.style.top = `${linesStartY}px`;
            lineEl.style.height = `${linesHeight}px`;
            lineEl.style.transform = 'translateX(-50%)'; // Wyśrodkowanie linii
            overlay.appendChild(lineEl);

            // Etykieta - wyśrodkowana bezpośrednio pod linią
            const labelEl = document.createElement('div');
            labelEl.className = `timeline-line-label ${line.labelClass}`;
            labelEl.style.left = `${xPercent}%`;
            labelEl.style.top = `${labelsY}px`;
            labelEl.style.transform = 'translateX(-50%)'; // Wyśrodkowanie etykiety
            labelEl.textContent = line.text;
            labels.appendChild(labelEl);
        });
    }

    updatePensionDisplay() {
        let totalWorkYears = 0;
        let totalContributions = 0;

        this.appData.activities.forEach(activity => {
            if (activity.type === 'work') {
                const years = activity.endAge - activity.startAge + 1;
                totalWorkYears += years;

                if (activity.salary) {
                    let contributionRate = 0.1952;

                    if (activity.contractType &&
                        (activity.contractType.includes('dzieło') || activity.contractType.includes('B2B'))) {
                        contributionRate = 0;
                    }

                    totalContributions += activity.salary * 12 * years * contributionRate;
                }
            }
        });

        const lifeExpectancyMonths = this.appData.gender === 'K' ? 260 : 220;
        const estimatedPension = totalContributions / lifeExpectancyMonths;

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

document.addEventListener('DOMContentLoaded', () => {
    new DynamicTimeline();
});
