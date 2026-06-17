import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"


document.addEventListener('DOMContentLoaded', function() {
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = '';
}

let currentAction = '';
let currentYearId = '';
let currentYearName = '';

document.querySelectorAll('.edit-year').forEach(btn => {
    btn.addEventListener('click', function() {
        const yearId = this.getAttribute('data-year-id');
        const yearName = this.getAttribute('data-year-name');
        const startDate = this.getAttribute('data-start-date');
        const endDate = this.getAttribute('data-end-date');
        
        document.getElementById('editYearId').value = yearId;
        document.getElementById('editYearName').value = yearName;
        document.getElementById('editStartDate').value = startDate;
        document.getElementById('editEndDate').value = endDate;
        
        showModal('editYearModal');
    });
});

document.getElementById('saveYearChanges').addEventListener('click', async function() {
    const yearId = document.getElementById('editYearId').value;
    const yearName = document.getElementById('editYearName').value;
    const startDate = document.getElementById('editStartDate').value;
    const endDate = document.getElementById('editEndDate').value;

    if (new Date(startDate) >= new Date(endDate)) {
        showToast('End date must be after start date', 'error');
        return;
    }

    const saveBtn = this;
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    try {
        const response = await fetch(`/academics/academic-years/${yearId}/edit/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                name: yearName,
                start_date: startDate,
                end_date: endDate
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Academic year updated successfully', 'success');
            hideModal('editYearModal');
            const row = document.querySelector(`tr[data-year-id="${yearId}"]`);
            if (row) {
                row.querySelector('.year-name').textContent = data.academic_year.name;
                row.querySelector('.start-date').textContent = data.academic_year.start_date;
                row.querySelector('.end-date').textContent = data.academic_year.end_date;
            }
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Error updating academic year', 'error');
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
    }
});

// Set current academic year
document.querySelectorAll('.set-current').forEach(btn => {
    btn.addEventListener('click', function() {
        currentYearId = this.getAttribute('data-year-id');
        currentYearName = this.getAttribute('data-year-name');
        currentAction = 'set-current';
        
        document.getElementById('confirmModalTitle').textContent = 'Set Current Academic Year';
        document.getElementById('confirmModalBody').innerHTML = `
            <p>Are you sure you want to set <strong>${currentYearName}</strong> as the current academic year?</p>
            <p class="text-warning">This will update all related records and cannot be undone.</p>
        `;
        showModal('confirmModal');
    });
});

// Delete academic year
document.querySelectorAll('.delete-year').forEach(btn => {
    btn.addEventListener('click', function() {
        currentYearId = this.getAttribute('data-year-id');
        currentYearName = this.getAttribute('data-year-name');
        currentAction = 'delete';
        
        document.getElementById('confirmModalTitle').textContent = 'Delete Academic Year';
        document.getElementById('confirmModalBody').innerHTML = `
            <p>Are you sure you want to delete <strong>${currentYearName}</strong>?</p>
            <p class="text-danger">This action cannot be undone and will remove all associated data.</p>
        `;
        showModal('confirmModal');
    });
});

// Confirm action
document.getElementById('confirmAction').addEventListener('click', async function() {
    const confirmBtn = this;
    confirmBtn.classList.add('loading');
    confirmBtn.disabled = true;

    let url = '';
    let method = '';

    if (currentAction === 'set-current') {
        url = `/academics/academic-years/${currentYearId}/set-current/`;
        method = 'POST';
    } else if (currentAction === 'delete') {
        url = `/academics/academic-years/${currentYearId}/delete/`;
        method = 'DELETE';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            hideModal('confirmModal');
            // Reload the page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast(data.error, 'error');
            confirmBtn.classList.remove('loading');
            confirmBtn.disabled = false;
        }
    } catch (error) {
        showToast('Error performing action', 'error');
        confirmBtn.classList.remove('loading');
        confirmBtn.disabled = false;
    }
});

// Close modals when clicking close buttons
document.querySelectorAll('.btn-close, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', function() {
        hideModal('editYearModal');
        hideModal('confirmModal');
    });
});

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            hideModal(this.id);
        }
    });
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideModal('editYearModal');
        hideModal('confirmModal');
    }
});

});