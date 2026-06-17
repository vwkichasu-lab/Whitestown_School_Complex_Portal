import formatDate from "/static/scripts/JS/utility/formatDate.js"
import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"

document.addEventListener('DOMContentLoaded', function() {
    const checkbox = document.getElementById('is_current');
    const container = document.getElementById('currentTermContainer');
    
    container.addEventListener('click', function(e) {
        if (e.target.type !== 'checkbox') {
            checkbox.checked = !checkbox.checked;
            updateCheckboxStyle();
        }
    });
    
    function updateCheckboxStyle() {
        container.classList.toggle('checked', checkbox.checked);
    }
    updateCheckboxStyle();

    // Academic year change handler
    document.getElementById('academic_year').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const startDate = selectedOption.getAttribute('data-start');
        const endDate = selectedOption.getAttribute('data-end');
        
        const startDateField = document.getElementById('start_date');
        const endDateField = document.getElementById('end_date');
        const dateRangeInfo = document.getElementById('dateRangeInfo');
        const dateRangeText = document.getElementById('dateRangeText');
        
        if (startDate && endDate) {
            // Set min/max dates based on academic year
            startDateField.min = startDate;
            startDateField.max = endDate;
            endDateField.min = startDate;
            endDateField.max = endDate;
            
            document.getElementById('start_date_help').textContent = 
                `Must be between ${formatDate(startDate)} and ${formatDate(endDate)}`;
            document.getElementById('end_date_help').textContent = 
                `Must be between ${formatDate(startDate)} and ${formatDate(endDate)}`;
            
            dateRangeText.textContent = 
                `Academic Year: ${formatDate(startDate)} to ${formatDate(endDate)}`;
            dateRangeInfo.style.display = 'block';
            
            // Auto-fill dates based on term name if academic year changes
            autoFillDates();
        } else {
            dateRangeInfo.style.display = 'none';
            startDateField.min = '';
            startDateField.max = '';
            endDateField.min = '';
            endDateField.max = '';
        }
    });

    document.getElementById('name').addEventListener('change', function() {
        autoFillDates();
    });

    function autoFillDates() {
        const academicYearSelect = document.getElementById('academic_year');
        const termNameSelect = document.getElementById('name');
        const startDateField = document.getElementById('start_date');
        const endDateField = document.getElementById('end_date');
        
        const selectedYear = academicYearSelect.options[academicYearSelect.selectedIndex];
        const termName = termNameSelect.value;
        
        if (!selectedYear.value || !termName) return;
        
        const yearStart = new Date(selectedYear.getAttribute('data-start'));
        const yearEnd = new Date(selectedYear.getAttribute('data-end'));
        const yearDuration = yearEnd - yearStart;
        
        let termStart, termEnd;
        
        switch(termName) {
            case '1st Term':
                termStart = new Date(yearStart);
                termEnd = new Date(yearStart.getTime() + (yearDuration * 0.33));
                break;
            case '2nd Term':
                termStart = new Date(yearStart.getTime() + (yearDuration * 0.33));
                termEnd = new Date(yearStart.getTime() + (yearDuration * 0.66));
                break;
            case '3rd Term':
                termStart = new Date(yearStart.getTime() + (yearDuration * 0.66));
                termEnd = new Date(yearEnd);
                break;
            default:
                return;
        }
        
        // Only auto-fill if dates are empty
        if (!startDateField.value) {
            startDateField.value = formatDateForInput(termStart);
        }
        if (!endDateField.value) {
            endDateField.value = formatDateForInput(termEnd);
        }
    }

    document.getElementById('start_date').addEventListener('change', function() {
        const endDateField = document.getElementById('end_date');
        const academicYearSelect = document.getElementById('academic_year');
        const selectedYear = academicYearSelect.options[academicYearSelect.selectedIndex];
        
        if (this.value && selectedYear.value) {
            const yearStart = selectedYear.getAttribute('data-start');
            const yearEnd = selectedYear.getAttribute('data-end');
            const startDate = new Date(this.value);
            const academicStart = new Date(yearStart);
            const academicEnd = new Date(yearEnd);
            
            if (startDate < academicStart || startDate > academicEnd) {
                showToast(`Start date must be within the academic year range: ${formatDate(yearStart)} to ${formatDate(yearEnd)}`, 'error');
                this.value = '';
                return;
            }
            
            endDateField.min = this.value;
            
            // Auto-adjust end date if it's before start date
            if (endDateField.value && new Date(endDateField.value) < startDate) {
                endDateField.value = '';
            }
        }
    });

    document.getElementById('end_date').addEventListener('change', function() {
        const startDateField = document.getElementById('start_date');
        const academicYearSelect = document.getElementById('academic_year');
        const selectedYear = academicYearSelect.options[academicYearSelect.selectedIndex];
        
        if (this.value && startDateField.value && selectedYear.value) {
            const startDate = new Date(startDateField.value);
            const endDate = new Date(this.value);
            const yearEnd = new Date(selectedYear.getAttribute('data-end'));
            
            if (endDate > yearEnd) {
                showToast(`End date cannot exceed academic year end date: ${formatDate(selectedYear.getAttribute('data-end'))}`, 'error');
                this.value = '';
                return;
            }
            
            if (endDate <= startDate) {
                showToast('End date must be after start date', 'error');
                this.value = '';
            }
        }
    });

    document.getElementById('createTermForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> creating...';
            this.classList.add('loading');
            
            const response = await fetch('/academics/terms/create/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (typeof showToast === 'function') {
                    showToast(data.message, 'success');
                } else {
                    alert('Success: ' + data.message);
                }
                
                submitBtn.classList.add('success-pulse');
                
                setTimeout(() => {
                    location.reload()
                },2000)
                
            } else {
                const errorMessage = data.error || 'Failed to create term';
                if (typeof showToast === 'function') {
                    showToast(errorMessage, 'error');
                } else {
                    alert('Error: ' + errorMessage);
                }
            }
            
        } catch (error) {
            console.error('Error creating term:', error);
            const errorMessage = 'Network error occurred. Please check your connection and try again.';
            
            if (typeof showToast === 'function') {
                showToast(errorMessage, 'error');
            } else {
                alert('Error: ' + errorMessage);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            this.classList.remove('loading');
            submitBtn.classList.remove('success-pulse');
        }
    });

    function formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
});