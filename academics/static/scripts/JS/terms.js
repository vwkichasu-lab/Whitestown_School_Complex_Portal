import showToast from "/static/scripts/JS/admin_d.js"

let currentPage = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeTermsPage();
});



function initializeTermsPage() {
    // Load initial data
    loadTerms();
    
    document.getElementById('academicYearFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('refreshBtn').addEventListener('click', loadTerms);
    
    initializeModals();
}

function initializeModals() {
    // Edit form submission
    document.getElementById('updateTermBtn').addEventListener('click', updateTerm);
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteTerm);
    
    document.getElementById('confirmSetCurrentBtn').addEventListener('click', confirmSetCurrentTerm);
}

async function loadTerms(page = 1) {
    const tableBody = document.getElementById('termsTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');
    
    tableBody.innerHTML = '';
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    paginationContainer.style.display = 'none';
    
    try {
        const params = new URLSearchParams({ page });

        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value !== "") params.append(key, value);
        });

        
        const response = await fetch(`/academics/api/terms/?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayTerms(data.terms);
            displayPagination(data.pagination);
            
            if (data.terms.length === 0) {
                emptyState.style.display = 'flex';
            }
        } else {
            throw new Error(data.error || 'Failed to load terms');
        }
    } catch (error) {
        console.error('Error loading terms:', error);
        showToast(error.message, 'error');
        emptyState.style.display = 'flex';
    } finally {
        loadingState.style.display = 'none';
    }
}

function displayTerms(terms) {
    const tableBody = document.getElementById('termsTableBody');
    
    if (terms.length === 0) {
        tableBody.innerHTML = '';
        return;
    }
    
    let html = '';
    
    terms.forEach(term => {
        const statusBadge = getStatusBadge(term);
        const duration = calculateDuration(term.start_date, term.end_date);
        const halfTerm = term.half_term_start_date ? `${formatDate(term.half_term_start_date)} - ${formatDate(term.half_term_end_date)}` : 'Not set';
        const vacation = term.vacation_start_date ? `${formatDate(term.vacation_start_date)}${term.vacation_end_date ? ` - ${formatDate(term.vacation_end_date)}` : ''}` : 'Not set';
        
        html += `
            <tr data-term-id="${term.id}">
                <td>
                    <div class="term-name">
                        <strong>${term.name}</strong>
                        ${term.is_current ? '<span class="badge current-badge">Current</span>' : ''}
                    </div>
                </td>
                <td>${formatDate(term.start_date)}</td>
                <td>${formatDate(term.end_date)}</td>
                <td>${duration}</td>
                <td>
                    <div class="calendar-details">
                        <div><strong>Half-term:</strong> ${halfTerm}</div>
                        <div><strong>Vacation:</strong> ${vacation}</div>
                        <div><strong>Holidays:</strong> ${term.holidays || 'None added'}</div>
                        <div><strong>Activities:</strong> ${term.school_activities || 'None added'}</div>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        ${!term.is_current ? `
                            <button class="btn btn-sm btn-outline set-current-btn" 
                                    data-term-id="${term.id}" 
                                    data-term-name="${term.name}"
                                    title="Set as Current">
                                <i class="bi bi-star"></i>
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-sm btn-outline edit-btn" 
                                data-term-id="${term.id}"
                                data-term-data='${JSON.stringify(term)}'
                                title="Edit Term">
                            <i class="bi bi-pencil"></i>
                        </button>
                        
                        <button class="btn btn-sm btn-outline-danger delete-btn" 
                                data-term-id="${term.id}"
                                data-term-name="${term.name}"
                                title="Delete Term">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    attachActionListeners();
}

function attachActionListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const termData = JSON.parse(this.getAttribute('data-term-data'));
            openEditModal(termData);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const termId = this.getAttribute('data-term-id');
            const termName = this.getAttribute('data-term-name');
            openDeleteModal(termId, termName);
        });
    });
    
    document.querySelectorAll('.set-current-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const termId = this.getAttribute('data-term-id');
            const termName = this.getAttribute('data-term-name');
            openSetCurrentModal(termId, termName);
        });
    });
}

const editTermModalEl = document.getElementById('editTermModal');
const editTermModal = new bootstrap.Modal(editTermModalEl);

function openEditModal(termData) {
    document.getElementById('editTermId').value = termData.id;
    document.getElementById('editName').value = termData.name;
    document.getElementById('editAcademicYear').value = termData.academic_year_id;
    document.getElementById('editStartDate').value = termData.start_date;
    document.getElementById('editEndDate').value = termData.end_date;
    document.getElementById('editIsCurrent').checked = termData.is_current;

    editTermModal.show();
}

document.getElementById("closeDeleteBtn").addEventListener("click", () => {
    editTermModal.hide();
});




function openDeleteModal(termId, termName) {
    document.getElementById('deleteConfirmMessage').textContent = 
        `Are you sure you want to delete "${termName}"? This action cannot be undone and may affect related records.`;
    
    document.getElementById('confirmDeleteBtn').setAttribute('data-term-id', termId);
    
    const modal = new bootstrap.Modal(document.getElementById('deleteTermModal'));
    modal.show();
}

function openSetCurrentModal(termId, termName) {
    document.getElementById('setCurrentConfirmMessage').textContent = 
        `Are you sure you want to set "${termName}" as the current term? This will unset any other current term.`;
    
    document.getElementById('confirmSetCurrentBtn').setAttribute('data-term-id', termId);
    
    const modal = new bootstrap.Modal(document.getElementById('setCurrentModal'));
    modal.show();
}

async function updateTerm() {
    const form = document.getElementById('editTermForm');
    const formData = new FormData(form);
    const updateBtn = document.getElementById('updateTermBtn');
    
    try {
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';
        
        const response = await fetch('/academics/api/terms/update/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': '{{ csrf_token }}',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editTermModal')).hide();
            loadTerms(currentPage);
        } else {
            throw new Error(data.error || 'Failed to update term');
        }
    } catch (error) {
        console.error('Error updating term:', error);
        showToast('Error updating term: ' + error.message, 'error');
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="bi bi-check-circle"></i> Update Term';
    }
}

async function confirmDeleteTerm() {
    const termId = this.getAttribute('data-term-id');
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    
    try {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
        
        const response = await fetch('/academics/api/terms/delete/', {
            method: 'POST',
            body: JSON.stringify({ term_id: termId }),
            headers: {
                'X-CSRFToken': '{{ csrf_token }}',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('deleteTermModal')).hide();
            loadTerms(currentPage);
        } else {
            throw new Error(data.error || 'Failed to delete term');
        }
    } catch (error) {
        console.error('Error deleting term:', error);
        showToast('Error deleting term: ' + error.message, 'error');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete Term';
    }
}

async function confirmSetCurrentTerm() {
    const termId = this.getAttribute('data-term-id');
    const setCurrentBtn = document.getElementById('confirmSetCurrentBtn');
    
    try {
        setCurrentBtn.disabled = true;
        setCurrentBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';
        
        const response = await fetch('/academics/api/terms/set-current/', {
            method: 'POST',
            body: JSON.stringify({ term_id: termId }),
            headers: {
                'X-CSRFToken': '{{ csrf_token }}',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('setCurrentModal')).hide();
            loadTerms(currentPage);
        } else {
            throw new Error(data.error || 'Failed to set current term');
        }
    } catch (error) {
        console.error('Error setting current term:', error);
        showToast('Error setting current term: ' + error.message, 'error');
    } finally {
        setCurrentBtn.disabled = false;
        setCurrentBtn.innerHTML = '<i class="bi bi-check-circle"></i> Set as Current';
    }
}

function applyFilters() {
    const academicYear = document.getElementById('academicYearFilter').value;
    const status = document.getElementById('statusFilter').value;
    const search = document.getElementById('searchInput').value;

    currentFilters = {};

    if (academicYear) currentFilters.academic_year = academicYear;
    if (status) currentFilters.status = status;
    if (search) currentFilters.search = search;

    currentPage = 1;
    loadTerms(currentPage);
}


function displayPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    
    if (!pagination || pagination.total_pages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    let html = `
        <div class="pagination">
            <button class="pagination-btn ${pagination.current_page === 1 ? 'disabled' : ''}" 
                    ${pagination.current_page === 1 ? 'disabled' : ''}
                    onclick="loadTerms(${pagination.current_page - 1})">
                <i class="bi bi-chevron-left"></i> Previous
            </button>
            
            <div class="pagination-pages">
    `;
    
    for (let i = 1; i <= pagination.total_pages; i++) {
        if (i === pagination.current_page) {
            html += `<span class="pagination-page active">${i}</span>`;
        } else if (i <= 2 || i >= pagination.total_pages - 1 || Math.abs(i - pagination.current_page) <= 1) {
            html += `<button class="pagination-page" onclick="loadTerms(${i})">${i}</button>`;
        } else if (i === 3 && pagination.current_page > 4) {
            html += `<span class="pagination-ellipsis">...</span>`;
        } else if (i === pagination.total_pages - 2 && pagination.current_page < pagination.total_pages - 3) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    html += `
            </div>
            
            <button class="pagination-btn ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}" 
                    ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}
                    onclick="loadTerms(${pagination.current_page + 1})">
                Next <i class="bi bi-chevron-right"></i>
            </button>
        </div>
        
        <div class="pagination-info">
            Showing ${pagination.start_index}-${pagination.end_index} of ${pagination.total_count} terms
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'flex';
}

// Utility functions
function getStatusBadge(term) {
    const today = new Date().toISOString().split('T')[0];
    
    if (term.is_current) {
        return '<span class="badge badge-success">Current</span>';
    } else if (term.start_date > today) {
        return '<span class="badge badge-info">Upcoming</span>';
    } else if (term.end_date < today) {
        return '<span class="badge badge-secondary">Past</span>';
    } else {
        return '<span class="badge badge-primary">Active</span>';
    }
}

function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
