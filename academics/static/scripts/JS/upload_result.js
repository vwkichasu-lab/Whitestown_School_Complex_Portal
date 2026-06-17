import showToast from "/static/scripts/JS/admin_d.js"
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js"

// Store results data
let resultsData = {};
let currentStudents = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeUploadForm();
});

function initializeUploadForm() {
    const academicYearSelect = document.getElementById('academicYearSelect');
    const termSelect = document.getElementById('termSelect');
    const classLevelSelect = document.getElementById('classLevelSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const loadStudentsBtn = document.getElementById('loadStudentsBtn');
    const calculationModeRadios = document.querySelectorAll('input[name="calculation_mode"]');

    academicYearSelect.addEventListener('change', function() {
        const academicYearId = this.value;
        loadTerms(academicYearId);
    });

    [classLevelSelect, subjectSelect].forEach(select => {
        select.addEventListener('change', validateForm);
    });

    loadStudentsBtn.addEventListener('click', loadStudents);

    calculationModeRadios.forEach(radio => {
        radio.addEventListener('change', toggleCalculationMode);
    });

    initializeModalEvents();

    document.getElementById('uploadResultsForm').addEventListener('submit', handleFormSubmit);
}

function initializeModalEvents() {
    document.getElementById('saveStudentResultBtn').addEventListener('click', saveStudentResult);
    
    document.getElementById('modalClassScore').addEventListener('input', validateScoreInput);
    document.getElementById('modalExamScore').addEventListener('input', validateScoreInput);
    document.getElementById('modalManualScore').addEventListener('input', validateScoreInput);
    
    document.getElementById('studentResultModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideStudentModal();
        }
    });
}

document.querySelector(".cls_stu_m").addEventListener("click", () => {
    hideStudentModal()
})

function validateScoreInput(e) {
    const value = parseFloat(e.target.value);
    if (value < 0 || value > 100) {
        e.target.setCustomValidity('Score must be between 0 and 100');
    } else {
        e.target.setCustomValidity('');
    }
}

async function loadTerms(academicYearId) {
    const termSelect = document.getElementById('termSelect');

    if (!academicYearId) {
        termSelect.innerHTML = '<option value="">Select an academic year first</option>';
        return;
    }

    try {
        const response = await fetch(`/academics/api/terms/?academic_year=${academicYearId}`);
        const data = await response.json();

        termSelect.innerHTML = '<option value="">Select Term</option>';

        if (!data.success || !data.terms || data.terms.length === 0) {
            termSelect.innerHTML = '<option value="">No terms found for this academic year</option>';
            return;
        }

        data.terms.forEach(term => {
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = `${term.name} (${term.start_date} - ${term.end_date})`;
            termSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading terms:', error);
        termSelect.innerHTML = '<option value="">Error loading terms</option>';
        showToast('Error loading terms', 'error');
    }
}

function validateForm() {
    const classLevelSelect = document.getElementById('classLevelSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const termSelect = document.getElementById('termSelect');
    const academicYearSelect = document.getElementById('academicYearSelect');
    const loadStudentsBtn = document.getElementById('loadStudentsBtn');

    const isFormValid = classLevelSelect.value && subjectSelect.value && termSelect.value && academicYearSelect.value;
    
    loadStudentsBtn.disabled = !isFormValid;
    return isFormValid;
}

function toggleCalculationMode() {
    const calculationMode = document.querySelector('input[name="calculation_mode"]:checked').value;
    
    if (calculationMode === 'system') {
        document.getElementById('systemScoreInputs').style.display = 'block';
        document.getElementById('manualScoreInputs').style.display = 'none';
    } else {
        document.getElementById('systemScoreInputs').style.display = 'none';
        document.getElementById('manualScoreInputs').style.display = 'block';
    }
}

async function loadStudents() {
    if (!validateForm()) {
        showToast('Please fill all required fields', 'warning');
        return;
    }

    const classLevelId = document.getElementById('classLevelSelect').value;
    const academicYearId = document.getElementById('academicYearSelect').value;
    const studentsContainer = document.getElementById('studentsContainer');
    const loadStudentsBtn = document.getElementById('loadStudentsBtn');

    try {
        loadStudentsBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';
        loadStudentsBtn.disabled = true;

        const response = await fetch(`/academics/api/results/students/?class_level_id=${classLevelId}&academic_year_id=${academicYearId}`);
        const data = await response.json();

        if (data.success) {
            currentStudents = data.students;
            displayStudents(data.students);
            loadExistingResults();
        } else {
            showToast(data.error || 'Error loading students', 'error');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students', 'error');
    } finally {
        loadStudentsBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Load Students';
        loadStudentsBtn.disabled = false;
    }
}

function displayStudents(students) {
    const studentsContainer = document.getElementById('studentsContainer');
    const submitBtn = document.getElementById('submitBtn');

    if (students.length === 0) {
        studentsContainer.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-people"></i>
                <h4>No Students Found</h4>
                <p>No active students found in the selected class</p>
            </div>
        `;
        submitBtn.disabled = true;
        return;
    }

    let html = `
        <div class="students-list">
            <div class="students-header">
                <div class="student-info">Student Information</div>
                <div class="student-status">Result Status</div>
                <div class="student-actions">Actions</div>
            </div>
    `;

    students.forEach(student => {
        const hasResult = resultsData[student.id];
        const statusClass = hasResult ? 'status-completed' : 'status-pending';
        const statusText = hasResult ? 'Result Entered' : 'Pending';
        
        html += `
            <div class="student-item" data-student-id="${student.id}">
                <div class="student-info">
                    <div class="student-avatar">
                        <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="student-details">
                        <div class="student-name">${student.first_name} ${student.last_name}</div>
                        <div class="student-id">${student.student_profile__student_id || student.username}</div>
                    </div>
                </div>
                <div class="student-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    ${hasResult ? `<div class="score-preview">Class: ${resultsData[student.id].class_score || 'N/A'}, Exam: ${resultsData[student.id].exam_score || 'N/A'}</div>` : ''}
                </div>
                <div class="student-actions">
                    <button type="button" class="btn btn-sm btn-primary enter-result-btn" data-student-id="${student.id}">
                        <i class="bi bi-pencil-square"></i> ${hasResult ? 'Edit Result' : 'Enter Result'}
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    studentsContainer.innerHTML = html;
    submitBtn.disabled = false;

    attachStudentEventListeners();
}

function attachStudentEventListeners() {
    document.querySelectorAll('.enter-result-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.getAttribute('data-student-id');
            openStudentModal(studentId);
        });
    });

    document.querySelectorAll('.student-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.student-actions')) {
                const studentId = this.getAttribute('data-student-id');
                openStudentModal(studentId);
            }
        });
    });
}

function openStudentModal(studentId) {
    const student = currentStudents.find(s => s.id == studentId);
    if (!student) return;

    document.getElementById('modalStudentName').textContent = `Enter Results for ${student.first_name} ${student.last_name}`;
    document.getElementById('modalStudentId').value = studentId;
    document.getElementById('modalStudentIdDisplay').textContent = student.student_profile__student_id || student.username;
    
    const classLevelName = document.getElementById('classLevelSelect').options[document.getElementById('classLevelSelect').selectedIndex].text;
    document.getElementById('modalStudentClass').textContent = classLevelName;

    const existingResult = resultsData[studentId];
    if (existingResult) {
        document.getElementById('modalClassScore').value = existingResult.class_score ?? '';
        document.getElementById('modalExamScore').value = existingResult.exam_score ?? '';
        document.getElementById('modalManualScore').value = existingResult.score ?? '';
        document.getElementById('modalRemarks').value = existingResult.remarks ?? '';

        const calcMode = existingResult.calculation_mode || 'system';
        document.querySelector(`input[name="calculation_mode"][value="${calcMode}"]`).checked = true;

        toggleCalculationMode();
    } else {
        document.getElementById('studentResultForm').reset();
        document.querySelector(`input[name="calculation_mode"][value="system"]`).checked = true;
        toggleCalculationMode();
    }

    document.getElementById('studentResultModal').style.display = 'flex';
    
    setTimeout(() => {
        const firstInput = document.querySelector('#studentResultForm input:not([type="hidden"]):not([type="radio"])');
        if (firstInput) firstInput.focus();
    }, 100);
}

function hideStudentModal() {
    document.getElementById('studentResultModal').style.display = 'none';
}

async function saveStudentResult() {
    const studentId = document.getElementById('modalStudentId').value;
    const calculationMode = document.querySelector('input[name="calculation_mode"]:checked').value;
    
    const formData = new FormData();
    formData.append('student', studentId);
    formData.append('class_level', document.getElementById('classLevelSelect').value);
    formData.append('subject', document.getElementById('subjectSelect').value);
    formData.append('term', document.getElementById('termSelect').value);
    formData.append('academic_year', document.getElementById('academicYearSelect').value);
    formData.append('calculation_mode', calculationMode);
    formData.append('remarks', document.getElementById('modalRemarks').value);
    
    if (document.getElementById('isPublished').checked) {
        formData.append('is_published', 'on');
    }

    if (calculationMode === 'system') {
        const classScore = document.getElementById('modalClassScore').value;
        const examScore = document.getElementById('modalExamScore').value;
        
        if (!classScore || !examScore) {
            showToast('Please enter both class score and exam score', 'error');
            return;
        }
        
        const classScoreVal = parseFloat(classScore);
        const examScoreVal = parseFloat(examScore);
        
        if (classScoreVal < 0 || classScoreVal > 100 || examScoreVal < 0 || examScoreVal > 100) {
            showToast('Scores must be between 0 and 100', 'error');
            return;
        }
        
        formData.append('class_score', classScoreVal);
        formData.append('exam_score', examScoreVal);
    } else {
        const manualScore = document.getElementById('modalManualScore').value;
        const classScore = document.getElementById('modalClassScore').value;
        const examScore = document.getElementById('modalExamScore').value;
        
        if (!manualScore) {
            showToast('Please enter total score', 'error');
            return;
        }
        
        const manualScoreVal = parseFloat(manualScore);
        const classScoreVal = parseFloat(classScore || 0);
        const examScoreVal = parseFloat(examScore || 0);
        
        if (manualScoreVal < 0 || manualScoreVal > 100) {
            showToast('Total score must be between 0 and 100', 'error');
            return;
        }
        
        formData.append('score', manualScoreVal);
        formData.append('class_score', classScoreVal);
        formData.append('exam_score', examScoreVal);
    }

    try {
        const saveBtn = document.getElementById('saveStudentResultBtn');
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        saveBtn.disabled = true;

        const response = await fetch('/academics/results/upload/result/new/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Result saved successfully', 'success');
            hideStudentModal();
            
            // Update the resultsData and UI
            resultsData[studentId] = {
                calculation_mode: calculationMode,
                class_score: document.getElementById('modalClassScore').value,
                exam_score: document.getElementById('modalExamScore').value,
                score: document.getElementById('modalManualScore').value,
                remarks: document.getElementById('modalRemarks').value
            };
            
            updateStudentStatus(studentId);
        } else {
            showToast(data.error || 'Error saving result', 'error');
        }
    } catch (error) {
        console.error('Error saving result:', error);
        showToast('Error saving result', 'error');
    } finally {
        const saveBtn = document.getElementById('saveStudentResultBtn');
        saveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Save Results';
        saveBtn.disabled = false;
    }
}

function updateStudentStatus(studentId) {
    const studentItem = document.querySelector(`.student-item[data-student-id="${studentId}"]`);
    if (!studentItem) return;

    const statusElement = studentItem.querySelector('.student-status');
    const result = resultsData[studentId];
    
    if (result) {
        const scoreDisplay = result.calculation_mode === 'system' 
            ? `Class: ${result.class_score || 'N/A'}, Exam: ${result.exam_score || 'N/A'}`
            : `Total: ${result.score || 'N/A'}`;
            
        statusElement.innerHTML = `
            <span class="status-badge status-completed">Result Entered</span>
            <div class="score-preview">${scoreDisplay}</div>
        `;
        
        const actionsElement = studentItem.querySelector('.student-actions');
        const button = actionsElement.querySelector('.enter-result-btn');
        button.innerHTML = '<i class="bi bi-pencil"></i> Edit Result';
    }
}

async function loadExistingResults() {
    const classLevelId = document.getElementById('classLevelSelect').value;
    const subjectId = document.getElementById('subjectSelect').value;
    const termId = document.getElementById('termSelect').value;

    if (!classLevelId || !subjectId || !termId) return;

    try {
        const response = await fetch(`/academics/api/results/existing/?class_level_id=${classLevelId}&subject_id=${subjectId}&term_id=${termId}`);
        const data = await response.json();

        if (data.success && data.results) {
            resultsData = data.results;
            
            Object.keys(resultsData).forEach(studentId => {
                updateStudentStatus(studentId);
            });
            
            document.getElementById('submitBtn').disabled = Object.keys(resultsData).length === 0;
        }
    } catch (error) {
        console.error('Error loading existing results:', error);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    showToast('All results are saved individually. Use "Enter Result" for each student.', 'info');
}