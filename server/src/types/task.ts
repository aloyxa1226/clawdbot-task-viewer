import { z } from "zod";

export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed", "failed"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskTypeSchema = z.enum(["feature", "bug", "chore"]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: TaskStatusSchema.default("pending"),
  priority: TaskPrioritySchema.default("P1"),
  type: TaskTypeSchema.default("feature"),
  assignedTo: z.string().uuid().optional(),
  labels: z.array(z.string()).default([]),
  estimatedHours: z.number().min(0).max(1000).optional(),
  dueDate: z.string().datetime().optional(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskSchema>;

export interface Task extends CreateTaskRequest {
  id: string;
  sessionKey: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}