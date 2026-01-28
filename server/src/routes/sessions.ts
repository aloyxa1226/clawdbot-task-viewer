import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { getRedisClient } from '../redis/index.js';
import { CreateTaskSchema } from '../types/task.js';

const router = express.Router();

// POST /api/v1/sessions/:sessionKey/tasks
router.post('/:sessionKey/tasks', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    
    // Validate session exists
    const sessionResult = await query(
      'SELECT id FROM sessions WHERE session_key = $1',
      [sessionKey]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Validate request body against schema
    const validatedData = CreateTaskSchema.parse(req.body);
    
    // Generate task ID
    const taskId = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;
    
    // Insert task into database
    const insertResult = await query(
      `INSERT INTO tasks (
        id, session_key, title, description, status, priority, 
        type, assigned_to, labels, estimated_hours, due_date, 
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        taskId,
        sessionKey,
        validatedData.title,
        validatedData.description || null,
        validatedData.status,
        validatedData.priority,
        validatedData.type,
        validatedData.assignedTo || null,
        validatedData.labels,
        validatedData.estimatedHours || null,
        validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        validatedData.assignedTo || null, // createdBy defaults to assignedTo if provided
        createdAt,
        updatedAt
      ]
    );

    const newTask = insertResult.rows[0];

    // Publish real-time update via Redis
    const redis = getRedisClient();
    await redis.publish(
      `session:${sessionKey}:tasks`,
      JSON.stringify({
        type: 'task_created',
        task: newTask
      })
    );

    return res.status(201).json({
      task: newTask,
      message: 'Task created successfully'
    });

    } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error
      });
    }

    console.error('Error creating task:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;