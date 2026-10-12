
const projects = [];

const projectForm = document.querySelector("#project-form");
const nameInput = document.querySelector("#name");
const statusInput = document.querySelector("#status");
const projectList = document.querySelector("#project-list");
const emptyState = document.querySelector("#empty-state");

function renderProjects() {
    // Remove previously displayed project items.
    projectList.replaceChildren();

    // Update the empty-state message if it exists.
    if (emptyState) {
        emptyState.hidden = projects.length > 0;
    }

    // Display every project currently in the array.
    projects.forEach((project) => {
        const listItem = document.createElement("li");
        const projectName = document.createElement("span");
        const projectStatus = document.createElement("span");

        projectName.textContent = project.name;
        projectStatus.textContent = ` — ${project.status}`;

        listItem.append(projectName, projectStatus);
        projectList.appendChild(listItem);
    });
}

// Register exactly one submit listener.
projectForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const status = statusInput.value;

    // Reject an empty project name.
    if (!name) {
        nameInput.focus();
        return;
    }

    // Create and store a new project.
    const project = {
        id: crypto.randomUUID(),
        name: name,
        status: status
    };

    projects.push(project);

    // Refresh the displayed project list.
    renderProjects();

    // Clear the form for the next project.
    projectForm.reset();
    nameInput.focus();
});

// Display the initial empty state.
renderProjects();
