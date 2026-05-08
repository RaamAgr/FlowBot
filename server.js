import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'flows.json');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware for parsing JSON
app.use(express.json());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// API: Save a flow
app.post('/api/save-flow', async (req, res) => {
  try {
    const flow = req.body;
    // For now, we just save to a local file. 
    // In production with Render + MongoDB, you'd replace this with a DB call.
    await fs.writeFile(DATA_FILE, JSON.stringify(flow, null, 2));
    res.json({ success: true, message: 'Flow saved successfully' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ success: false, message: 'Failed to save flow' });
  }
});

// API: Load the flow
app.get('/api/load-flow', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'No saved flow found' });
    }
    res.status(500).json({ message: 'Error loading flow' });
  }
});

// Placeholder for future database health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FlowBot Backend is live' });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
