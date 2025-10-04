/**
 * Timeline interaktywny dla Symulatora Emerytalnego ZUS
 * Implementuje drag & drop do tworzenia okresów pracy
 */

class RetirementTimeline {
    constructor() {
        this.timelineData = null;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDraggingPlannedRetirement = false;
        this.currentWorkPeriodId = null;
        this.yearWidth = 44; // pixels per year

        this.init();
    }

    init() {
        // Load timeline data from JSON script tag
        const dataElement = document.getElementById('timeline-data');
        if (dataElement) {
            this.timelineData = JSON.parse(dataElement.textContent);
            this.setupTimeline();
            this.bindEvents();
        }
    }

    setupTimeline() {
        this.renderYearLabels();
        this.renderTimelineLines();
        this.renderWorkPeriods();
    }

    renderYearLabels() {
        const labelsContainer = document.getElementById('year-labels');
        const { timeline_start, timeline_end } = this.timelineData;

        labelsContainer.innerHTML = '';

        for (let year = timeline_start; year <= timeline_end; year += 5) {
            const label = document.createElement('div');
            label.className = 'year-label';
            label.textContent = year;
            label.style.left = this.yearToPixel(year) + 'px';
            labelsContainer.appendChild(label);
        }
    }

    renderTimelineLines() {
        const currentLine = document.getElementById('current-year-line');
        const legalLine = document.getElementById('legal-retirement-line');
        const plannedLine = document.getElementById('planned-retirement-line');

        currentLine.style.left = this.yearToPixel(this.timelineData.current_year) + 'px';
        legalLine.style.left = this.yearToPixel(this.timelineData.legal_retirement_year) + 'px';
        plannedLine.style.left = this.yearToPixel(this.timelineData.planned_retirement_year) + 'px';
    }

    renderWorkPeriods() {
        const timeline = document.getElementById('timeline');

        // Remove existing work periods (except static elements)
        const existingPeriods = timeline.querySelectorAll('.work-period');
        existingPeriods.forEach(period => period.remove());

        // Add work periods
        this.timelineData.work_periods.forEach(period => {
            this.createWorkPeriodElement(period);
        });
    }

    createWorkPeriodElement(period) {
        const timeline = document.getElementById('timeline');
        const element = document.createElement('div');

        element.className = `work-period ${this.getContractTypeClass(period.contract_type)}`;
        element.style.left = this.yearToPixel(period.start_year) + 'px';
        element.style.width = this.yearToPixel(period.end_year - period.start_year + 1) + 'px';
        element.textContent = period.contract_type;
        element.dataset.periodId = period.id;

        // Add accessibility attributes
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label',
            `Okres pracy: ${period.contract_type}, ${period.start_year}-${period.end_year}, ${period.salary} zł`);

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

        // Timeline drag selection events
        timeline.addEventListener('mousedown', this.onTimelineMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Work period click events
        timeline.addEventListener('click', this.onWorkPeriodClick.bind(this));

        // Planned retirement line dragging
        plannedLine.addEventListener('mousedown', this.onPlannedRetirementMouseDown.bind(this));

        // Modal events
        document.getElementById('saveWorkPeriod').addEventListener('click', this.saveWorkPeriod.bind(this));
        document.getElementById('deleteWorkPeriod').addEventListener('click', this.deleteWorkPeriod.bind(this));

        // Keyboard support
        timeline.addEventListener('keydown', this.onKeyDown.bind(this));

        // Prevent context menu on timeline
        timeline.addEventListener('contextmenu', e => e.preventDefault());
    }

    onTimelineMouseDown(e) {
        // Don't start selection if clicking on work period or planned retirement line
        if (e.target.classList.contains('work-period') ||
            e.target.classList.contains('planned-retirement-line')) {
            return;
        }

        e.preventDefault();
        this.isSelecting = true;
        this.selectionStart = this.pixelToYear(e.offsetX);
        this.selectionEnd = this.selectionStart;

        const selection = document.getElementById('timeline-selection');
        selection.style.display = 'block';
        this.updateSelection();
    }

    onMouseMove(e) {
        if (this.isSelecting) {
            const timeline = document.getElementById('timeline');
            const rect = timeline.getBoundingClientRect();
            const x = e.clientX - rect.left + timeline.scrollLeft;
            this.selectionEnd = this.pixelToYear(x);
            this.updateSelection();
        } else if (this.isDraggingPlannedRetirement) {
            const timeline = document.getElementById('timeline');
            const rect = timeline.getBoundingClientRect();
            const x = e.clientX - rect.left + timeline.scrollLeft;
            const year = Math.round(this.pixelToYear(x));
            this.updatePlannedRetirement(year);
        }
    }

    onMouseUp(e) {
        if (this.isSelecting) {
            this.isSelecting = false;
            const selection = document.getElementById('timeline-selection');
            selection.style.display = 'none';

            const startYear = Math.min(this.selectionStart, this.selectionEnd);
            const endYear = Math.max(this.selectionStart, this.selectionEnd);

            if (endYear - startYear >= 1) {
                this.showWorkPeriodModal(Math.floor(startYear), Math.floor(endYear));
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
            this.editWorkPeriod(periodId);
        }
    }

    onKeyDown(e) {
        // Keyboard navigation for accessibility
        if (e.target.classList.contains('work-period')) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const periodId = e.target.dataset.periodId;
                this.editWorkPeriod(periodId);
            }
        }
    }

    updateSelection() {
        const selection = document.getElementById('timeline-selection');
        const startYear = Math.min(this.selectionStart, this.selectionEnd);
        const endYear = Math.max(this.selectionStart, this.selectionEnd);

        selection.style.left = this.yearToPixel(startYear) + 'px';
        selection.style.width = this.yearToPixel(endYear - startYear) + 'px';
    }

    updatePlannedRetirement(year) {
        const plannedLine = document.getElementById('planned-retirement-line');
        plannedLine.style.left = this.yearToPixel(year) + 'px';
        this.timelineData.planned_retirement_year = year;
    }

    showWorkPeriodModal(startYear, endYear) {
        this.currentWorkPeriodId = null;
        document.getElementById('workPeriodModalTitle').textContent = 'Dodaj okres pracy';
        document.getElementById('startYear').value = startYear;
        document.getElementById('endYear').value = endYear;
        document.getElementById('salaryGross').value = '';
        document.getElementById('contractType').selectedIndex = 0;
        document.getElementById('deleteWorkPeriod').style.display = 'none';

        const modal = new bootstrap.Modal(document.getElementById('workPeriodModal'));
        modal.show();
    }

    editWorkPeriod(periodId) {
        const period = this.timelineData.work_periods.find(p => p.id == periodId);
        if (!period) return;

        this.currentWorkPeriodId = periodId;
        document.getElementById('workPeriodModalTitle').textContent = 'Edytuj okres pracy';
        document.getElementById('startYear').value = period.start_year;
        document.getElementById('endYear').value = period.end_year;
        document.getElementById('salaryGross').value = period.salary;

        // Set contract type
        const contractSelect = document.getElementById('contractType');
        for (let option of contractSelect.options) {
            if (option.value == period.contract_type_id) {
                option.selected = true;
                break;
            }
        }

        document.getElementById('deleteWorkPeriod').style.display = 'block';

        const modal = new bootstrap.Modal(document.getElementById('workPeriodModal'));
        modal.show();
    }

    async saveWorkPeriod() {
        const formData = {
            action: this.currentWorkPeriodId ? 'update' : 'create',
            contract_type_id: parseInt(document.getElementById('contractType').value),
            start_year: parseInt(document.getElementById('startYear').value),
            end_year: parseInt(document.getElementById('endYear').value),
            salary_gross_monthly: parseFloat(document.getElementById('salaryGross').value)
        };

        if (this.currentWorkPeriodId) {
            formData.work_period_id = this.currentWorkPeriodId;
        }

        try {
            const response = await fetch('/ajax/work-period/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.updateTimelineData();
                bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
                this.showMessage('Okres pracy został zapisany', 'success');
            } else {
                this.showMessage('Błąd: ' + (data.error || 'Nie udało się zapisać'), 'error');
            }
        } catch (error) {
            this.showMessage('Błąd połączenia: ' + error.message, 'error');
        }
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

            const data = await response.json();

            if (data.success) {
                this.updateTimelineData();
                bootstrap.Modal.getInstance(document.getElementById('workPeriodModal')).hide();
                this.showMessage('Okres pracy został usunięty', 'success');
            } else {
                this.showMessage('Błąd: ' + (data.error || 'Nie udało się usunąć'), 'error');
            }
        } catch (error) {
            this.showMessage('Błąd połączenia: ' + error.message, 'error');
        }
    }

    async savePlannedRetirement() {
        try {
            const response = await fetch('/ajax/update-retirement-year/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planned_retirement_year: this.timelineData.planned_retirement_year
                })
            });

            const data = await response.json();

            if (!data.success) {
                this.showMessage('Błąd: ' + (data.error || 'Nie udało się zapisać'), 'error');
                // Revert the change
                this.renderTimelineLines();
            } else {
                this.updatePensionCalculation();
            }
        } catch (error) {
            this.showMessage('Błąd połączenia: ' + error.message, 'error');
        }
    }

    async updateTimelineData() {
        // Reload timeline data and recalculate pension
        try {
            const response = await fetch('/ajax/calculate-pension/');
            const data = await response.json();

            if (data.success) {
                // Update UI with new pension data
                document.getElementById('pension-amount').textContent = data.pension_data.formatted_pension;
                document.getElementById('work-years').textContent = data.pension_data.total_work_years;
                document.getElementById('retirement-age').textContent = data.pension_data.retirement_age;
                document.getElementById('total-contributions').textContent =
                    data.pension_data.total_contributions.toFixed(2) + ' zł';
                document.getElementById('life-expectancy').textContent =
                    data.pension_data.life_expectancy_months + ' miesięcy';
            }

            // Reload the page to get updated work periods
            window.location.reload();
        } catch (error) {
            this.showMessage('Błąd przy aktualizacji: ' + error.message, 'error');
        }
    }

    async updatePensionCalculation() {
        try {
            const response = await fetch('/ajax/calculate-pension/');
            const data = await response.json();

            if (data.success) {
                document.getElementById('pension-amount').textContent = data.pension_data.formatted_pension;
                document.getElementById('work-years').textContent = data.pension_data.total_work_years;
                document.getElementById('retirement-age').textContent = data.pension_data.retirement_age;
                document.getElementById('total-contributions').textContent =
                    data.pension_data.total_contributions.toFixed(2) + ' zł';
                document.getElementById('life-expectancy').textContent =
                    data.pension_data.life_expectancy_months + ' miesięcy';
            }
        } catch (error) {
            console.error('Error updating pension calculation:', error);
        }
    }

    showMessage(message, type) {
        // Create and show a temporary alert message
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('.main-content .container-fluid');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    yearToPixel(year) {
        return (year - this.timelineData.timeline_start) * this.yearWidth;
    }

    pixelToYear(pixel) {
        return this.timelineData.timeline_start + (pixel / this.yearWidth);
    }
}

// Initialize timeline when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RetirementTimeline();
});