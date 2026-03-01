const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (for MVP)
let todos = [
  { id: 1, title: 'Learn Node.js', completed: false, priority: 'high', createdAt: new Date() },
  { id: 2, title: 'Build Todo App', completed: false, priority: 'medium', createdAt: new Date() },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// GET all todos
app.get('/api/todos', (req, res) => {
  const { filter } = req.query;
  let result = todos;
  
  if (filter === 'active') result = todos.filter(t => !t.completed);
  else if (filter === 'completed') result = todos.filter(t => t.completed);
  
  res.json(result);
});

// POST create todo
app.post('/api/todos', (req, res) => {
  const { title, description, priority = 'medium', dueDate } = req.body;
  const todo = {
    id: Date.now(),
    title,
    description,
    priority,
    dueDate,
    completed: false,
    createdAt: new Date()
  };
  todos.push(todo);
  res.status(201).json(todo);
});

// PUT update todo
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const index = todos.findIndex(t => t.id == id);
  
  if (index === -1) return res.status(404).json({ error: 'Todo not found' });
  
  todos[index] = { ...todos[index], ...req.body };
  res.json(todos[index]);
});

// DELETE todo
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  todos = todos.filter(t => t.id != id);
  res.status(204).send();
});

// Toggle complete
app.patch('/api/todos/:id/toggle', (req, res) => {
  const { id } = req.params;
  const todo = todos.find(t => t.id == id);
  
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  
  todo.completed = !todo.completed;
  res.json(todo);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
