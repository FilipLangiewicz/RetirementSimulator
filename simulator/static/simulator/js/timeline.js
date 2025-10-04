/**
 * Timeline interaktywny dla Symulatora Emerytalnego ZUS
 * Wersja z wiekiem na osi X (10-100 lat) bez przewijania
 */

class RetirementTimeline {
    constructor() {
        this.timelineData = null;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDraggingPlannedRetirement = false;
        this.currentWorkPeriodId = null;
        this.minAge = 10;
        this.maxAge = 100;
        this.currentAge = 30; // domyślny wiek

        this.init();
    }

    init() {
        // Load timeline data from JSON script tag
        const dataElement = document.getElementById('timeline-data');
        if (dataElement) {
            this.timelineData = JSON.parse(dataElement.textContent);
            this.currentAge = this.timelineData.current_age || 30;
            this.setupTimeline();
            this.bindEvents();
        } else {
            // Fallback dla trybu bez logowania
            this.setupDefaultTimeline();
            this.bindEvents();
        }
    }

    setupDefaultTimeline() {
        // Domyślne dane dla trybu bez logowania
        this.timelineData = {
            current_age: 30,
            legal_retirement_age: 65,
            planned_retirement_age: 65,
            work_periods: []
        };
        this.currentAge = 30;
    }

    setupTimeline() {
        this.renderAgeLabels();
        this.renderTimelineLines();
        this.renderWorkPeriods();
    }

    renderAgeLabels() {
        const labelsContainer = document.getElementById('age-labels');
        if (!labelsContainer) return;

        labelsContainer.innerHTML = '';

        // Etykiety co 10 lat
        for (let age = 10; age <= 100; age += 10) {
            const label = document.createElement('div');
            label.className = 'age-label';
            label.textContent = age + ' lat';
            label.style.left = this.ageToPixel(age) + '%';
            labelsContainer.appendChild(label);
        }
    }

    renderTimelineLines() {
        const currentLine = document.getElementById('current-age-line');
        const legalLine = document.getElementById('legal-retirement-line');
        const plannedLine = document.getElementById('planned-retirement-line');

        if (currentLine) {
            currentLine.style.left = this.ageToPixel(this.currentAge) + '%';
        }

        const legalAge = this.timelineData?.legal_retirement_age || 65;
        const plannedAge = this.timelineData?.planned_retirement_age || 65;

        if (legalLine) {
            legalLine.style.left = this.ageToPixel(legalAge) + '%';
        }

        if (plannedLine) {
            plannedLine.style.left = this.ageToPixel(plannedAge) + '%';
        }
    }

    renderWorkPeriods() {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;

        // Remove existing work periods
        const existingPeriods = timeline.querySelectorAll('.work-period');
        existingPeriods.forEach(period => period.remove());

        // Add work periods
        if (this.timelineData && this.timelineData.work_periods) {
            this.timelineData.work_periods.forEach(period => {
                this.createWorkPeriodElement(period);
            });
        }
    }

    createWorkPeriodElement(period) {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;

        const element = document.createElement('div');

        // Konwersja lat na wiek
        const birthYear = 2025 - this.currentAge;
        const startAge = period.start_year - birthYear;
        const endAge = period.end_year - birthYear;

        element.className = `work-period ${this.getContractTypeClass(period.contract_type)}`;
        element.style.left = this.ageToPixel(startAge) + '%';
        element.style.width = this.ageToPixel(endAge - startAge) + '%';
        element.textContent = period.contract_type;
        element.dataset.periodId = period.id;
        element.dataset.startAge = startAge;
        element.dataset.endAge = endAge;

        // Add accessibility attributes
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label',
            `Okres pracy: ${period.contract_type}, wiek ${startAge}-${endAge}, ${period.salary} zł`);

        timeline.appendChild(element);
    }

    getContractTypeClass(contractType) {
        const typeMap = {
            'Umowa o pracę': 'employment',
            'Umowa zlecenie': 'mandate',
            'Umowa o dzieło': 'task',
            'Własna działalność gospodarcza': 'business',
            'Umowa B2B': 'b2b'
        };
        return typeMap[contractType] || 'employment';
    }

    bindEvents() {
        const timeline = document.getElementById('timeline');
        const plannedLine = document.getElementById('planned-retirement-line');

        if (timeline) {
            // Timeline drag selection events
            timeline.addEventListener('mousedown', this.onTimelineMouseDown.bind(this));
            timeline.addEventListener('click', this.onWorkPeriodClick.bind(this));
            timeline.addEventListener('keydown', this.onKeyDown.bind(this));
        }

        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Planned retirement line dragging
        if (plannedLine) {
            plannedLine.addEventListener('mousedown', this.onPlannedRetirementMouseDown.bind(this));
        }

        // Modal events
        const saveBtn = document.getElementById('saveWorkPeriod');
        const deleteBtn = document.getElementById('deleteWorkPeriod');
        const saveProfileBtn = document.getElementById('saveProfile');

        if (saveBtn) {
            saveBtn.addEventListener('click', this.saveWorkPeriod.bind(this));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.deleteWorkPeriod.bind(this));
        }
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', this.saveProfile.bind(this));
        }

        // Prevent context menu on timeline
        if (timeline) {
            timeline.addEventListener('contextmenu', e => e.preventDefault());
        }
    }

    onTimelineMouseDown(e) {
        // Don't start selection if clicking on work period or planned retirement line
        if (e.target.classList.contains('work-period') ||
            e.target.classList.contains('planned-retirement-line')) {
            return;
        }

        e.preventDefault();
        this.isSelecting = true;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;

        this.selectionStart = this.pixelToAge(percentage);
        this.selectionEnd = this.selectionStart;

        const selection = document.getElementById('timeline-selection');
        if (selection) {
            selection.style.display = 'block';
            this.updateSelection();
        }
    }

    onMouseMove(e) {
        if (this.isSelecting) {
            const timeline = document.getElementById('timeline');
            if (!timeline) return;

            const rect = timeline.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

            this.selectionEnd = this.pixelToAge(percentage);
            this.updateSelection();
        } else if (this.isDraggingPlannedRetirement) {
            const timeline = document.getElementById('timeline');
            if (!timeline) return;

            const rect = timeline.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const age = Math.round(this.pixelToAge(percentage));

            this.updatePlannedRetirement(age);
        }
    }

    onMouseUp(e) {
        if (this.isSelecting) {
            this.isSelecting = false;
            const selection = document.getElementById('timeline-selection');
            if (selection) {
                selection.style.display = 'none';
            }

            const startAge = Math.min(this.selectionStart, this.selectionEnd);
            const endAge = Math.max(this.selectionStart, this.selectionEnd);

            if (endAge - startAge >= 1) {
                this.showWorkPeriodModal(Math.floor(startAge), Math.floor(endAge));
            }
        } else if (this.isDraggingPlannedRetirement) {
            this.isDraggingPlannedRetirement = false;
            document.body.style.cursor = '';
            this.savePlannedRetirement();
        }
    }

    onPlannedRetirementMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isDraggingPlannedRetirement = true;
        document.body.style.cursor = 'ew-resize';
    }

    onWorkPeriodClick(e) {
        if (e.target.classList.contains('work-period')) {
            e.preventDefault();
            e.stopPropagation();
            const periodId = e.target.dataset.periodId;
            if (periodId) {
                this.editWorkPeriod(periodId);
            }
        }
    }

    onKeyDown(e) {
        if (e.target.classList.contains('work-period')) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const periodId = e.target.dataset.periodId;
                if (periodId) {
                    this.editWorkPeriod(periodId);
                }
            }
        }
    }

    updateSelection() {
        const selection = document.getElementById('timeline-selection');
        if (!selection) return;

        const startAge = Math.min(this.selectionStart, this.selectionEnd);
        const endAge = Math.max(this.selectionStart, this.selectionEnd);

        selection.style.left = this.ageToPixel(startAge) + '%';
        selection.style.width = this.ageToPixel(endAge - startAge) + '%';
    }

    updatePlannedRetirement(age) {
        const plannedLine = document.getElementById('planned-retirement-line');
        if (plannedLine) {
            plannedLine.style.left = this.ageToPixel(age) + '%';
        }
        if (this.timelineData) {
            this.timelineData.planned_retirement_age = age;
        }
    }

    showWorkPeriodModal(startAge, endAge) {
        this.currentWorkPeriodId = null;

        const title = document.getElementById('workPeriodModalTitle');
        const startField = document.getElementById('startAge');
        const endField = document.getElementById('endAge');
        const salaryField = document.getElementById('salaryGross');
        const contractSelect = document.getElementById('contractType');
        const deleteBtn = document.getElementById('deleteWorkPeriod');

        if (title) title.textContent = 'Dodaj okres pracy';
        if (startField) startField.value = startAge;
        if (endField) endField.value = endAge;
        if (salaryField) salaryField.value = '';
        if (contractSelect) contractSelect.selectedIndex = 0;
        if (deleteBtn) deleteBtn.style.display = 'none';

        const modal = new bootstrap.Modal(document.getElementById('workPeriodModal'));
        modal.show();
    }

    editWorkPeriod(periodId) {
        if (!this.timelineData || !this.timelineData.work_periods) return;

        const period = this.timelineData.work_periods.find(p => p.id == periodId);
        if (!period) return;

        // Konwersja lat na wiek
        const birthYear = 2025 - this.currentAge;
        const startAge = period.start_year - birthYear;
        const endAge = period.end_year - birthYear;

        this.currentWorkPeriodId = periodId;

        const title = document.getElementById('workPeriodModalTitle');
        const startField = document.getElementById('startAge');
        const endField = document.getElementById('endAge');
        const salaryField = document.getElementById('salaryGross');
        const contractSelect = document.getElementById('contractType');
        const deleteBtn = document.getElementById('deleteWorkPeriod');

        if (title) title.textContent = 'Edytuj okres pracy';
        if (startField) startField.value = startAge;
        if (endField) endField.value = endAge;
        if (salaryField) salaryField.value = period.salary;
        if (deleteBtn) deleteBtn.style.display = 'block';

        // Set contract type
        if (contractSelect) {
            for (let option of contractSelect.options) {
                if (option.value == period.contract_type_id) {
                    option.selected = true;
                    break;
                }
            }
        }

        const modal = new bootstrap.Modal(document.getElementById('workPeriodModal'));
        modal.show();
    }

    async saveWorkPeriod() {
        const contractType = document.getElementById('contractType');
        const startAge = document.getElementById('startAge');
        const endAge = document.getElementById('endAge');
        const salary = document.getElementById('salaryGross');

        if (!contractType || !startAge || !endAge || !salary) return;

        // Konwersja wieku na lata
        const birthYear = 2025 - this.currentAge;
        const startYear = birthYear + parseInt(startAge.value);
        const endYear = birthYear + parseInt(endAge.value);

        const formData = {
            action: this.currentWorkPeriodId ? 'update' : 'create',
            contract_type_id: parseInt(contractType.value),
            start_year: startYear,
            end_year: endYear,
            salary_gross_monthly: parseFloat(salary.value)
        };

        if (this.currentWorkPeriodId) {
            formData.work_period_id = this.currentWorkPeriodId;
        }

        // W trybie demo (bez backendu) tylko symulujemy zapis
        if (!this.timelineData || !this.timelineData.work_periods) {
            this.simulateWorkPeriodSave(formData);
            return;
        }

        try {
            const response = await fetch('/ajax/work-period/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateTimelineData();
                    bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
                    this.showMessage('Okres pracy został zapisany', 'success');
                } else {
                    this.showMessage('Błąd: ' + (data.error || 'Nie udało się zapisać'), 'error');
                }
            }
        } catch (error) {
            // Fallback do trybu demo
            this.simulateWorkPeriodSave(formData);
        }
    }

    simulateWorkPeriodSave(formData) {
        // Symulacja zapisania w trybie demo
        if (!this.timelineData) {
            this.timelineData = {
                current_age: this.currentAge,
                legal_retirement_age: 65,
                planned_retirement_age: 65,
                work_periods: []
            };
        }

        const newPeriod = {
            id: Date.now(),
            start_year: formData.start_year,
            end_year: formData.end_year,
            contract_type: 'Umowa o pracę', // domyślnie
            contract_type_id: formData.contract_type_id,
            salary: formData.salary_gross_monthly
        };

        if (this.currentWorkPeriodId) {
            // Update existing
            const index = this.timelineData.work_periods.findIndex(p => p.id == this.currentWorkPeriodId);
            if (index !== -1) {
                this.timelineData.work_periods[index] = {...this.timelineData.work_periods[index], ...newPeriod};
            }
        } else {
            // Add new
            this.timelineData.work_periods.push(newPeriod);
        }

        this.renderWorkPeriods();
        this.updatePensionDisplay();
        bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
        this.showMessage('Okres pracy został zapisany', 'success');
    }

    async deleteWorkPeriod() {
        if (!this.currentWorkPeriodId) return;

        if (!confirm('Czy na pewno chcesz usunąć ten okres pracy?')) {
            return;
        }

        try {
            const response = await fetch('/ajax/work-period/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'delete',
                    work_period_id: this.currentWorkPeriodId
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateTimelineData();
                    bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
                    this.showMessage('Okres pracy został usunięty', 'success');
                }
            }
        } catch (error) {
            // Fallback - usuń z pamięci lokalnej
            if (this.timelineData && this.timelineData.work_periods) {
                this.timelineData.work_periods = this.timelineData.work_periods.filter(
                    p => p.id != this.currentWorkPeriodId
                );
                this.renderWorkPeriods();
                this.updatePensionDisplay();
                bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
                this.showMessage('Okres pracy został usunięty', 'success');
            }
        }
    }

    saveProfile() {
        const ageInput = document.getElementById('profileAge');
        const genderInput = document.getElementById('profileGender');
        const retirementInput = document.getElementById('profileRetirementYear');

        if (ageInput) {
            this.currentAge = parseInt(ageInput.value) || 30;
        }

        // Aktualizuj timeline
        this.renderTimelineLines();
        this.renderAgeLabels();
        this.renderWorkPeriods();
        this.updatePensionDisplay();

        // Aktualizuj wyświetlane dane
        const currentAgeDisplay = document.getElementById('current-age');
        if (currentAgeDisplay) {
            currentAgeDisplay.textContent = this.currentAge;
        }

        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        this.showMessage('Profil został zaktualizowany', 'success');
    }

    async savePlannedRetirement() {
        // W trybie demo tylko aktualizuj interfejs
        this.updatePensionDisplay();
        this.showMessage('Planowany wiek emerytury został zmieniony', 'success');
    }

    async updateTimelineData() {
        // Przeładuj dane i przelicz emeryturę
        this.renderWorkPeriods();
        this.updatePensionDisplay();
    }

    updatePensionDisplay() {
        // Prosta kalkulacja demonstracyjna
        if (!this.timelineData || !this.timelineData.work_periods) return;

        let totalYears = 0;
        let totalContributions = 0;

        this.timelineData.work_periods.forEach(period => {
            const years = period.end_year - period.start_year + 1;
            totalYears += years;
            totalContributions += (period.salary || 0) * 12 * years * 0.1952; // 19.52% składka
        });

        const estimatedPension = totalContributions / 200; // uproszczone

        // Aktualizuj UI
        const pensionAmount = document.getElementById('pension-amount');
        const workYears = document.getElementById('work-years');
        const totalContrib = document.getElementById('total-contributions');

        if (pensionAmount) {
            pensionAmount.textContent = estimatedPension.toLocaleString('pl-PL', {
                style: 'currency',
                currency: 'PLN'
            });
        }

        if (workYears) {
            workYears.textContent = totalYears;
        }

        if (totalContrib) {
            totalContrib.textContent = Math.round(totalContributions);
        }
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

    // Konwersje wiek <-> piksele (procenty)
    ageToPixel(age) {
        return ((age - this.minAge) / (this.maxAge - this.minAge)) * 100;
    }

    pixelToAge(percentage) {
        return this.minAge + (percentage / 100) * (this.maxAge - this.minAge);
    }
}

// Initialize timeline when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RetirementTimeline();
});