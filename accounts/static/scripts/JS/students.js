import showToast from "/static/scripts/JS/admin_d.js"
import hideLoader from "/static/scripts/JS/admin_d.js"
import showLoader from "/static/scripts/JS/admin_d.js"

// Dropdown functionality
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

// Delete confirmation modal for students
function showDeleteConfirmation(studentId, studentName) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h3 class="confirmation-title">Delete Student</h3>
            <p class="confirmation-message">
                Are you sure you want to delete <strong>${studentName}</strong>? 
                This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div class="confirmation-actions">
                <button class="btn btn-outline btn-cancel" style="padding: 10px 20px;">Cancel</button>
                <button class="btn btn-danger btn-confirm-delete" style="padding: 10px 20px;" data-student-id="${studentId}">
                    <i class="bi bi-trash"></i> Delete Student
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-confirm-delete').addEventListener('click', function() {
        const studentId = this.getAttribute('data-student-id');
        deleteStudent(studentId);
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function deleteStudent(studentId) {
    try {
        const response = await fetch(`/account/users/${studentId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            // Remove the student card from the DOM
            const studentCard = document.querySelector(`[data-student-id="${studentId}"]`).closest('.student-card');
            if (studentCard) {
                studentCard.remove();
            }
            // Reload the page after a short delay to update stats
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.error || 'Failed to delete student', 'error');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast('An error occurred while deleting the student', 'error');
    }
}

async function resetPassword(studentId) {
    try {
        const response = await fetch(`/account/users/${studentId}/reset-password/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
        } else {
            showToast(data.error || 'Failed to reset password', 'error');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showToast('An error occurred while resetting password', 'error');
    }
}

// Change password function for students
async function changePassword(studentId) {
    try {
        // Show loader
        showLoader();
        
        const studentData = await getStudentData(studentId);
        
        if (studentData) {
            // Hide loader and show change password modal
            hideLoader();
            showChangePasswordModal(studentData);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error loading student data for password change:', error);
        showToast('An error occurred while loading student data', 'error');
    }
}

// Get student data for viewing/editing
async function getStudentData(studentId) {
    try {
        const response = await fetch(`/account/users/${studentId}/data/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            return data.data;
        } else {
            showToast(data.error || 'Failed to load student data', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error fetching student data:', error);
        showToast('An error occurred while loading student data', 'error');
        return null;
    }
}

// View student function
async function viewStudent(studentId) {
    try {
        // Show loader
        showLoader();
        
        const studentData = await getStudentData(studentId);
        
        if (studentData) {
            // Hide loader and show view modal
            hideLoader();
            showViewModal(studentData);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error viewing student:', error);
        showToast('An error occurred while loading student details', 'error');
    }
}


async function loadClasses() {
    const response = await fetch('/account/ajax/classes/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })

    if(response){
        const data = await response.json()
        console.log(data)
        return data.classes
    }else{
        console.error('Error:', error);
    }
}


// Edit student function
async function editStudent(studentId) {
    try {
        showLoader();
        
        const studentData = await getStudentData(studentId);
        const classes = await loadClasses();

        
        if (studentData || classes) {
            hideLoader();
            showEditModal(studentData, classes);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error editing student:', error);
        showToast('An error occurred while loading student data for editing', 'error');
    }
}

// Show view modal with student data
function showViewModal(studentData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>👨‍🎓 Student Details</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="student-view-content">
                    <div class="student-basic-info">
                        <div class="student-avatar-large">
                            ${studentData.first_name?.charAt(0)}${studentData.last_name?.charAt(0)}
                        </div>
                        <div class="student-name-large">${studentData.first_name} ${studentData.last_name}</div>
                        <div class="student-id">${studentData.student_id}</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Email</label>
                            <span>${studentData.email}</span>
                        </div>
                        <div class="info-item">
                            <label>Phone</label>
                            <span>${studentData.phone_number || 'Not provided'}</span>
                        </div>
                        <div class="info-item">
                            <label>Class</label>
                            <span>${studentData.current_class_name || 'Not assigned'}</span>
                        </div>
                        <div class="info-item">
                            <label>Gender</label>
                            <span>${studentData.gender === 'M' ? 'Male' : studentData.gender === 'F' ? 'Female' : 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <label>Date of Birth</label>
                            <span>${studentData.date_of_birth ? new Date(studentData.date_of_birth).toLocaleDateString() : 'Not provided'}</span>
                        </div>
                        <div class="info-item">
                            <label>Status</label>
                            <span class="status-badge ${studentData.is_active ? 'active' : 'inactive'}">
                                ${studentData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Parent Name</label>
                            <span>${studentData.parent_full_name || 'Not provided'}</span>
                        </div>
                        <div class="info-item">
                            <label>Parent Phone</label>
                            <span>${studentData.parent_phone || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary close-modal">Close</button>
                <button type="button" class="btn btn-primary edit-from-view" data-student-id="${studentData.id}">
                    <i class="bi bi-pencil-square"></i> Edit Student
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.edit-from-view').addEventListener('click', () => {
        modal.remove();
        editStudent(studentData.id);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Show edit modal with student data
function showEditModal(studentData, classes) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>✏️ Edit Student</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="editStudentForm" data-student-id="${studentData.id}">
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>First Name </label>
                            <input type="text" name="first_name" class="form-control" value="${studentData.first_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name </label>
                            <input type="text" name="last_name" class="form-control" value="${studentData.last_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" name="date_of_birth" class="form-control" value="${studentData.date_of_birth || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gender</label>
                            <select name="gender" class="form-control">
                                <option value="">Select gender...</option>
                                <option value="M" ${studentData.gender === 'M' ? 'selected' : ''}>Male</option>
                                <option value="F" ${studentData.gender === 'F' ? 'selected' : ''}>Female</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Class</label>
                            <select name="current_class" class="form-control" required>
                                <option value="">Select class...</option>
                                ${classes.map(cls => `
                                    <option value="${cls.id}">${cls.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Parent Full Name</label>
                            <input type="text" name="parent_full_name" class="form-control" value="${studentData.parent_full_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Parent Phone</label>
                            <input type="tel" name="parent_phone" class="form-control" value="${studentData.parent_phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Parent Email</label>
                            <input type="email" name="parent_email" class="form-control" value="${studentData.parent_email || ''}">
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="is_active" ${studentData.is_active ? 'checked' : ''}>
                                <span>Active Status</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Student</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Form submission
    modal.querySelector('#editStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateStudent(studentData.id, new FormData(e.target));
    });
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update student function
async function updateStudent(studentId, formData) {
    try {
        const response = await fetch(`/account/users/${studentId}/update/`, {
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
            // Close modal and reload page
            document.querySelector('.modal.show')?.remove();
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.error || 'Failed to update student', 'error');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showToast('An error occurred while updating student', 'error');
    }
}

// Show change password modal for students
function showChangePasswordModal(studentData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🔑 Change Password</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="changePasswordForm" data-student-id="${studentData.id}">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Student</label>
                        <div class="student-info">
                            <div class="student-avatar-small">
                                ${studentData.first_name?.charAt(0)}${studentData.last_name?.charAt(0)}
                            </div>
                            <div class="student-details">
                                <div class="student-name">${studentData.first_name} ${studentData.last_name}</div>
                                <div class="student-email">${studentData.email}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="newPassword">New Password *</label>
                        <input type="password" id="newPassword" name="new_password" class="form-control" placeholder="Enter new password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password *</label>
                        <input type="password" id="confirmPassword" name="confirm_password" class="form-control" placeholder="Confirm new password" required>
                    </div>
                    
                    <div class="password-requirements">
                        <p class="requirements-title">Password must contain:</p>
                        <ul class="requirements-list">
                            <li class="requirement" data-requirement="length">At least 8 characters</li>
                            <li class="requirement" data-requirement="uppercase">One uppercase letter</li>
                            <li class="requirement" data-requirement="lowercase">One lowercase letter</li>
                            <li class="requirement" data-requirement="number">One number</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Password</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Form submission
    modal.querySelector('#changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateStudentPassword(studentData.id, new FormData(e.target));
    });
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update student password function
async function updateStudentPassword(studentId, formData) {
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    // Client-side validation
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/users/${studentId}/change-password/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                new_password: newPassword,
                confirm_password: confirmPassword
            }),
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            document.querySelector('.modal.show')?.remove();
        } else {
            showToast(data.error || 'Failed to update password', 'error');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showToast('An error occurred while updating password', 'error');
    }
}

// Utility functions
function getCsrfToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

// Event listeners for action buttons
document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
        const btn = e.target.closest('.delete-btn');
        const studentId = btn.getAttribute('data-student-id');
        const studentName = btn.closest('.student-card').querySelector('.student-name').textContent;
        showDeleteConfirmation(studentId, studentName);
    }
    
    if (e.target.closest('.view-btn')) {
        const btn = e.target.closest('.view-btn');
        const studentId = btn.getAttribute('data-student-id');
        viewStudent(studentId);
    }
    
    if (e.target.closest('.edit-btn')) {
        const btn = e.target.closest('.edit-btn');
        const studentId = btn.getAttribute('data-student-id');
        editStudent(studentId);
    }
    
    if (e.target.closest('.change-password-btn')) {
        const btn = e.target.closest('.change-password-btn');
        const studentId = btn.getAttribute('data-student-id');
        changePassword(studentId);
    }
});

// Handle student registration form submission
document.addEventListener('DOMContentLoaded', function() {
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                // Show loading state
                submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Registering...';
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
                        const modal = document.getElementById('studentModal');
                        if (modal) modal.style.display = 'none';
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(data.error || 'Failed to register student', 'error');
                }
            } catch (error) {
                console.error('Error registering student:', error);
                showToast('An error occurred while registering student', 'error');
            } finally {
                // Reset button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Modal open/close functionality
    const openModalBtn = document.getElementById('openModal');
    const modal = document.getElementById('studentModal');
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

    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});