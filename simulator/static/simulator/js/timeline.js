/**
 * Timeline interaktywny dla Symulatora Emerytalnego ZUS
 * Wersja demo bez backendu - wszystko w pamięci lokalnej
 */

class RetirementTimeline {
    constructor() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDraggingPlannedRetirement = false;
        this.currentWorkPeriodId = null;
        this.minAge = 10;
        this.maxAge = 100;

        // Domyślne dane aplikacji
        this.appData = {
            currentAge: 30,
            gender: 'M',
            legalRetirementAge: 65,
            plannedRetirementAge: 65,
            workPeriods: []
        };

        this.init();
    }

    init() {
        this.setupTimeline();
        this.bindEvents();
        this.updatePensionDisplay();
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
            currentLine.style.left = this.ageToPixel(this.appData.currentAge) + '%';
        }

        if (legalLine) {
            legalLine.style.left = this.ageToPixel(this.appData.legalRetirementAge) + '%';
        }

        if (plannedLine) {
            plannedLine.style.left = this.ageToPixel(this.appData.plannedRetirementAge) + '%';
        }
    }

    renderWorkPeriods() {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;

        // Remove existing work periods
        const existingPeriods = timeline.querySelectorAll('.work-period');
        existingPeriods.forEach(period => period.remove());

        // Add work periods
        this.appData.workPeriods.forEach(period => {
            this.createWorkPeriodElement(period);
        });
    }

    createWorkPeriodElement(period) {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;

        const element = document.createElement('div');

        element.className = `work-period ${this.getContractTypeClass(period.contractType)}`;
        element.style.left = this.ageToPixel(period.startAge) + '%';
        element.style.width = this.ageToPixel(period.endAge - period.startAge) + '%';
        element.textContent = period.contractType;
        element.dataset.periodId = period.id;

        // Add accessibility attributes
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label',
            `Okres pracy: ${period.contractType}, wiek ${period.startAge}-${period.endAge}, ${period.salary} zł`);

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
            this.updatePensionDisplay();
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
        this.appData.plannedRetirementAge = age;
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
        const period = this.appData.workPeriods.find(p => p.id == periodId);
        if (!period) return;

        this.currentWorkPeriodId = periodId;

        const title = document.getElementById('workPeriodModalTitle');
        const startField = document.getElementById('startAge');
        const endField = document.getElementById('endAge');
        const salaryField = document.getElementById('salaryGross');
        const contractSelect = document.getElementById('contractType');
        const deleteBtn = document.getElementById('deleteWorkPeriod');

        if (title) title.textContent = 'Edytuj okres pracy';
        if (startField) startField.value = period.startAge;
        if (endField) endField.value = period.endAge;
        if (salaryField) salaryField.value = period.salary;
        if (deleteBtn) deleteBtn.style.display = 'block';

        // Set contract type
        if (contractSelect) {
            for (let option of contractSelect.options) {
                if (option.textContent === period.contractType) {
                    option.selected = true;
                    break;
                }
            }
        }

        const modal = new bootstrap.Modal(document.getElementById('workPeriodModal'));
        modal.show();
    }

    saveWorkPeriod() {
        const contractSelect = document.getElementById('contractType');
        const startAge = document.getElementById('startAge');
        const endAge = document.getElementById('endAge');
        const salary = document.getElementById('salaryGross');

        if (!contractSelect || !startAge || !endAge || !salary) return;

        const contractType = contractSelect.options[contractSelect.selectedIndex].text;

        const periodData = {
            id: this.currentWorkPeriodId || Date.now(),
            startAge: parseInt(startAge.value),
            endAge: parseInt(endAge.value),
            contractType: contractType,
            salary: parseFloat(salary.value)
        };

        if (this.currentWorkPeriodId) {
            // Update existing
            const index = this.appData.workPeriods.findIndex(p => p.id == this.currentWorkPeriodId);
            if (index !== -1) {
                this.appData.workPeriods[index] = periodData;
            }
        } else {
            // Add new
            this.appData.workPeriods.push(periodData);
        }

        this.renderWorkPeriods();
        this.updatePensionDisplay();
        bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
        this.showMessage('Okres pracy został zapisany', 'success');
    }

    deleteWorkPeriod() {
        if (!this.currentWorkPeriodId) return;

        if (!confirm('Czy na pewno chcesz usunąć ten okres pracy?')) {
            return;
        }

        this.appData.workPeriods = this.appData.workPeriods.filter(
            p => p.id != this.currentWorkPeriodId
        );

        this.renderWorkPeriods();
        this.updatePensionDisplay();
        bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
        this.showMessage('Okres pracy został usunięty', 'success');
    }

    saveProfile() {
        const ageInput = document.getElementById('profileAge');
        const genderInput = document.getElementById('profileGender');

        if (ageInput) {
            this.appData.currentAge = parseInt(ageInput.value) || 30;
        }

        if (genderInput) {
            this.appData.gender = genderInput.value;
            this.appData.legalRetirementAge = genderInput.value === 'K' ? 60 : 65;
        }

        // Aktualizuj timeline
        this.renderTimelineLines();
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
        // Prosta kalkulacja demonstracyjna
        let totalYears = 0;
        let totalContributions = 0;

        this.appData.workPeriods.forEach(period => {
            const years = period.endAge - period.startAge;
            totalYears += years;

            // Różne stawki składek w zależności od typu umowy
            let contributionRate = 0.1952; // 19.52% dla większości umów
            if (period.contractType === 'Umowa o dzieło' || period.contractType === 'Umowa B2B') {
                contributionRate = 0; // 0% dla tych umów
            }

            totalContributions += (period.salary || 0) * 12 * years * contributionRate;
        });

        // Uproszczone wyliczenie emerytury (kapitał / oczekiwana długość życia)
        const lifeExpectancyMonths = this.appData.gender === 'K' ? 260 : 220; // miesiące
        const estimatedPension = totalContributions / lifeExpectancyMonths;

        // Aktualizuj UI
        const pensionAmount = document.getElementById('pension-amount');
        const workYears = document.getElementById('work-years');
        const totalContrib = document.getElementById('total-contributions');
        const retirementAge = document.getElementById('retirement-age');

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

        if (retirementAge) {
            retirementAge.textContent = this.appData.plannedRetirementAge;
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