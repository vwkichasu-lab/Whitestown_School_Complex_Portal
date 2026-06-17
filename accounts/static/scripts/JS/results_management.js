class ResultsManager {
    constructor() {
        this.uploadUrl = '/teacher/results/upload/';
        this.deleteUrl = '/academics/results/';
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Only load students if we're on a page with the subject select
        const subjectSelect = document.getElementById('subjectSelect');
        if (subjectSelect) {
            this.loadStudentsForSubject();
        }
    }

    setupEventListeners() {
        const uploadForm = document.getElementById('uploadResultForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }

        const subjectSelect = document.getElementById('subjectSelect');
        if (subjectSelect) {
            subjectSelect.addEventListener('change', () => this.loadStudentsForSubject());
        }

        const scoreInput = document.querySelector('input[name="score"]');
        if (scoreInput) {
            scoreInput.addEventListener('input', () => this.previewGrade());
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-result')) {
                const resultId = e.target.closest('.delete-result').dataset.resultId;
                this.deleteResult(resultId);
            }
        });

        const filterSelects = document.querySelectorAll('.filters-form select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                document.querySelector('.filters-form').submit();
            });
        });
    }

    async loadStudentsForSubject() {
        const subjectSelect = document.getElementById('subjectSelect');
        const studentSelect = document.getElementById('studentSelect');
        
        if (!subjectSelect || !studentSelect) {
            return;
        }

        const subjectId = subjectSelect.value;

        if (!subjectId) {
            studentSelect.innerHTML = '<option value="">Select Subject First</option>';
            return;
        }

        try {
            studentSelect.innerHTML = '<option value="">Loading students...</option>';
            studentSelect.disabled = true;

            const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
            const classId = selectedOption.dataset.classId;

            if (!classId) {
                studentSelect.innerHTML = '<option value="">No class information</option>';
                return;
            }

            const response = await fetch(`/ajax/students/?class_id=${classId}`);
            const data = await response.json();

            if (data.students && data.students.length > 0) {
                studentSelect.innerHTML = '<option value="">Select Student</option>';
                data.students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.full_name} (${student.student_id})`;
                    studentSelect.appendChild(option);
                });
            } else {
                studentSelect.innerHTML = '<option value="">No students found</option>';
            }
        } catch (error) {
            console.error('Error loading students:', error);
            studentSelect.innerHTML = '<option value="">Error loading students</option>';
            this.showNotification('Error loading students', 'error');
        } finally {
            studentSelect.disabled = false;
        }
    }

    previewGrade() {
        const scoreInput = document.querySelector('input[name="score"]');
        const gradePreview = document.getElementById('gradePreview');
        
        if (!scoreInput || !gradePreview) {
            return;
        }

        const score = parseFloat(scoreInput.value);

        if (isNaN(score) || score < 0 || score > 100) {
            gradePreview.textContent = '-';
            gradePreview.className = '';
            return;
        }

        let grade = '';
        if (score >= 90) grade = 'A+';
        else if (score >= 80) grade = 'A';
        else if (score >= 75) grade = 'B+';
        else if (score >= 70) grade = 'B';
        else if (score >= 65) grade = 'C+';
        else if (score >= 60) grade = 'C';
        else if (score >= 55) grade = 'D+';
        else if (score >= 50) grade = 'D';
        else if (score >= 35) grade = 'E';
        else grade = 'F';

        gradePreview.textContent = grade;
        gradePreview.className = `grade-badge grade-${grade.toLowerCase()}`;
    }

    async handleUpload(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading...';
        }

        try {
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.getCsrfToken(),
                },
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Result uploaded successfully!', 'success');
                this.addResultToTable(data.result);
                this.resetUploadForm();
                
                const modal = document.getElementById('uploadModal');
                if (modal && bootstrap?.Modal) {
                    bootstrap.Modal.getInstance(modal)?.hide();
                }
            } else {
                throw new Error(data.error || 'Failed to upload result');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Error uploading result: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-cloud-upload"></i> Upload Result';
            }
        }
    }

    async deleteResult(resultId) {
        if (!confirm('Are you sure you want to delete this result? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.deleteUrl}${resultId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.getCsrfToken(),
                },
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Result deleted successfully!', 'success');
                this.removeResultFromTable(resultId);
            } else {
                throw new Error(data.error || 'Failed to delete result');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Error deleting result: ' + error.message, 'error');
        }
    }

    addResultToTable(resultData) {
        const tbody = document.getElementById('results-tbody');
        const emptyState = document.querySelector('.empty-state');
        
        if (!tbody) {
            return;
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        const newRow = document.createElement('tr');
        newRow.dataset.resultId = resultData.id;
        newRow.innerHTML = `
            <td>
                <div class="student-info">
                    <div class="student-avatar-sm">
                        <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="student-details">
                        <strong>${this.escapeHtml(resultData.student_name)}</strong>
                        <small>${this.escapeHtml(resultData.student_id || 'N/A')}</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="subject-info">
                    <strong>${this.escapeHtml(resultData.subject_name)}</strong>
                    <small>${this.escapeHtml(resultData.subject_code || '')}</small>
                </div>
            </td>
            <td>
                <span class="class-badge">${this.escapeHtml(resultData.class_name || 'N/A')}</span>
            </td>
            <td>
                <div class="score-display">
                    <span class="score-value">${resultData.score}</span>
                    <small>%</small>
                </div>
            </td>
            <td>
                <span class="grade-badge grade-${this.escapeHtml(resultData.grade || '').toLowerCase()}">${this.escapeHtml(resultData.grade || 'N/A')}</span>
            </td>
            <td>
                <span class="term-badge">${this.escapeHtml(resultData.term_name || 'N/A')} ${this.escapeHtml(resultData.academic_year || '')}</span>
            </td>
            <td>
                <span class="upload-date">${this.escapeHtml(resultData.date_uploaded || '')}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-danger delete-result" 
                            data-result-id="${resultData.id}"
                            title="Delete Result">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.insertBefore(newRow, tbody.firstChild);
        
        const badge = document.querySelector('.card-header .badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = `${currentCount + 1} result${currentCount + 1 !== 1 ? 's' : ''}`;
        }
    }

    removeResultFromTable(resultId) {
        const row = document.querySelector(`tr[data-result-id="${resultId}"]`);
        if (row) {
            row.remove();
        }

        const tbody = document.getElementById('results-tbody');
        if (tbody && tbody.children.length === 0) {
            const emptyState = document.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        }
        
        const badge = document.querySelector('.card-header .badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            const newCount = Math.max(0, currentCount - 1);
            badge.textContent = `${newCount} result${newCount !== 1 ? 's' : ''}`;
        }
    }

    resetUploadForm() {
        const form = document.getElementById('uploadResultForm');
        if (form) {
            form.reset();
            
            const gradePreview = document.getElementById('gradePreview');
            if (gradePreview) {
                gradePreview.textContent = '-';
                gradePreview.className = '';
            }
            
            const studentSelect = document.getElementById('studentSelect');
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select Subject First</option>';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Try to use existing notification container
        let container = document.getElementById('notifications');
        
        // Create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.style.cssText = 'margin-bottom: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        notification.innerHTML = `
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 150);
            }
        }, 5000);
        
        const closeBtn = notification.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 150);
            });
        }
    }

    getCsrfToken() {
        const tokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (tokenInput) {
            return tokenInput.value;
        }
        
        const cookieMatch = document.cookie.match(/csrftoken=([^;]+)/);
        return cookieMatch ? cookieMatch[1] : '';
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.resultsManager = new ResultsManager();
});