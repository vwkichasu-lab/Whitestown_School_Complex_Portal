import showToast from "/static/scripts/JS/admin_d.js"
import hideLoader from "/static/scripts/JS/admin_d.js"
import showLoader from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"

document.addEventListener('click', function(e) {
    const dropdownBtn = e.target.closest('.dropdown-toggle');
    if (dropdownBtn) {
        const dropdown = dropdownBtn.closest('.dropdown');
        dropdown.classList.toggle('show');
    } else {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// Delete confirmation modal for subjects
function showDeleteConfirmation(subjectId, subjectName) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h3 class="confirmation-title">Delete Subject</h3>
            <p class="confirmation-message">
                Are you sure you want to delete <strong>${subjectName}</strong>? 
                This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div class="confirmation-actions">
                <button class="btn btn-outline btn-cancel" style="padding: 10px 20px;">Cancel</button>
                <button class="btn btn-danger btn-confirm-delete" style="padding: 10px 20px;" data-subject-id="${subjectId}">
                    <i class="bi bi-trash"></i> Delete Subject
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-confirm-delete').addEventListener('click', function() {
        const subjectId = this.getAttribute('data-subject-id');
        deleteSubject(subjectId);
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Delete subject function
async function deleteSubject(subjectId) {
    try {
        const response = await fetch(`/academics/subjects/${subjectId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            const subjectCard = document.querySelector(`[data-subject-id="${subjectId}"]`).closest('.subject-card');
            if (subjectCard) {
                subjectCard.remove();
            }
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.error || 'Failed to delete subject', 'error');
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        showToast('An error occurred while deleting subject', 'error');
    }
}

// Get subject data
async function getSubjectData(subjectId) {
    try {
        const response = await fetch(`/academics/subjects/${subjectId}/data/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            return data.data;
        } else {
            showToast(data.error || 'Failed to load subject data', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error fetching subject data:', error);
        showToast('An error occurred while loading subject data', 'error');
        return null;
    }
}

// View subject function
async function viewSubject(subjectId) {
    try {
        showLoader();
        const subjectData = await getSubjectData(subjectId);
        hideLoader();
        
        if (subjectData) {
            showViewModal(subjectData);
        }
    } catch (error) {
        hideLoader();
        console.error('Error viewing subject:', error);
    }
}

// Edit subject function
async function editSubject(subjectId) {
    try {
        showLoader();
        const subjectData = await getSubjectData(subjectId);
        hideLoader();
        
        if (subjectData) {
            showEditModal(subjectData);
        }
    } catch (error) {
        hideLoader();
        console.error('Error editing subject:', error);
    }
}

// Show view modal
function showViewModal(subjectData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📚 Subject Details</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="subject-view-content">
                    <div class="subject-basic-info">
                        <div class="subject-icon-large" style="background: ${subjectData.category === 'core' ? 'var(--primary)' : 'var(--secondary)'};">
                            <i class="bi bi-journal-text"></i>
                        </div>
                        <div class="subject-name-large">${subjectData.name}</div>
                        <div class="subject-code">${subjectData.code}</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Category</label>
                            <span>${subjectData.category === 'core' ? 'Core Subject' : 'Elective Subject'}</span>
                        </div>
                        <div class="info-item">
                            <label>Status</label>
                            <span class="status-badge ${subjectData.is_active ? 'active' : 'inactive'}">
                                ${subjectData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Assigned Teacher</label>
                            <span>${subjectData.teacher_name || 'Not assigned'}</span>
                        </div>
                        <div class="info-item full-width">
                            <label>Description</label>
                            <span>${subjectData.description || 'No description provided'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary close-modal">Close</button>
                <button type="button" class="btn btn-primary edit-from-view" data-subject-id="${subjectData.id}">
                    <i class="bi bi-pencil-square"></i> Edit Subject
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.edit-from-view').addEventListener('click', () => {
        modal.remove();
        editSubject(subjectData.id);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Show edit modal
function showEditModal(subjectData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>✏️ Edit Subject</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="editSubjectForm" data-subject-id="${subjectData.id}">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Subject Name</label>
                        <input type="text" name="name" class="form-control" value="${subjectData.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Subject Code</label>
                        <input type="text" name="code" class="form-control" value="${subjectData.code || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-control" rows="3">${subjectData.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select name="category" class="form-control">
                            <option value="core" ${subjectData.category === 'core' ? 'selected' : ''}>Core Subject</option>
                            <option value="elective" ${subjectData.category === 'elective' ? 'selected' : ''}>Elective Subject</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" name="is_active" ${subjectData.is_active ? 'checked' : ''}>
                            <span>Active Subject</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Subject</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#editSubjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateSubject(subjectData.id, new FormData(e.target));
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update subject function
async function updateSubject(subjectId, formData) {
    try {
        const response = await fetch(`/academics/subjects/${subjectId}/update/`, {
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
            }, 1500);
        } else {
            showToast(data.error || 'Failed to update subject', 'error');
        }
    } catch (error) {
        console.error('Error updating subject:', error);
        showToast('An error occurred while updating subject', 'error');
    }
}


// Assign teacher to subject, this is outdated, it'snot been used
async function assignTeacherToSubject(subjectId) {
    try {
        showLoader();
        
        // Get available teachers
        const teachersResponse = await fetch('/academics/teachers/api/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken(),
            },
        });

        const teachersData = await teachersResponse.json();
        hideLoader();

        if (teachersData.success) {
            showTeacherAssignmentModal(subjectId, teachersData.teachers);
        } else {
            showToast('Failed to load teachers', 'error');
        }
    } catch (error) {
        hideLoader();
        console.error('Error loading teachers:', error);
        showToast('An error occurred while loading teachers', 'error');
    }
}

// Show teacher assignment modal, this is outdated, it'snot been used
function showTeacherAssignmentModal(subjectId, teachers) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>👨‍🏫 Assign Teacher</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="assignTeacherForm" data-subject-id="${subjectId}">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Teacher</label>
                        <select name="teacher_id" class="form-control" required>
                            <option value="">Select a teacher...</option>
                            ${teachers.map(teacher => `
                                <option value="${teacher.id}">${teacher.name} (${teacher.email})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-help">
                        <i class="bi bi-info-circle"></i>
                        This teacher will be assigned as the primary teacher for this subject.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Assign Teacher</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#assignTeacherForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitTeacherAssignment(subjectId, new FormData(e.target));
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Submit teacher assignment, this is outdated, it'snot been used
async function submitTeacherAssignment(subjectId, formData) {
    try {
        const response = await fetch(`/academics/subjects/${subjectId}/assign-teacher/`, {
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
            }, 1500);
        } else {
            showToast(data.error || 'Failed to assign teacher', 'error');
        }
    } catch (error) {
        console.error('Error assigning teacher:', error);
        showToast('An error occurred while assigning teacher', 'error');
    }
}

// Event listeners
document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
        const btn = e.target.closest('.delete-btn');
        const subjectId = btn.getAttribute('data-subject-id');
        const subjectName = btn.closest('.subject-card').querySelector('.subject-name').textContent;
        showDeleteConfirmation(subjectId, subjectName);
    }
    
    if (e.target.closest('.view-btn')) {
        const btn = e.target.closest('.view-btn');
        const subjectId = btn.getAttribute('data-subject-id');
        viewSubject(subjectId);
    }
    
    if (e.target.closest('.edit-btn')) {
        const btn = e.target.closest('.edit-btn');
        const subjectId = btn.getAttribute('data-subject-id');
        editSubject(subjectId);
    }

    if (e.target.closest('.assign-teacher-btn')) {
        const btn = e.target.closest('.assign-teacher-btn');
        const subjectId = btn.getAttribute('data-subject-id');
        window.location.href = `/academics/subjects/${subjectId}/manage-teachers/`;
    }
});

// Handle subject creation form
document.addEventListener('DOMContentLoaded', function() {
    const subjectForm = document.getElementById('subjectForm');
    if (subjectForm) {
        subjectForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating...';
                submitBtn.disabled = true;
                
                const response = await fetch(this.getAttribute('data-url'), {
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
                    setTimeout(() => {
                        const modal = document.getElementById('subjectModal');
                        if (modal) modal.style.display = 'none';
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(data.error || 'Failed to create subject', 'error');
                }
            } catch (error) {
                console.error('Error creating subject:', error);
                showToast('An error occurred while creating subject', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Modal functionality
    const openModalBtn = document.getElementById('openSubjectModal');
    const modal = document.getElementById('subjectModal');
    const closeModalBtns = document.querySelectorAll('.closeModal');

    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (closeModalBtns) {
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});