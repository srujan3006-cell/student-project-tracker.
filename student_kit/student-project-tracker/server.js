
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
        res.status(500).json({ error: 'Could not retrieve projects.' });
    }
});

// Create a project in SQLite.
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
        res.status(500).json({ error: 'Could not create project.' });
    }
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => console.log(`Open http://localhost:${port}`));
