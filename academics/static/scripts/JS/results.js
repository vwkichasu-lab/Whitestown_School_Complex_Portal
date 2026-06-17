import showToast from "/static/scripts/JS/admin_d.js"
import hideLoader from "/static/scripts/JS/admin_d.js"
import showLoader from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"

document.addEventListener('DOMContentLoaded', function() {
    initializeResultsPage();
});

function initializeResultsPage() {
    initializePublishButtons();
    initializeDeleteButtons();
    initializeFilters();
    initializeScoreInputs();
}

// Publish/Unpublish functionality
function initializePublishButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.publish-btn')) {
            const button = e.target.closest('.publish-btn');
            const resultId = button.getAttribute('data-result-id');
            const action = button.getAttribute('data-action');
            
            publishResult(resultId, action, button);
        }
    });
}

async function publishResult(resultId, action, button) {
    const originalHTML = button.innerHTML;
    
    try {
        button.innerHTML = '<span class="loading-spinner"></span>';
        button.disabled = true;
        
        const response = await fetch(`/academics/results/${resultId}/publish/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            
            const isPublished = data.is_published;
            button.setAttribute('data-action', isPublished ? 'unpublish' : 'publish');
            button.innerHTML = `<i class="bi bi-${isPublished ? 'eye-slash' : 'eye'}"></i>`;
            
            const row = button.closest('tr');
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = isPublished ? 'Published' : 'Draft';
                    statusBadge.className = `status-badge ${isPublished ? 'published' : 'draft'}`;
                }
            }
        } else {
            showToast(data.error || 'Failed to update result', 'error');
            button.innerHTML = originalHTML;
        }
    } catch (error) {
        console.error('Error publishing result:', error);
        showToast('An error occurred while updating result', 'error');
        button.innerHTML = originalHTML;
    } finally {
        button.disabled = false;
    }
}

function initializeDeleteButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-btn')) {
            const button = e.target.closest('.delete-btn');
            const resultId = button.getAttribute('data-result-id');
            
            showDeleteConfirmation(resultId, button);
        }
    });
}

function showDeleteConfirmation(resultId, button) {
    const row = button.closest('tr');
    const studentName = row.querySelector('.student-info strong').textContent;
    const subjectName = row.querySelector('td:nth-child(2)').textContent;
    
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-icon">
                <i class="bi bi-exclamation-triangle text-danger"></i>
            </div>
            <h3 class="confirmation-title">Delete Result</h3>
            <p class="confirmation-message">
                Are you sure you want to delete the result for <strong>${studentName}</strong> in <strong>${subjectName}</strong>? 
                This action cannot be undone.
            </p>
            <div class="confirmation-actions">
                <button class="btn btn-outline btn-cancel">Cancel</button>
                <button class="btn btn-danger btn-confirm-delete" data-result-id="${resultId}">
                    <i class="bi bi-trash"></i> Delete Result
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-confirm-delete').addEventListener('click', function() {
        const resultId = this.getAttribute('data-result-id');
        deleteResult(resultId, row);
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function deleteResult(resultId, row) {
    try {
        const response = await fetch(`/academics/results/${resultId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            row.style.opacity = '0';
            row.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                row.remove();
            }, 300);
        } else {
            showToast(data.error || 'Failed to delete result', 'error');
        }
    } catch (error) {
        console.error('Error deleting result:', error);
        showToast('An error occurred while deleting result', 'error');
    }
}

// Filter functionality
function initializeFilters() {
    const filterForm = document.querySelector('.filters-form');
    if (filterForm) {
        const inputs = filterForm.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                clearTimeout(window.filterTimeout);
                window.filterTimeout = setTimeout(() => {
                    filterForm.submit();
                }, 500);
            });
        });
    }
}

function initializeScoreInputs() {
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('score-input')) {
            validateScoreInput(e.target);
        }
    });
}

function validateScoreInput(input) {
    const value = parseFloat(input.value);
    
    input.classList.remove('error');
    
    if (isNaN(value)) {
        input.classList.add('error');
        return false;
    }
    
    if (value < 0 || value > 100) {
        input.classList.add('error');
        return false;
    }
    
    return true;
}

function selectAllResults(checkbox) {
    const checkboxes = document.querySelectorAll('.result-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

async function bulkPublishResults(publish = true) {
    const selectedCheckboxes = document.querySelectorAll('.result-checkbox:checked');
    const resultIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (resultIds.length === 0) {
        showToast('Please select at least one result', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/academics/api/results/publish-bulk/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                result_ids: resultIds,
                publish: publish
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.error || 'Failed to update results', 'error');
        }
    } catch (error) {
        console.error('Error in bulk operation:', error);
        showToast('An error occurred while updating results', 'error');
    }
}

function exportResults(format = 'csv') {
    const filters = getCurrentFilters();
    
    let exportUrl = `/academics/results/export/?format=${format}`;
    
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            exportUrl += `&${key}=${filters[key]}`;
        }
    });
    
    window.location.href = exportUrl;
}

function getCurrentFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const filters = {};
    
    for (const [key, value] of urlParams) {
        filters[key] = value;
    }
    
    return filters;
}

function initializeStudentResults() {
    const termHeaders = document.querySelectorAll('.term-header');
    
    termHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const resultsSummary = this.nextElementSibling;
            resultsSummary.style.display = resultsSummary.style.display === 'none' ? 'block' : 'none';
            this.classList.toggle('collapsed');
        });
    });
}

// Analysis chart initialization
function initializeAnalysisCharts() {
    // Grade distribution chart
    const gradeCtx = document.getElementById('gradeDistributionChart');
    if (gradeCtx) {
        new Chart(gradeCtx, {
            type: 'bar',
            data: {
                labels: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'F'],
                datasets: [{
                    label: 'Number of Students',
                    data: [12, 25, 30, 20, 15, 10, 8, 5, 3, 2],
                    backgroundColor: [
                        '#10b981', '#10b981', '#3b82f6', '#3b82f6', 
                        '#f59e0b', '#f59e0b', '#f59e0b', '#ef4444', 
                        '#ef4444', '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Grade Distribution'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                }
            }
        });
    }
    
    const subjectCtx = document.getElementById('subjectPerformanceChart');
    if (subjectCtx) {
        new Chart(subjectCtx, {
            type: 'radar',
            data: {
                labels: ['Mathematics', 'English', 'Science', 'Social Studies', 'ICT', 'French'],
                datasets: [{
                    label: 'Average Score',
                    data: [85, 78, 82, 75, 88, 70],
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }
}


if (document.querySelector('.results-dashboard')) {
    initializeResultsPage();
}

if (document.querySelector('.student-results')) {
    initializeStudentResults();
}

if (document.querySelector('.results-analysis')) {
    initializeAnalysisCharts();
}