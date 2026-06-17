import showToast from "/static/scripts/JS/admin_d.js"

document.getElementById("openModal").onclick = openModal
document.querySelectorAll(".closeModal").onclick = closeModal

function openModal() {
    document.getElementById('teacherModal').classList.add('show');
}

function closeModal() {
    document.getElementById('teacherModal').classList.remove('show');
}

document.getElementById('teacherModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444'];

document.querySelectorAll('.teacher-avatar').forEach((avatar, index) => {
    avatar.style.background = colors[index % colors.length];
});

function getCSRFToken() {
    let name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


const csrftoken = getCSRFToken();

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

function showDeleteConfirmation(teacherId, teacherName) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h3 class="confirmation-title">Delete Teacher</h3>
            <p class="confirmation-message">
                Are you sure you want to delete <strong>${teacherName}</strong>? 
                This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div class="confirmation-actions">
                <button class="btn btn-outline btn-cancel" style="padding: 10px 20px;">Cancel</button>
                <button class="btn btn-danger btn-confirm-delete" style="padding: 10px 20px;" data-teacher-id="${teacherId}">
                    <i class="bi bi-trash"></i> Delete Teacher
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners for modal buttons
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-confirm-delete').addEventListener('click', function() {
        const teacherId = this.getAttribute('data-teacher-id');
        deleteTeacher(teacherId);
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Delete teacher function
async function deleteTeacher(teacherId) {
    try {
        const response = await fetch(`/account/users/${teacherId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            const teacherCard = document.querySelector(`[data-teacher-id="${teacherId}"]`).closest('.teacher-card');
            if (teacherCard) {
                teacherCard.remove();
            }
            // Reload the page after a short delay to update stats
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.error || 'Failed to delete teacher', 'error');
        }
    } catch (error) {
        console.error('Error deleting teacher:', error);
        showToast('An error occurred while deleting the teacher', 'error');
    }
}


// Toggle user status function
async function toggleUserStatus(teacherId, currentStatus) {
    try {
        const response = await fetch(`/users/${teacherId}/toggle-status/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            // Update the status indicator in the UI if it exists
            const statusIndicator = document.querySelector(`[data-teacher-id="${teacherId}"] .teacher-status`);
            if (statusIndicator) {
                statusIndicator.classList.toggle('inactive', !data.is_active);
                statusIndicator.title = data.is_active ? 'Active' : 'Inactive';
            }
        } else {
            showToast(data.error || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast('An error occurred while updating status', 'error');
    }
}

// Get teacher data for editing
async function getTeacherData(teacherId) {
    try {
        const response = await fetch(`/account/users/${teacherId}/data/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();

        if (data.success) {
            return data.data;
        } else {
            showToast(data.error || 'Failed to load teacher data', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error fetching teacher data:', error);
        showToast('An error occurred while loading teacher data', 'error');
        return null;
    }
}


async function viewTeacher(teacherId) {
    try {
        // Show loader
        showLoader();
        
        const teacherData = await getTeacherData(teacherId);
        
        if (teacherData) {
            // Hide loader and show view modal
            hideLoader();
            showViewModal(teacherData);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error viewing teacher:', error);
        showToast('An error occurred while loading teacher details', 'error');
    }
}

// Edit teacher function
async function editTeacher(teacherId) {
    try {
        // Show loader
        showLoader();
        
        const teacherData = await getTeacherData(teacherId);
        
        if (teacherData) {
            // Hide loader and show edit modal
            hideLoader();
            showEditModal(teacherData);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error editing teacher:', error);
        showToast('An error occurred while loading teacher data for editing', 'error');
    }
}

// Show view modal with teacher data
function showViewModal(teacherData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>👨‍🏫 Teacher Details</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="teacher-view-content">
                    <div class="teacher-basic-info">
                        <div class="teacher-avatar-large">
                            ${teacherData.first_name?.charAt(0)}${teacherData.last_name?.charAt(0)}
                        </div>
                        <div class="teacher-name-large">${teacherData.first_name} ${teacherData.last_name}</div>
                        <div class="teacher-id">${teacherData.employee_id}</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Email</label>
                            <span>${teacherData.email}</span>
                        </div>
                        <div class="info-item">
                            <label>Phone</label>
                            <span>${teacherData.phone_number || 'Not provided'}</span>
                        </div>
                        <div class="info-item">
                            <label>Employment Type</label>
                            <span>${teacherData.employment_type || 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <label>Gender</label>
                            <span>${teacherData.gender || 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <label>Date of Birth</label>
                            <span>${teacherData.date_of_birth ? new Date(teacherData.date_of_birth).toLocaleDateString() : 'Not provided'}</span>
                        </div>
                        <div class="info-item">
                            <label>Status</label>
                            <span class="status-badge ${teacherData.is_active ? 'active' : 'inactive'}">
                                ${teacherData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary close-modal">Close</button>
                <button type="button" class="btn btn-primary edit-from-view" data-teacher-id="${teacherData.id}">
                    <i class="bi bi-pencil-square"></i> Edit Teacher
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.edit-from-view').addEventListener('click', () => {
        modal.remove();
        editTeacher(teacherData.id);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Show edit modal with teacher data
function showEditModal(teacherData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>✏️ Edit Teacher</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="editTeacherForm" data-teacher-id="${teacherData.id}">
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="first_name" class="form-control" value="${teacherData.first_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="last_name" class="form-control" value="${teacherData.last_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address *</label>
                            <input type="email" name="email" class="form-control" value="${teacherData.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" name="phone_number" class="form-control" value="${teacherData.phone_number || ''}">
                        </div>
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" name="date_of_birth" class="form-control" value="${teacherData.date_of_birth || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gender</label>
                            <select name="gender" class="form-control">
                                <option value="">Select gender...</option>
                                <option value="M" ${teacherData.gender === 'M' ? 'selected' : ''}>Male</option>
                                <option value="F" ${teacherData.gender === 'F' ? 'selected' : ''}>Female</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Employment Type</label>
                            <select name="employment_type" class="form-control" required>
                                <option value="">Select type...</option>
                                <option value="full_time" ${teacherData.employment_type === 'full_time' ? 'selected' : ''}>Full Time</option>
                                <option value="part_time" ${teacherData.employment_type === 'part_time' ? 'selected' : ''}>Part Time</option>
                                <option value="contract" ${teacherData.employment_type === 'contract' ? 'selected' : ''}>Contract</option>
                                <option value="substitute" ${teacherData.employment_type === 'substitute' ? 'selected' : ''}>Substitute</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="is_active" ${teacherData.is_active ? 'checked' : ''}>
                                <span>Active Status</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Teacher</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Form submission
    modal.querySelector('#editTeacherForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateTeacher(teacherData.id, new FormData(e.target));
    });
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update teacher function
async function updateTeacher(teacherId, formData) {
    try {
        const response = await fetch(`/account/users/${teacherId}/update/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrftoken,
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
            showToast(data.error || 'Failed to update teacher', 'error');
        }
    } catch (error) {
        console.error('Error updating teacher:', error);
        showToast('An error occurred while updating teacher', 'error');
    }
}

// Loader functions
function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'modal show';
    loader.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 200px;">
            <div class="loader-spinner"></div>
            <p>Loading...</p>
        </div>
    `;
    loader.id = 'loader-modal';
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.getElementById('loader-modal');
    if (loader) loader.remove();
}

// Change password function
async function changePassword(teacherId) {
    try {
        showLoader();
        
        const teacherData = await getTeacherData(teacherId);
        
        if (teacherData) {
            hideLoader();
            showChangePasswordModal(teacherData);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error loading teacher data for password change:', error);
        showToast('An error occurred while loading teacher data', 'error');
    }
}

// Show change password modal
function showChangePasswordModal(teacherData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🔑 Change Password</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="changePasswordForm" data-teacher-id="${teacherData.id}">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Teacher</label>
                        <div class="teacher-info">
                            <div class="teacher-avatar-small">
                                ${teacherData.first_name?.charAt(0)}${teacherData.last_name?.charAt(0)}
                            </div>
                            <div class="teacher-details">
                                <div class="teacher-name">${teacherData.first_name} ${teacherData.last_name}</div>
                                <div class="teacher-email">${teacherData.email}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="newPassword">New Password </label>
                        <input type="password" id="newPassword" name="new_password" class="form-control" placeholder="Enter new password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password </label>
                        <input type="password" id="confirmPassword" name="confirm_password" class="form-control" placeholder="Confirm new password" required>
                    </div>
                    
                    <div class="password-strength">
                        <div class="strength-meter">
                            <div class="strength-bar"></div>
                        </div>
                        <div class="strength-text">Password strength: <span id="strengthValue">Weak</span></div>
                    </div>
                    
                    <div class="password-requirements">
                        <p class="requirements-title">Password must contain:</p>
                        <ul class="requirements-list">
                            <li class="requirement" data-requirement="length">At least 8 characters</li>
                            <li class="requirement" data-requirement="uppercase">One uppercase letter</li>
                            <li class="requirement" data-requirement="lowercase">One lowercase letter</li>
                            <li class="requirement" data-requirement="number">One number</li>
                            <li class="requirement" data-requirement="special">One special character</li>
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
    
    // Password strength validation
    const passwordInput = modal.querySelector('#newPassword');
    const confirmInput = modal.querySelector('#confirmPassword');
    const strengthBar = modal.querySelector('.strength-bar');
    const strengthValue = modal.querySelector('#strengthValue');
    const requirements = modal.querySelectorAll('.requirement');
    
    passwordInput.addEventListener('input', function() {
        validatePasswordStrength(this.value, strengthBar, strengthValue, requirements);
        validatePasswordMatch(passwordInput.value, confirmInput.value);
    });
    
    confirmInput.addEventListener('input', function() {
        validatePasswordMatch(passwordInput.value, this.value);
    });
    
    modal.querySelector('#changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateTeacherPassword(teacherData.id, new FormData(e.target));
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update teacher password function
async function updateTeacherPassword(teacherId, formData) {
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!validatePasswordRequirements(newPassword)) {
        showToast('Password does not meet requirements', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/account/users/${teacherId}/change-password/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
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

// Password strength validation
function validatePasswordStrength(password, strengthBar, strengthValue, requirements) {
    let strength = 0;
    const requirementsMet = {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
    };
    
    if (password.length >= 8) {
        strength += 20;
        requirementsMet.length = true;
    }
    
    if (/[A-Z]/.test(password)) {
        strength += 20;
        requirementsMet.uppercase = true;
    }
    
    if (/[a-z]/.test(password)) {
        strength += 20;
        requirementsMet.lowercase = true;
    }
    
    if (/[0-9]/.test(password)) {
        strength += 20;
        requirementsMet.number = true;
    }
    
    if (/[^A-Za-z0-9]/.test(password)) {
        strength += 20;
        requirementsMet.special = true;
    }
    
    strengthBar.style.width = `${strength}%`;
    
    if (strength < 40) {
        strengthBar.style.background = '#ef4444';
        strengthValue.textContent = 'Weak';
        strengthValue.style.color = '#ef4444';
    } else if (strength < 80) {
        strengthBar.style.background = '#f59e0b';
        strengthValue.textContent = 'Medium';
        strengthValue.style.color = '#f59e0b';
    } else {
        strengthBar.style.background = '#10b981';
        strengthValue.textContent = 'Strong';
        strengthValue.style.color = '#10b981';
    }
    
    // Update requirements list
    requirements.forEach(req => {
        const requirementType = req.getAttribute('data-requirement');
        if (requirementsMet[requirementType]) {
            req.classList.add('met');
        } else {
            req.classList.remove('met');
        }
    });
}

// Validate password match
function validatePasswordMatch(password, confirmPassword) {
    const confirmInput = document.querySelector('#confirmPassword');
    if (!confirmInput) return;
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#ef4444';
    } else if (confirmPassword) {
        confirmInput.style.borderColor = '#10b981';
    } else {
        confirmInput.style.borderColor = '';
    }
}

// Validate password meets all requirements
function validatePasswordRequirements(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[^A-Za-z0-9]/.test(password);
}


// Update event listeners for view and edit buttons
document.addEventListener('click', function(e) {
    if (e.target.closest('.view-btn')) {
        const btn = e.target.closest('.view-btn');
        const teacherId = btn.getAttribute('data-teacher-id');
        viewTeacher(teacherId);
    }
    
    if (e.target.closest('.edit-btn')) {
        const btn = e.target.closest('.edit-btn');
        const teacherId = btn.getAttribute('data-teacher-id');
        editTeacher(teacherId);
    }
    

    if (e.target.closest('.delete-btn')) {
        const btn = e.target.closest('.delete-btn');
        const teacherId = btn.getAttribute('data-teacher-id');
        const teacherName = btn.closest('.teacher-card').querySelector('.teacher-name').textContent;
        showDeleteConfirmation(teacherId, teacherName);
    }
    
    if (e.target.closest('.change-password-btn')) {
        const btn = e.target.closest('.change-password-btn');
        const teacherId = btn.getAttribute('data-teacher-id');
        changePassword(teacherId);
    }
    
    if (e.target.closest('.toggle-status-btn')) {
        const btn = e.target.closest('.toggle-status-btn');
        const teacherId = btn.getAttribute('data-teacher-id');
        const currentStatus = btn.getAttribute('data-current-status') === 'true';
        toggleUserStatus(teacherId, currentStatus);
    }
});


// Utility function to get CSRF token
function getCsrfToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

// Handle form submission for creating/editing teachers
document.addEventListener('DOMContentLoaded', function() {
    const teacherForm = document.getElementById('teacherForm');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const url = this.getAttribute('data-url');
            
            try {
                const response = await fetch(url, {
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
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(data.error || 'Failed to save teacher', 'error');
                }
            } catch (error) {
                console.error('Error saving teacher:', error);
                showToast('An error occurred while saving teacher', 'error');
            }
        });
    }
});

// Add this CSS for status indicators if not already present
const statusStyles = `
.teacher-status {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #10b981;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.teacher-status.inactive {
    background: #6b7280;
}

.teacher-status.on-leave {
    background: #f59e0b;
}
`;

// Inject status styles if not already in the document
if (!document.querySelector('#teacher-status-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'teacher-status-styles';
    styleSheet.textContent = statusStyles;
    document.head.appendChild(styleSheet);
}
