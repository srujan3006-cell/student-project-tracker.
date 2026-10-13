
import express from 'express';

const app = express();

// Parse incoming JSON request bodies (maximum 10 KB).
app.use(express.json({ limit: '10kb' }));

// Serve frontend files from the public folder.
app.use(express.static('public'));

// Temporary in-memory project collection.
const projects = [];
let nextProjectId = 1;

// Health-check route.
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// Return all projects.
app.get('/api/projects', (req, res) => {
    res.json(projects);
});

// Create a project.
app.post('/api/projects', (req, res) => {
    const { name, status } = req.body ?? {};

    const validStatuses = [
        'Planned',
        'In Progress',
        'Completed'
    ];

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        !validStatuses.includes(status)
    ) {
        return res.status(400).json({
            error: 'A valid project name and status are required.'
        });
    }

    const project = {
        id: nextProjectId++,
        name: name.trim(),
        status
    };

    projects.push(project);

    res.status(201).json(project);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => console.log(`Open http://localhost:${port}`));
