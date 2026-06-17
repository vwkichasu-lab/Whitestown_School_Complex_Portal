class StudentsManager {
    constructor() {
        this.modal = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createModal();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="resultsModalTitle">Student Results</h3>
                    <button type="button" class="modal-close">&times;</button>
                </div>
                <div class="modal-body" id="resultsModalBody">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <span>Loading results...</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="modalCloseBtn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Add event listeners for modal
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        this.modal.querySelector('#modalCloseBtn').addEventListener('click', () => this.hideModal());
        
        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.hideModal();
            }
        });
    }

    setupEventListeners() {
        // View student results
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-results')) {
                const button = e.target.closest('.view-results');
                const studentId = button.dataset.studentId;
                const studentName = button.dataset.studentName;
                this.viewStudentResults(studentId, studentName);
            }
        });

        // Export students list
        const exportBtn = document.getElementById('exportStudents');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportStudents());
        }
    }

    async viewStudentResults(studentId, studentName) {
        const modalTitle = document.getElementById('resultsModalTitle');
        const modalBody = document.getElementById('resultsModalBody');

        modalTitle.textContent = `Results - ${studentName}`;
        modalBody.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Loading results...</span>
            </div>
        `;

        this.showModal();

        try {
            const response = await fetch(`/account/api/student/${studentId}/results/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderStudentResults(modalBody, data.results);
            } else {
                throw new Error(data.error || 'Failed to load results');
            }
        } catch (error) {
            console.error('Error loading results:', error);
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h4>Error Loading Results</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="studentsManager.viewStudentResults('${studentId}', '${studentName}')">
                        <i class="bi bi-arrow-clockwise"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    renderStudentResults(container, results) {
        console.log(results)
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state small">
                    <i class="bi bi-journal-x"></i>
                    <h4>No Results Found</h4>
                    <p>No results found for this student</p>
                </div>
            `;
            return;
        }
        
        const averageScore = (results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(1);

        const html = `
            <div class="results-summary">
                <div class="summary-item">
                    <span class="summary-label">Total Results:</span>
                    <span class="summary-value">${results.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Average Score:</span>
                    <span class="summary-value">${averageScore}%</span>
                </div>
            </div>
            
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Score</th>
                            <th>Grade</th>
                            <th>Term</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => `
                            <tr>
                                <td class="subject-cell">
                                    <div class="subject-info">
                                        <strong>${this.escapeHtml(result.subject_name)}</strong>
                                        <span class="subject-code">${this.escapeHtml(result.subject_code)}</span>
                                    </div>
                                </td>
                                <td class="score-cell">
                                    <span class="score-value">${result.score}</span>%
                                </td>
                                <td class="grade-cell">
                                    <span class="grade-badge grade-${result.grade.toLowerCase()}">${result.grade}</span>
                                </td>
                                <td class="term-cell">
                                    ${this.escapeHtml(result.term_name)} ${this.escapeHtml(result.academic_year)}
                                </td>
                                <td class="date-cell">
                                    ${new Date(result.date_uploaded).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    showModal() {
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    exportStudents() {
        const students = [];
        document.querySelectorAll('.student-card').forEach(card => {
            const name = card.querySelector('h3').textContent.trim();
            const studentId = card.querySelector('.student-id').textContent.trim();
            const className = card.querySelector('.detail-item span').textContent.trim();
            students.push({ name, studentId, className });
        });

        if (students.length === 0) {
            this.showNotification('No students to export', 'warning');
            return;
        }

        const csvContent = [
            ['Name', 'Student ID', 'Class'],
            ...students.map(s => [s.name, s.studentId, s.className])
        ].map(row => 
            row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Students list exported successfully', 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `custom-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Add close event
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
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
    window.studentsManager = new StudentsManager();
});