import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"
import hideLoader from "/static/scripts/JS/admin_d.js"
import showLoader from "/static/scripts/JS/admin_d.js"

// Main toggle function - uses two separate buttons
async function toggleAdminStatus(adminId) {
    const activateBtn = document.getElementById(`activateBtn-${adminId}`);
    const deactivateBtn = document.getElementById(`deactivateBtn-${adminId}`);

    // Determine current status based on which button is visible
    const isCurrentlyActive = !deactivateBtn.classList.contains('d-none');
    
    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    const message = isCurrentlyActive ? 
        'Are you sure you want to deactivate this admin? They will lose access to the system immediately.' : 
        'Are you sure you want to activate this admin? They will be able to access the system immediately.';
    
    if (!confirm(message)) {
        return;
    }
    
    const activeButton = isCurrentlyActive ? deactivateBtn : activateBtn;
    const originalText = activeButton.innerHTML;
    
    try {
        activeButton.innerHTML = '<span class="loading-spinner"></span> Processing...';
        activeButton.disabled = true;
        
        const response = await fetch(`/account/admin/${adminId}/toggle-status/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            location.reload()
            const newIsActive = action === 'activate';
            updateAdminStatusUI(adminId, newIsActive);
        } else {
            showToast(data.error || `Failed to ${action} admin`, 'error');
            activeButton.innerHTML = originalText;
            activeButton.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(`An error occurred while ${action}ing admin`, 'error');
        activeButton.innerHTML = originalText;
        activeButton.disabled = false;
    }
}

// Update UI without page reload
function updateAdminStatusUI(adminId, isActive) {
    const activateBtn = document.getElementById(`activateBtn-${adminId}`);
    const deactivateBtn = document.getElementById(`deactivateBtn-${adminId}`);
    const statusBadge = document.querySelector(`[data-admin-id="${adminId}"] .status-badge`);
    
    if (isActive) {
        // Switch to deactivate button
        activateBtn.classList.add('d-none');
        deactivateBtn.classList.remove('d-none');
        deactivateBtn.disabled = false;
        deactivateBtn.innerHTML = '<i class="bi bi-person-dash"></i> Deactivate';
    } else {
        // Switch to activate button
        deactivateBtn.classList.add('d-none');
        activateBtn.classList.remove('d-none');
        activateBtn.disabled = false;
        activateBtn.innerHTML = '<i class="bi bi-person-check"></i> Activate';
    }
    
    // Update status badge if it exists
    if (statusBadge) {
        if (isActive) {
            statusBadge.className = 'status-badge active';
            statusBadge.innerHTML = '<i class="bi bi-check-circle"></i> Active';
        } else {
            statusBadge.className = 'status-badge inactive';
            statusBadge.innerHTML = '<i class="bi bi-x-circle"></i> Inactive';
        }
    }
}


async function bulkUpdateAdminStatus(adminIds, action) {
    if (!adminIds || adminIds.length === 0) {
        showToast('Please select at least one admin', 'warning');
        return;
    }
    
    const message = action === 'activate' ? 
        `Are you sure you want to activate ${adminIds.length} admin(s)?` : 
        `Are you sure you want to deactivate ${adminIds.length} admin(s)?`;
    
    if (!confirm(message)) {
        return;
    }
    
    const bulkBtn = document.getElementById('bulkActionBtn');
    const originalText = bulkBtn.innerHTML;
    
    try {
        bulkBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        bulkBtn.disabled = true;
        
        const formData = new FormData();
        adminIds.forEach(id => formData.append('admin_ids', id));
        formData.append('action', action);
        
        const response = await fetch('/account/admin/bulk-status/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            body: formData,
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.error || `Failed to ${action} admins`, 'error');
            bulkBtn.innerHTML = originalText;
            bulkBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(`An error occurred while ${action}ing admins`, 'error');
        bulkBtn.innerHTML = originalText;
        bulkBtn.disabled = false;
    }
}

async function getAdminData(studentId) {
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


async function changePassword(studentId) {
    try {
        // Show loader
        showLoader();
        
        const AdminData = await getAdminData(studentId);
        
        if (AdminData) {
            // Hide loader and show change password modal
            hideLoader();
            showChangePasswordModal(AdminData);
        } else {
            hideLoader();
        }
    } catch (error) {
        hideLoader();
        console.error('Error loading student data for password change:', error);
        showToast('An error occurred while loading student data', 'error');
    }
}


function showChangePasswordModal(adminData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🔑 Change Password</h2>
                <button class="modal-close close-modal">✕</button>
            </div>
            <form id="changePasswordForm" data-student-id="${adminData.id}">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Admin</label>
                        <div class="student-info">
                            <div class="student-avatar-small">
                                ${adminData.first_name?.charAt(0)}${adminData.last_name?.charAt(0)}
                            </div>
                            <div class="student-details">
                                <div class="student-name">${adminData.first_name} ${adminData.last_name}</div>
                                <div class="student-email">${adminData.email}</div>
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
        await updateAdminPassword(adminData.id, new FormData(e.target));
    });
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function updateAdminPassword(studentId, formData) {
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/account/users/${studentId}/change-password/`, {
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



// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.toggle-admin-status')) {
            const btn = e.target.closest('.toggle-admin-status');
            const adminId = btn.getAttribute('data-admin-id');
            toggleAdminStatus(adminId);
        }

        if (e.target.closest('.change-password-btn')) {
            const btn = e.target.closest('.change-password-btn');
            const adminId = btn.getAttribute('data-admin-id');
            changePassword(adminId);
        }
    });
    
});