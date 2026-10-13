
import express from 'express';
import { db } from './database.js';

const app = express();

// Parse incoming JSON request bodies (maximum 10 KB).
app.use(express.json({ limit: '10kb' }));

// Serve frontend files from the public folder.
app.use(express.static('public'));

// Health-check route.
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// Return all projects from SQLite.
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await db.list();
        res.json(projects);
    } catch (error) {
        console.error('Failed to list projects:', error);
        res.status(500).json({
            error: 'Could not retrieve projects.'
        });
    }
});

// Create a new project.
app.post('/api/projects', async (req, res) => {
    const { name, status } = req.body ?? {};

    const validStatuses = [
        'Planned',
        'In Progress',
        'Completed'
    ];

    if (
        typeof name !== 'string' ||
        name.trim().length < 1 ||
        name.trim().length > 80 ||
        !validStatuses.includes(status)
    ) {
        return res.status(400).json({
            error: 'A valid project name (1–80 characters) and status are required.'
        });
    }

    try {
        const project = await db.create({
            name: name.trim(),
            status
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Failed to create project:', error);
        res.status(500).json({
            error: 'Could not create project.'
        });
    }
});

// Update an existing project.
app.put('/api/projects/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { name, status } = req.body ?? {};

    const validStatuses = [
        'Planned',
        'In Progress',
        'Completed'
    ];

    if (
        !Number.isInteger(id) ||
        id < 1 ||
        typeof name !== 'string' ||
        name.trim().length < 1 ||
        name.trim().length > 80 ||
        !validStatuses.includes(status)
    ) {
        return res.status(400).json({
            error: 'A valid project ID, name and status are required.'
        });
    }

    try {
        const project = await db.update(id, {
            name: name.trim(),
            status
        });

        if (!project) {
            return res.status(404).json({
                error: 'Project not found.'
            });
        }

        res.json(project);
    } catch (error) {
        console.error('Failed to update project:', error);
        res.status(500).json({
            error: 'Could not update project.'
        });
    }
});

// Delete an existing project.
app.delete('/api/projects/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            error: 'A valid project ID is required.'
        });
    }

    try {
        const deleted = await db.remove(id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Project not found.'
            });
        }

        // HTTP 204 means deletion succeeded with no response body.
        res.status(204).end();
    } catch (error) {
        console.error('Failed to delete project:', error);
        res.status(500).json({
            error: 'Could not delete project.'
        });
    }
});

// Handle malformed JSON requests.
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            error: 'Invalid JSON request body.'
        });
    }

    next(error);
});

// Start the server.
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
    console.log(`Student Project Tracker running at http://localhost:${port}`);
});
