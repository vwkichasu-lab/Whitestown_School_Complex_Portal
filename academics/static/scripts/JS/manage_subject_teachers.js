import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"
import hideLoader from "/static/scripts/JS/admin_d.js"
import showLoader from "/static/scripts/JS/admin_d.js"


document.addEventListener('DOMContentLoaded', function() {
    const addAssignmentForm = document.getElementById('addAssignmentForm');
    const assignmentsList = document.querySelector('.assignments-list tbody');
    
    // Add new assignment
    if (addAssignmentForm) {
        addAssignmentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Adding...';
                submitBtn.disabled = true;
                
                const response = await fetch('/academics/subjects/assign-teacher-to-class/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const data = await response.json();

                if (data.success) {
                    showToast(data.message, 'success');
                    this.reset();
                    // Reload the page to show new assignment
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    showToast(data.error || 'Failed to add assignment', 'error');
                }
            } catch (error) {
                console.error('Error adding assignment:', error);
                showToast('An error occurred while adding assignment', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Edit assignment
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-assignment')) {
            const btn = e.target.closest('.edit-assignment');
            const assignmentId = btn.getAttribute('data-assignment-id');
            const classLevelId = btn.getAttribute('data-class-level');
            const academicYearId = btn.getAttribute('data-academic-year');
            const teacherId = btn.getAttribute('data-teacher');
            
            showEditAssignmentModal(assignmentId, classLevelId, academicYearId, teacherId);
        }
        
        if (e.target.closest('.delete-assignment')) {
            const btn = e.target.closest('.delete-assignment');
            const assignmentId = btn.getAttribute('data-assignment-id');
            const assignmentRow = btn.closest('tr');
            const className = assignmentRow.querySelector('td:first-child').textContent;
            const yearName = assignmentRow.querySelector('td:nth-child(2)').textContent;
            
            showDeleteConfirmation(assignmentId, className, yearName);
        }
    });
});

// Show edit assignment modal
function showEditAssignmentModal(assignmentId, classLevelId, academicYearId, teacherId) {
    // Find the table row that contains this assignment
    const assignmentRow = document.querySelector(`.edit-assignment[data-assignment-id="${assignmentId}"]`).closest('tr');
    
    // Get class and year names directly from the table row
    const className = assignmentRow.querySelector('td:first-child').textContent.trim();
    const yearName = assignmentRow.querySelector('td:nth-child(2)').textContent.trim();
    const teacherSelect = document.querySelector('select[name="teacher_id"]');
    const teacherName = teacherSelect.querySelector(`option[value="${teacherId}"]`)?.textContent || 'No Teacher';
    
    const modal = document.createElement('div');
    modal.className = 'modal show edit-assignment-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>✏️ Edit Assignment</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="editAssignmentForm" data-assignment-id="${assignmentId}">
                <div class="modal-body">
                    <div class="assignment-details">
                        <div class="assignment-detail-item">
                            <span class="assignment-detail-label">Class:</span>
                            <span class="assignment-detail-value">${className}</span>
                        </div>
                        <div class="assignment-detail-item">
                            <span class="assignment-detail-label">Academic Year:</span>
                            <span class="assignment-detail-value">${yearName}</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Teacher</label>
                        <select name="teacher_id" class="form-control">
                            <option value="">No Teacher</option>
                            ${Array.from(document.querySelectorAll('select[name="teacher_id"] option')).slice(1).map(option => `
                                <option value="${option.value}" ${option.value === teacherId ? 'selected' : ''}>
                                    ${option.textContent}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Assignment</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#editAssignmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateAssignment(assignmentId, new FormData(e.target));
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update assignment
async function updateAssignment(assignmentId, formData) {
    try {
        formData.append('assignment_id', assignmentId);
        
        const response = await fetch('/academics/subjects/update-class-assignment/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            document.querySelector('.modal.show')?.remove();
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast(data.error || 'Failed to update assignment', 'error');
        }
    } catch (error) {
        console.error('Error updating assignment:', error);
        showToast('An error occurred while updating assignment', 'error');
    }
}

function showDeleteConfirmation(assignmentId, className, yearName) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-icon">
                <i class="bi bi-exclamation-triangle text-warning"></i>
            </div>
            <h3 class="confirmation-title">Remove Assignment</h3>
            <p class="confirmation-message">
                Are you sure you want to remove this assignment?<br>
                <strong>${className} - ${yearName}</strong><br><br>
                This will remove the teacher assignment but keep the subject assigned to the class.
            </p>
            <div class="confirmation-actions">
                <button class="btn btn-outline btn-cancel">Cancel</button>
                <button class="btn btn-danger btn-confirm-delete" data-assignment-id="${assignmentId}">
                    <i class="bi bi-trash"></i> Remove Assignment
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-confirm-delete').addEventListener('click', function() {
        const assignmentId = this.getAttribute('data-assignment-id');
        deleteAssignment(assignmentId);
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Delete assignment
async function deleteAssignment(assignmentId) {
    try {
        const response = await fetch(`/academics/subjects/class-assignment/${assignmentId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast(data.error || 'Failed to remove assignment', 'error');
        }
    } catch (error) {
        console.error('Error removing assignment:', error);
        showToast('An error occurred while removing assignment', 'error');
    }
}

// Form validation
document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.querySelector('select[name="class_level_id"]');
    const yearSelect = document.querySelector('select[name="academic_year_id"]');
    
    function validateForm() {
        const submitBtn = document.querySelector('#addAssignmentForm button[type="submit"]');
        const isClassSelected = classSelect.value !== '';
        const isYearSelected = yearSelect.value !== '';
        
        submitBtn.disabled = !(isClassSelected && isYearSelected);
    }
    
    if (classSelect && yearSelect) {
        classSelect.addEventListener('change', validateForm);
        yearSelect.addEventListener('change', validateForm);
        validateForm(); // Initial validation
    }
});