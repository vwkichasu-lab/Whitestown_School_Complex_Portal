import showToast, { hideLoader, showLoader } from "/static/scripts/JS/admin_d.js";
import getCsrfToken from "/static/scripts/JS/utility/getCsrfToken.js";

const modal = document.getElementById("classModal");
const classForm = document.getElementById("classForm");
const openClassModal = document.getElementById("openClassModal");
const openEmptyClassModal = document.getElementById("openEmptyClassModal");
const closeButtons = document.querySelectorAll(".closeModal");

function compactCode(value) {
    return (value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function openModal() {
    if (modal) modal.style.display = "flex";
}

function closeModal() {
    if (modal) modal.style.display = "none";
}

function updateGeneratedClass() {
    const division = document.getElementById("divisionName")?.value || "";
    const level = document.getElementById("classLevel")?.value || "";
    const stream = document.getElementById("classStream")?.value || "";
    const code = document.getElementById("classCode");

    if (code) {
        const generated = ["WSC", division, level, stream].map(compactCode).filter(Boolean).join("-");
        code.value = generated;
    }
}

async function getClassData(classId) {
    const response = await fetch(`/academics/classes/${classId}/data/`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Failed to load class details");
    return data.data;
}

function transientModal(title, body, footer = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "modal show";
    wrapper.innerHTML = `
        <div class="modal-content academic-modal">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" type="button"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body">${body}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
        </div>
    `;
    document.body.appendChild(wrapper);
    wrapper.querySelector(".modal-close").addEventListener("click", () => wrapper.remove());
    wrapper.addEventListener("click", event => {
        if (event.target === wrapper) wrapper.remove();
    });
    return wrapper;
}

async function viewClass(classId) {
    try {
        showLoader();
        const data = await getClassData(classId);
        hideLoader();
        transientModal(
            `<i class="bi bi-building"></i> ${data.name}`,
            `
                <div class="detail-grid">
                    <div><span>Code</span><strong>${data.code || "No code"}</strong></div>
                    <div><span>Division</span><strong>${data.division_name || "General"}</strong></div>
                    <div><span>Form Teacher</span><strong>${data.form_teacher_name || "Not assigned"}</strong></div>
                    <div><span>Students</span><strong>${data.current_students_count} / ${data.capacity}</strong></div>
                    <div class="wide"><span>Description</span><strong>${data.description || "No description"}</strong></div>
                    <div class="wide">
                        <span>Subjects and Handlers</span>
                        <div class="detail-tags">
                            ${(data.subject_handlers || []).map(item => `<b>${item.subject_name} - ${item.teacher_name}</b>`).join("") || "<small>No subjects assigned</small>"}
                        </div>
                    </div>
                    <div class="wide">
                        <span>Streams</span>
                        <div class="detail-tags">
                            ${(data.streams || []).map(stream => `<b>${stream.name} - ${stream.capacity} seats</b>`).join("") || "<small>No streams created</small>"}
                        </div>
                    </div>
                </div>
            `,
            `<button type="button" class="btn btn-secondary close-detail">Close</button>`
        ).querySelector(".close-detail").addEventListener("click", event => event.target.closest(".modal").remove());
    } catch (error) {
        hideLoader();
        showToast(error.message, "error");
    }
}

async function editClass(classId) {
    try {
        showLoader();
        const data = await getClassData(classId);
        hideLoader();
        const wrapper = transientModal(
            `<i class="bi bi-pencil-square"></i> Edit Class`,
            `
                <form id="editClassForm" class="form-grid">
                    <div class="form-group">
                        <label>Class Name</label>
                        <input name="name" class="form-control" value="${data.name || ""}" required>
                    </div>
                    <div class="form-group">
                        <label>Class Code</label>
                        <input name="code" class="form-control" value="${data.code || ""}">
                    </div>
                    <div class="form-group">
                        <label>Capacity</label>
                        <input type="number" name="capacity" class="form-control" value="${data.capacity || 30}" min="1">
                    </div>
                    <div class="form-group">
                        <label>Display Order</label>
                        <input type="number" name="display_order" class="form-control" value="${data.display_order || 0}">
                    </div>
                    <div class="form-group wide">
                        <label>Description</label>
                        <textarea name="description" class="form-control" rows="3">${data.description || ""}</textarea>
                    </div>
                    <label class="check-row wide">
                        <input type="checkbox" name="is_active" ${data.is_active ? "checked" : ""}>
                        <span>Active class</span>
                    </label>
                </form>
            `,
            `
                <button type="button" class="btn btn-secondary close-detail">Cancel</button>
                <button type="submit" form="editClassForm" class="btn btn-primary">Save Changes</button>
            `
        );

        wrapper.querySelector(".close-detail").addEventListener("click", () => wrapper.remove());
        wrapper.querySelector("#editClassForm").addEventListener("submit", async event => {
            event.preventDefault();
            await updateClass(classId, new FormData(event.target));
            wrapper.remove();
        });
    } catch (error) {
        hideLoader();
        showToast(error.message, "error");
    }
}

async function updateClass(classId, formData) {
    const response = await fetch(`/academics/classes/${classId}/update/`, {
        method: "POST",
        body: formData,
        headers: {
            "X-CSRFToken": getCsrfToken(),
            "X-Requested-With": "XMLHttpRequest",
        },
    });
    const data = await response.json();
    if (data.success) {
        showToast(data.message, "success");
        setTimeout(() => window.location.reload(), 900);
    } else {
        showToast(data.error || "Failed to update class", "error");
    }
}

async function assignTeacher(classId) {
    try {
        showLoader();
        const [classData, teachersResponse] = await Promise.all([
            getClassData(classId),
            fetch("/academics/api/teachers/"),
        ]);
        const teachersData = await teachersResponse.json();
        hideLoader();

        const wrapper = transientModal(
            `<i class="bi bi-person-check"></i> Assign Form Teacher`,
            `
                <form id="assignTeacherForm">
                    <div class="handler-summary">
                        <span>${classData.name}</span>
                        <strong>Current: ${classData.form_teacher_name || "Not assigned"}</strong>
                    </div>
                    <div class="form-group">
                        <label>Form Teacher</label>
                        <select name="form_teacher" class="form-control" required>
                            <option value="">Select teacher</option>
                            ${(teachersData.teachers || []).map(teacher => `
                                <option value="${teacher.id}" ${classData.form_teacher === teacher.id ? "selected" : ""}>
                                    ${teacher.first_name} ${teacher.last_name} - ${teacher.teacher_profile__employee_id || teacher.email}
                                </option>
                            `).join("")}
                        </select>
                    </div>
                </form>
            `,
            `
                <button type="button" class="btn btn-secondary close-detail">Cancel</button>
                <button type="submit" form="assignTeacherForm" class="btn btn-primary">Assign Teacher</button>
            `
        );

        wrapper.querySelector(".close-detail").addEventListener("click", () => wrapper.remove());
        wrapper.querySelector("#assignTeacherForm").addEventListener("submit", async event => {
            event.preventDefault();
            const response = await fetch(`/academics/classes/${classId}/assign-teacher/`, {
                method: "POST",
                body: new FormData(event.target),
                headers: {
                    "X-CSRFToken": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, "success");
                setTimeout(() => window.location.reload(), 900);
            } else {
                showToast(result.error || "Failed to assign teacher", "error");
            }
        });
    } catch (error) {
        hideLoader();
        showToast(error.message, "error");
    }
}

async function manageSubjects(classId) {
    try {
        showLoader();
        const [classData, subjectsResponse, yearsResponse, teachersResponse] = await Promise.all([
            getClassData(classId),
            fetch("/academics/api/subjects/"),
            fetch("/academics/academic-years/"),
            fetch("/academics/api/teachers/"),
        ]);
        const subjectsData = await subjectsResponse.json();
        const yearsData = await yearsResponse.json();
        const teachersData = await teachersResponse.json();
        hideLoader();

        const selectedIds = new Set((classData.subjects || []).map(subject => String(subject.id)));
        const handlerMap = new Map((classData.subject_handlers || []).map(item => [String(item.subject_id), item.teacher_id]));
        const wrapper = transientModal(
            `<i class="bi bi-journal-check"></i> Subjects for ${classData.name}`,
            `
                <form id="subjectsForm">
                    <div class="form-group">
                        <label>Academic Year</label>
                        <select name="academic_year" class="form-control" required>
                            <option value="">Select academic year</option>
                            ${(yearsData.academic_years || []).map(year => `
                                <option value="${year.id}" ${year.is_current ? "selected" : ""}>
                                    ${year.name}${year.is_current ? " (Current)" : ""}
                                </option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="subject-check-grid compact">
                        ${(subjectsData.subjects || []).map(subject => `
                            <div class="subject-assignment-row">
                                <label class="subject-check-row">
                                    <input type="checkbox" name="subjects" value="${subject.id}" ${selectedIds.has(String(subject.id)) ? "checked" : ""}>
                                    <span>${subject.name}</span>
                                    <small>${subject.code}</small>
                                </label>
                                <select name="teacher_${subject.id}" class="form-control subject-teacher-select">
                                    <option value="">Teacher later</option>
                                    ${(teachersData.teachers || []).map(teacher => `
                                        <option value="${teacher.id}" ${handlerMap.get(String(subject.id)) === String(teacher.id) ? "selected" : ""}>
                                            ${teacher.first_name} ${teacher.last_name}
                                        </option>
                                    `).join("")}
                                </select>
                            </div>
                        `).join("")}
                    </div>
                </form>
            `,
            `
                <button type="button" class="btn btn-secondary close-detail">Cancel</button>
                <button type="submit" form="subjectsForm" class="btn btn-primary">Save Subjects</button>
            `
        );

        wrapper.querySelector(".close-detail").addEventListener("click", () => wrapper.remove());
        wrapper.querySelector("#subjectsForm").addEventListener("submit", async event => {
            event.preventDefault();
            const response = await fetch(`/academics/classes/${classId}/assign-subjects/`, {
                method: "POST",
                body: new FormData(event.target),
                headers: {
                    "X-CSRFToken": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            const result = await response.json();
            if (result.success) {
                const assigned = result.assigned_teachers_count || 0;
                showToast(`${result.message} ${assigned} teacher${assigned === 1 ? "" : "s"} assigned.`, "success");
                setTimeout(() => window.location.reload(), 900);
            } else {
                showToast(result.error || "Failed to save subjects", "error");
            }
        });
    } catch (error) {
        hideLoader();
        showToast(error.message, "error");
    }
}

openClassModal?.addEventListener("click", openModal);
openEmptyClassModal?.addEventListener("click", openModal);
closeButtons.forEach(button => button.addEventListener("click", closeModal));
modal?.addEventListener("click", event => {
    if (event.target === modal) closeModal();
});

["divisionName", "classLevel", "classStream"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateGeneratedClass);
    document.getElementById(id)?.addEventListener("change", updateGeneratedClass);
});

classForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(classForm);
    const division = formData.get("division_name");
    const level = formData.get("class_level");
    const stream = formData.get("stream");
    formData.set("name", `${level} ${stream}`);
    formData.set("division_code", compactCode(division));
    formData.set("academic_year_badge", new Date().getFullYear().toString());
    formData.set("is_active", "true");

    const submitButton = classForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
        const response = await fetch(classForm.dataset.url, {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": getCsrfToken(),
                "X-Requested-With": "XMLHttpRequest",
            },
        });
        const data = await response.json();
        if (data.success) {
            showToast(data.message, "success");
            setTimeout(() => window.location.reload(), 900);
        } else {
            showToast(data.error || "Failed to create class", "error");
        }
    } catch (error) {
        showToast("An error occurred while saving the class", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
});

document.addEventListener("click", event => {
    const viewButton = event.target.closest(".view-btn");
    const editButton = event.target.closest(".edit-btn");
    const teacherButton = event.target.closest(".assign-teacher-btn");
    const subjectsButton = event.target.closest(".manage-subjects-btn");

    if (viewButton) viewClass(viewButton.dataset.classId);
    if (editButton) editClass(editButton.dataset.classId);
    if (teacherButton) assignTeacher(teacherButton.dataset.classId);
    if (subjectsButton) manageSubjects(subjectsButton.dataset.classId);
});

updateGeneratedClass();
