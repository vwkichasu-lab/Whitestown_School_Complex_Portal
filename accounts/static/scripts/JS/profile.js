import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"

document.addEventListener('DOMContentLoaded', function() {
    let profileData = {};
    
    // Tab functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });
    
    // Load profile data
    async function loadProfileData() {
        try {
            const response = await fetch('/account/api/profile/');
            const data = await response.json();

            console.log(data)
            
            if (data.success) {
                profileData = data.data;
                console.log(profileData)
                populateProfileData();
            } else {
                showToast('Error loading profile data', 'error');
            }
        } catch (error) {
            showToast('Error loading profile data', 'error');
        }
    }
    
    // Populate profile data in forms
    function populateProfileData() {
        document.getElementById('profileName').textContent = `${profileData.first_name} ${profileData.last_name}`;
        document.getElementById('profileRole').textContent = profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1);
        
        // Set profile ID based on role
        const profileId = document.getElementById('profileId');
        if (profileData.role === 'teacher') {
            profileId.textContent = profileData.employee_id || profileData.username;
        } else if (profileData.role === 'student') {
            profileId.textContent = profileData.student_id || profileData.username;
        } else if (profileData.role === 'admin') {
            profileId.textContent = profileData.employee_id || profileData.username;
        } else {
            profileId.textContent = profileData.username;
        }
        
        const avatar = document.getElementById('profileAvatar');
        avatar.textContent = (profileData.first_name[0] + profileData.last_name[0]).toUpperCase();
        
        document.querySelector('input[name="first_name"]').value = profileData.first_name || '';
        document.querySelector('input[name="last_name"]').value = profileData.last_name || '';
        document.querySelector('input[name="email"]').value = profileData.email || '';
        document.querySelector('input[name="phone_number"]').value = profileData.phone_number || '';
        document.querySelector('input[name="date_of_birth"]').value = profileData.date_of_birth || '';
        document.querySelector('select[name="gender"]').value = profileData.gender || '';

        if (profileData.role === 'student') {
            const emailField = document.querySelector('input[name="email"]').closest('.form-group');
            const phoneField = document.querySelector('input[name="phone_number"]').closest('.form-group');
            
            if (emailField) emailField.style.display = 'none';
            if (phoneField) phoneField.style.display = 'none';
        }
        
        // Profile details
        populateProfileDetails();
    }
    
    // Populate role-specific profile details
    function populateProfileDetails() {
        const container = document.getElementById('profileDetails');
        let html = '';
        
        if (profileData.role === 'teacher') {
            html = `
                <div class="form-section">
                    <h5>Teacher Information</h5>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Employee ID</label>
                            <div class="readonly-field">${profileData.employee_id || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Employment Type</label>
                            <div class="readonly-field">${profileData.employment_type || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Class Teacher</label>
                            <div class="readonly-field">${profileData.is_class_teacher ? 'Yes' : 'No'}</div>
                        </div>
                        ${profileData.is_class_teacher ? `
                        <div class="form-group">
                            <label class="form-label">Class Teacher Of</label>
                            <div class="readonly-field">${profileData.class_teacher_name || 'N/A'}</div>
                        </div>
                        ` : ''}
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <div class="readonly-field">${profileData.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                    </div>
                </div>
                <div class="form-section">
                    <h5>Subjects</h5>
                    <div class="readonly-field">
                        ${profileData.subjects && profileData.subjects.length > 0 
                            ? profileData.subjects.map(subject => `${subject.name} (${subject.code})`).join(', ')
                            : 'No subjects assigned'}
                    </div>
                </div>
                ${profileData.notes ? `
                <div class="form-section">
                    <h5>Notes</h5>
                    <div class="readonly-field">${profileData.notes}</div>
                </div>
                ` : ''}
            `;
        } else if (profileData.role === 'student') {
            html = `
                <div class="form-section">
                    <h5>Student Information</h5>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Student ID</label>
                            <div class="readonly-field">${profileData.student_id || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Current Class</label>
                            <div class="readonly-field">${profileData.current_class_name || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Academic Year</label>
                            <div class="readonly-field">${profileData.academic_year || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <div class="readonly-field">${profileData.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                    </div>
                </div>
                <div class="form-section">
                    <h5>Parent/Guardian Information</h5>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Parent Full Name</label>
                            <div class="readonly-field">${profileData.parent_full_name || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parent Phone</label>
                            <div class="readonly-field">${profileData.parent_phone || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parent Email</label>
                            <div class="readonly-field">${profileData.parent_email || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Emergency Contact Relation</label>
                            <div class="readonly-field">${profileData.emergency_contact_relation || 'N/A'}</div>
                        </div>
                        ${profileData.parent_address ? `
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">Parent Address</label>
                            <div class="readonly-field">${profileData.parent_address}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ${profileData.notes ? `
                <div class="form-section">
                    <h5>Notes</h5>
                    <div class="readonly-field">${profileData.notes}</div>
                </div>
                ` : ''}
            `;
        } else if (profileData.role === 'admin') {
            html = `
                <div class="form-section">
                    <h5>Staff Information</h5>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Employee ID</label>
                            <div class="readonly-field">${profileData.employee_id || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Department</label>
                            <div class="readonly-field">${profileData.department || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Position</label>
                            <div class="readonly-field">${profileData.position || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html = `<div class="text-center py-4"><p>No profile details available.</p></div>`;
        }
        
        container.innerHTML = html;
    }
    
    // Update personal information
    document.getElementById('personalForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/account/api/profile/update/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Profile updated successfully', 'success');
                loadProfileData();
            } else {
                showToast(result.error, 'error');
            }
        } catch (error) {
            console.log(error)
            showToast('Error updating profile', 'error');
        }
    });
    
    // Change password
    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        if (data.new_password !== data.confirm_password) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch('/account/api/profile/change-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Password changed successfully', 'success');
                this.reset();
            } else {
                showToast(result.error, 'error');
            }
        } catch (error) {
            showToast('Error changing password', 'error');
        }
    });
    
    // Password strength indicator
    document.getElementById('newPassword').addEventListener('input', function() {
        const password = this.value;
        const strength = checkPasswordStrength(password);
        const strengthElement = document.getElementById('passwordStrength');
        
        strengthElement.textContent = strength.text;
        strengthElement.className = `password-strength strength-${strength.level}`;
    });
    
    function checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/\d/)) strength++;
        if (password.match(/[^a-zA-Z\d]/)) strength++;
        
        const levels = ['weak', 'fair', 'good', 'strong'];
        const texts = ['Weak', 'Fair', 'Good', 'Strong'];
        
        return {
            level: levels[strength] || 'weak',
            text: texts[strength] || 'Weak'
        };
    }
    
    // Initialize
    loadProfileData();
});