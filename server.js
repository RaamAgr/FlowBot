import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for complex flows
app.use(express.static(path.join(__dirname, 'dist')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Flow Schema
const flowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Flow = mongoose.model('Flow', flowSchema);

// API: Save a flow (Update existing or Create new)
app.post('/api/save-flow', async (req, res) => {
  try {
    const { name, nodes, edges } = req.body;
    
    // For now, we'll just keep updating the same "Main" flow or create one if none exists
    // Later you can add multiple flow support by passing an ID
    let flow = await Flow.findOne({ name });
    
    if (flow) {
      flow.nodes = nodes;
      flow.edges = edges;
      flow.savedAt = new Date();
      await flow.save();
    } else {
      flow = new Flow({ name, nodes, edges });
      await flow.save();
    }
    
    res.json({ success: true, message: 'Flow saved to Cloud DB' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ success: false, message: 'Database error while saving' });
  }
});

// API: Load a flow
app.get('/api/load-flow', async (req, res) => {
  try {
    const { name } = req.query;
    const flow = name 
      ? await Flow.findOne({ name }) 
      : await Flow.findOne().sort({ updatedAt: -1 }); // Get the most recently updated flow
    
    if (!flow) {
      return res.status(404).json({ message: 'No saved flow found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ message: 'Database error while loading' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Serve React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
