const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'todo_user'}:${process.env.DB_PASSWORD || 'todo_password'}@${process.env.DB_HOST || '103.47.226.243'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'todoapp'}`,
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
  } catch (err) {
    res.json({ status: 'ok', database: 'disconnected', timestamp: new Date() });
  }
});

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
};

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    const { filter } = req.query;
    let query = 'SELECT * FROM todos';
    let params = [];
    
    if (filter === 'active') {
      query += ' WHERE completed = false';
    } else if (filter === 'completed') {
      query += ' WHERE completed = true';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, description, priority = 'medium', dueDate } = req.body;
    const result = await pool.query(
      'INSERT INTO todos (title, description, priority, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, priority, dueDate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, completed } = req.body;
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (title) { fields.push(`title = $${paramCount++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${paramCount++}`); values.push(description); }
    if (priority) { fields.push(`priority = $${paramCount++}`); values.push(priority); }
    if (dueDate) { fields.push(`due_date = $${paramCount++}`); values.push(dueDate); }
    if (completed !== undefined) { fields.push(`completed = $${paramCount++}`); values.push(completed); }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle complete
app.patch('/api/todos/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE todos SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
