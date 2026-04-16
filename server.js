import express from 'express';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// List all projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT id, name, created_at FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

// Save a project
app.post('/api/projects', (req, res) => {
  const { id, name, state } = req.body;
  const projectId = id || uuidv4();
  const data = JSON.stringify(state);

  const stmt = db.prepare(`
    INSERT INTO projects (id, name, data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET 
      name = excluded.name,
      data = excluded.data,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  stmt.run(projectId, name, data);
  res.json({ id: projectId, name });
});

// Get project details
app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json({ ...project, data: JSON.parse(project.data) });
});

// Delete a project
app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
