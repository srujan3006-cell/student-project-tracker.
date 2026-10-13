
let projects = [];
let editingId = null;
let isLoading = false;
let isSaving = false;
let loadSucceeded = false;

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

function setMutationControlsDisabled(disabled) {
    saveButton.disabled = disabled;
    cancelButton.disabled = disabled;
    projectList.querySelectorAll("button").forEach((button) => {
        button.disabled = disabled;
    });
}

function updateControls() {
    setMutationControlsDisabled(
        isLoading || isSaving || !loadSucceeded
    );
}

function resetForm() {
    projectForm.reset();
    editingId = null;
    saveButton.textContent = "Add Project";
    cancelButton.hidden = true;
    formTitle.textContent = "Add a Project";
}

async function readResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    return { error: text || `Request failed (${response.status}).` };
}

function getApiError(data, fallback) {
    return typeof data?.error === "string" && data.error.trim()
        ? data.error
        : fallback;
}

function renderProjects() {
    projectList.replaceChildren();

    emptyState.hidden = !loadSucceeded || projects.length > 0;

    if (loadSucceeded && projects.length === 0 && !isLoading) {
        emptyState.textContent = "No projects have been added yet.";
    }

    for (const project of projects) {
        const listItem = document.createElement("li");
        const projectName = document.createElement("span");
        const projectStatus = document.createElement("span");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        projectName.textContent = project.name;
        projectStatus.textContent = ` — ${project.status}`;

        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.disabled = isLoading || isSaving || !loadSucceeded;

        editButton.addEventListener("click", () => {
            if (isLoading || isSaving || !loadSucceeded) return;

            const selectedProject = projects.find(
                (item) => item.id === project.id
            );

            if (!selectedProject) return;

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
        deleteButton.disabled = isLoading || isSaving || !loadSucceeded;

        deleteButton.addEventListener("click", async () => {
            if (isLoading || isSaving || !loadSucceeded) return;

            const selectedProject = projects.find(
                (item) => item.id === project.id
            );

            if (!selectedProject) return;

            const confirmed = window.confirm(
                `Delete "${selectedProject.name}"?`
            );

            if (!confirmed) return;

            await deleteProject(selectedProject);
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
    }

    updateControls();
}

async function loadProjects({ showLoading = false } = {}) {
    if (isLoading) return false;

    isLoading = true;

    if (showLoading) {
        showMessage("Loading projects...");
    }

    updateControls();

    try {
        const response = await fetch("/api/projects");
        const data = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                getApiError(data, `Could not load projects (${response.status}).`)
            );
        }

        if (!Array.isArray(data)) {
            throw new Error("The server returned an invalid project list.");
        }

        projects = data;
        loadSucceeded = true;

        if (
            editingId !== null &&
            !projects.some((project) => project.id === editingId)
        ) {
            resetForm();
            showMessage("The project being edited no longer exists.");
        } else if (showLoading) {
            showMessage(
                projects.length === 0
                    ? "No projects found."
                    : "Projects loaded successfully."
            );
        }

        renderProjects();
        return true;
    } catch (error) {
        loadSucceeded = false;
        renderProjects();

        showMessage(
            error instanceof TypeError
                ? "Network error: could not connect to the project API. Check that the server is running."
                : error.message || "Could not load projects."
        );

        return false;
    } finally {
        isLoading = false;
        renderProjects();
    }
}

async function saveProject(event) {
    event.preventDefault();

    if (isLoading || isSaving || !loadSucceeded) {
        showMessage("Projects are not ready. Please wait and try again.");
        return;
    }

    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (!name) {
        showMessage("Please enter a project name.");
        nameInput.focus();
        return;
    }

    if (name.length > 80) {
        showMessage("Project names must be 80 characters or fewer.");
        nameInput.focus();
        return;
    }

    if (!["Planned", "In Progress", "Completed"].includes(status)) {
        showMessage("Please select a valid project status.");
        return;
    }

    const wasEditing = editingId !== null;
    const targetId = editingId;

    if (
        wasEditing &&
        !projects.some((project) => project.id === targetId)
    ) {
        resetForm();
        renderProjects();
        showMessage("Project not found. Please reload the project list.");
        return;
    }

    isSaving = true;
    saveButton.textContent = wasEditing ? "Saving..." : "Adding...";
    showMessage(wasEditing ? "Saving changes..." : "Adding project...");
    updateControls();

    try {
        const url = wasEditing
            ? `/api/projects/${encodeURIComponent(targetId)}`
            : "/api/projects";

        const response = await fetch(url, {
            method: wasEditing ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, status })
        });

        const data = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                getApiError(
                    data,
                    `Could not ${wasEditing ? "update" : "create"} project (${response.status}).`
                )
            );
        }

        const reloaded = await loadProjects();

        if (!reloaded) {
            showMessage(
                "The change was accepted by the server, but the project list could not be refreshed. Your form has been preserved."
            );
            return;
        }

        resetForm();
        showMessage(
            wasEditing
                ? "Project updated successfully."
                : "Project added successfully."
        );
        nameInput.focus();
    } catch (error) {
        showMessage(
            error instanceof TypeError
                ? "Network error: could not reach the project API. Your form has been preserved."
                : error.message || "The project could not be saved."
        );
    } finally {
        isSaving = false;
        saveButton.textContent = editingId !== null
            ? "Save changes"
            : "Add Project";
        renderProjects();
    }
}

async function deleteProject(project) {
    if (isLoading || isSaving || !loadSucceeded) return;

    isSaving = true;
    showMessage("Deleting project...");
    updateControls();

    try {
        const response = await fetch(
            `/api/projects/${encodeURIComponent(project.id)}`,
            { method: "DELETE" }
        );

        const data = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                getApiError(data, `Could not delete project (${response.status}).`)
            );
        }

        const reloaded = await loadProjects();

        if (!reloaded) {
            showMessage(
                "The delete request succeeded, but the project list could not be refreshed."
            );
            return;
        }

        if (editingId === project.id) {
            resetForm();
        }

        showMessage("Project deleted successfully.");
    } catch (error) {
        showMessage(
            error instanceof TypeError
                ? "Network error: could not reach the project API. The delete result could not be confirmed."
                : error.message || "The project could not be deleted."
        );
    } finally {
        isSaving = false;
        renderProjects();
    }
}

// One submit listener handles both Add and Edit.
projectForm.addEventListener("submit", saveProject);

// Cancel edit does not send an API request.
cancelButton.addEventListener("click", () => {
    if (isLoading || isSaving) return;

    resetForm();
    showMessage("");
    nameInput.focus();
});

async function initialize() {
    showMessage("Loading projects...");
    await loadProjects({ showLoading: true });
}

initialize();
