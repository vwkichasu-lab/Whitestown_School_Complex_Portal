import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"

document.addEventListener('DOMContentLoaded', function() {
    const createAdminForm = document.getElementById('createAdminForm');
    
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            if (!validateForm()) {
                return showToast("Please fill in the neccessary details", "error");
            }
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating Admin...';
                submitBtn.disabled = true;
                
                const response = await fetch('/account/create-admin/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                    },
                });

                const data = await response.json();

                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => {
                        window.location.reload()
                    }, 1500);
                } else {
                    if (data.errors) {
                        displayFormErrors(data.errors);
                    } else {
                        showToast(data.error || 'Failed to create admin staff', 'error');
                    }
                }
            } catch (error) {
                console.error('Error creating admin:', error);
                showToast('An error occurred while creating admin staff', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
        
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm_password');
        
        if (passwordInput && confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', validatePasswordMatch);
            passwordInput.addEventListener('input', validatePasswordMatch);
        }
        
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('blur', checkUsernameAvailability);
        }
        
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', checkEmailAvailability);
        }
    }
});

// Form validation
function validateForm() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    // Clear previous errors
    clearFormErrors();
    
    let isValid = true;
    
    // Check required fields
    const requiredFields = document.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        }
    });
    
    // Password validation
    if (password.length < 8) {
        showFieldError(document.getElementById('password'), 'Password must be at least 8 characters long');
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        showFieldError(document.getElementById('confirm_password'), 'Passwords do not match');
        isValid = false;
    }
    
    // Email validation
    const email = document.getElementById('email').value;
    if (email && !isValidEmail(email)) {
        showFieldError(document.getElementById('email'), 'Please enter a valid email address');
        isValid = false;
    }
    
    return isValid;
}

// Password match validation
function validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const confirmPasswordField = document.getElementById('confirm_password');
    
    if (confirmPassword && password !== confirmPassword) {
        showFieldError(confirmPasswordField, 'Passwords do not match');
    } else {
        clearFieldError(confirmPasswordField);
    }
}

// Check username availability
async function checkUsernameAvailability() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) return;
    
    try {
        const response = await fetch(`/account/check-username/?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        if (!data.available) {
            showFieldError(usernameInput, 'Username is already taken');
        } else {
            clearFieldError(usernameInput);
        }
    } catch (error) {
        console.error('Error checking username:', error);
    }
}

async function checkEmailAvailability() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (!email) return;
    
    try {
        const response = await fetch(`/account/check-email/?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (!data.available) {
            showFieldError(emailInput, 'Email is already registered');
        } else {
            clearFieldError(emailInput);
        }
    } catch (error) {
        console.error('Error checking email:', error);
    }
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFieldError(field, message) {
    field.classList.add('is-invalid');
    
    let errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (errorElement) {
        errorElement.remove();
    }
}

function clearFormErrors() {
    const errorElements = document.querySelectorAll('.invalid-feedback');
    errorElements.forEach(element => element.remove());
    
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => field.classList.remove('is-invalid'));
}

function displayFormErrors(errors) {
    clearFormErrors();
    
    Object.keys(errors).forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            showFieldError(field, errors[fieldName].join(', '));
        }
    });
}