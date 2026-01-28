import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getPool } from '../db/connection.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error.js';
import type { TaskFile } from '@shared/types.js';

export class FileService {
  static uploadMiddleware() {
    const storage = multer.memoryStorage();
    return multer({
      storage,
      limits: {
        fileSize: config.files.maxFileSize,
      },
    }).single('file');
  }

  static async saveFile(
    sessionKey: string,
    taskNumber: number,
    file: Express.Multer.File
  ): Promise<TaskFile> {
    const pool = getPool();

    // Get task ID
    const taskResult = await pool.query(
      `SELECT t.id FROM tasks t
       JOIN sessions s ON s.id = t.session_id
       WHERE s.session_key = $1 AND t.task_number = $2`,
      [sessionKey, taskNumber]
    );

    if (taskResult.rows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    const taskId = taskResult.rows[0].id;

    // Create directory structure
    const dirPath = path.join(config.files.storagePath, sessionKey, String(taskNumber));
    await fs.mkdir(dirPath, { recursive: true });

    // Save file
    const filePath = path.join(dirPath, file.originalname);
    await fs.writeFile(filePath, file.buffer);

    // Save to database
    const result = await pool.query(
      `INSERT INTO task_files (task_id, filename, content_type, size_bytes, file_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, file.originalname, file.mimetype, file.size, filePath]
    );

    return {
      id: result.rows[0].id,
      taskId: result.rows[0].task_id,
      filename: result.rows[0].filename,
      contentType: result.rows[0].content_type,
      sizeBytes: result.rows[0].size_bytes,
      filePath: result.rows[0].file_path,
      createdAt: result.rows[0].created_at,
    };
  }

  static async getFile(fileId: string): Promise<{ file: TaskFile; content: Buffer }> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM task_files WHERE id = $1', [fileId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'File not found');
    }

    const file: TaskFile = {
      id: result.rows[0].id,
      taskId: result.rows[0].task_id,
      filename: result.rows[0].filename,
      contentType: result.rows[0].content_type,
      sizeBytes: result.rows[0].size_bytes,
      filePath: result.rows[0].file_path,
      createdAt: result.rows[0].created_at,
    };

    const content = await fs.readFile(file.filePath);
    return { file, content };
  }

  static async deleteFilesForTask(taskId: string): Promise<void> {
    const pool = getPool();
    const result = await pool.query('SELECT file_path FROM task_files WHERE task_id = $1', [taskId]);

    for (const row of result.rows) {
      try {
        await fs.unlink(row.file_path);
      } catch {
        // Ignore errors if file doesn't exist
      }
    }

    await pool.query('DELETE FROM task_files WHERE task_id = $1', [taskId]);
  }
}
