
const STORAGE_KEY = "workshop-projects-v1";

let projects = [];
let editingId = null;
let storageReady = false;

const projectForm = document.querySelector("#project-form");
const nameInput = document.querySelector("#name");
const statusInput = document.querySelector("#status");
const projectList = document.querySelector("#project-list");
const emptyState = document.querySelector("#empty-state");
const formTitle = document.querySelector("#form-title");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
const message = document.querySelector("#message");

function showMessage(text) {
    message.textContent = text;
}

function isValidProjectArray(value) {
    return Array.isArray(value) && value.every((project) =>
        project !== null &&
        typeof project === "object" &&
        !Array.isArray(project) &&
        typeof project.id === "string" &&
        project.id.length > 0 &&
        typeof project.name === "string" &&
        project.name.trim().length > 0 &&
        typeof project.status === "string" &&
        ["Planned", "In Progress", "Completed"].includes(project.status)
    ) && new Set(value.map((project) => project.id)).size === value.length;
}

function loadProjects() {
    let savedText;

    try {
        savedText = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        showMessage(
            "Storage could not be read. Projects cannot be safely loaded or saved."
        );
        return false;
    }

    if (savedText === null) {
        projects = [];
        return true;
    }

    let parsedData;

    try {
        parsedData = JSON.parse(savedText);
    } catch (error) {
        showMessage(
            "Saved project data is invalid JSON. Existing stored data was left unchanged."
        );
        return false;
    }

    if (!isValidProjectArray(parsedData)) {
        showMessage(
            "Saved project data has an invalid format. Existing stored data was left unchanged."
        );
        return false;
    }

    projects = parsedData;
    return true;
}

function saveProjects() {
    try {
        const serializedProjects = JSON.stringify(projects);
        localStorage.setItem(STORAGE_KEY, serializedProjects);
        return true;
    } catch (error) {
        showMessage("Changes could not be saved to browser storage.");
        return false;
    }
}

function resetForm() {
    projectForm.reset();
    editingId = null;

    saveButton.textContent = "Add Project";
    cancelButton.hidden = true;
    formTitle.textContent = "Add a Project";
}

function renderProjects() {
    projectList.replaceChildren();

    if (emptyState) {
        emptyState.hidden = projects.length > 0;
    }

    projects.forEach((project) => {
        const listItem = document.createElement("li");
        const projectName = document.createElement("span");
        const projectStatus = document.createElement("span");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        projectName.textContent = project.name;
        projectStatus.textContent = ` — ${project.status}`;

        editButton.type = "button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            const selectedProject = projects.find(
                (item) => item.id === project.id
            );

            if (!selectedProject) {
                return;
            }

            editingId = selectedProject.id;
            nameInput.value = selectedProject.name;
            statusInput.value = selectedProject.status;

            saveButton.textContent = "Save changes";
            cancelButton.hidden = false;
            formTitle.textContent = "Edit Project";

            showMessage("");
            nameInput.focus();
        });

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            const selectedProject = projects.find(
                (item) => item.id === project.id
            );

            if (!selectedProject) {
                return;
            }

            const confirmed = window.confirm(
                `Delete "${selectedProject.name}"?`
            );

            if (!confirmed) {
                return;
            }

            const projectIndex = projects.findIndex(
                (item) => item.id === selectedProject.id
            );

            if (projectIndex === -1) {
                return;
            }

            // Keep a copy so an unsuccessful save can be rolled back.
            const previousProjects = [...projects];
            projects.splice(projectIndex, 1);

            if (!saveProjects()) {
                projects = previousProjects;
                renderProjects();
                return;
            }

            if (editingId === selectedProject.id) {
                resetForm();
            }

            renderProjects();
            showMessage("Project deleted successfully.");
        });

        listItem.append(
            projectName,
            projectStatus,
            document.createTextNode(" "),
            editButton,
            document.createTextNode(" "),
            deleteButton
        );

        projectList.appendChild(listItem);
    });
}

// One submit listener handles both Add and Edit.
projectForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!storageReady) {
        showMessage(
            "Projects were not loaded safely. Fix the storage issue before making changes."
        );
        return;
    }

    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (!name) {
        showMessage("Please enter a project name.");
        nameInput.focus();
        return;
    }

    if (!["Planned", "In Progress", "Completed"].includes(status)) {
        showMessage("Please select a valid project status.");
        return;
    }

    const previousProjects = [...projects];

    if (editingId !== null) {
        const projectIndex = projects.findIndex(
            (project) => project.id === editingId
        );

        if (projectIndex === -1) {
            resetForm();
            renderProjects();
            showMessage("Project not found. Please try again.");
            return;
        }

        projects[projectIndex] = {
            ...projects[projectIndex],
            name,
            status
        };
    } else {
        projects.push({
            id: crypto.randomUUID(),
            name,
            status
        });
    }

    if (!saveProjects()) {
        projects = previousProjects;
        renderProjects();
        return;
    }

    const wasEditing = editingId !== null;

    resetForm();
    renderProjects();
    showMessage(
        wasEditing
            ? "Project updated and saved successfully."
            : "Project added and saved successfully."
    );

    nameInput.focus();
});

// Cancel edit does not write to storage.
cancelButton.addEventListener("click", () => {
    resetForm();
    showMessage("");
    nameInput.focus();
});

// Load before enabling project changes.
storageReady = loadProjects();
renderProjects();
    