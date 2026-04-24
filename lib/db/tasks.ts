import { supabase } from "@/lib/supabase/client";

export type TaskStatus = "todo" | "doing" | "review" | "done";

export interface Subtask { id: string; title: string; done: boolean; assignee?: string; dueDate?: string }
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface Checklist { id: string; title: string; items: ChecklistItem[] }
export interface Comment { id: string; userId: string; text: string; when: Date }
export interface Activity { id: string; userId: string; action: string; when: Date }

export interface Task {
  id: string;
  clientId: string;
  moduleId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string;
  assignees: string[];
  tags: string[];
  startDate: Date | null;
  dueDate: Date | null;
  progress: number;
  subtasks: Subtask[];
  checklists: Checklist[];
  comments: Comment[];
  activity: Activity[];
  customFields: Record<string, any>;
  timeTracked: number | null;
  timeEstimate: number | null;
  attachments: string[];
}

export interface NewTask {
  clientId: string;
  moduleId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: string;
  assignees?: string[];
  tags?: string[];
  startDate?: Date | null;
  dueDate?: Date | null;
}

// ---- row <-> model ----
const fromRow = (r: any): Task => ({
  id: r.id,
  clientId: r.client_id,
  moduleId: r.module_id,
  title: r.title,
  description: r.description,
  status: r.status,
  priority: r.priority,
  assignees: r.assignees || [],
  tags: r.tags || [],
  startDate: r.start_date ? new Date(r.start_date) : null,
  dueDate: r.due_date ? new Date(r.due_date) : null,
  progress: r.progress || 0,
  subtasks: r.subtasks || [],
  checklists: r.checklists || [],
  comments: (r.comments || []).map((c: any) => ({ ...c, when: c.when ? new Date(c.when) : new Date() })),
  activity: (r.activity || []).map((a: any) => ({ ...a, when: a.when ? new Date(a.when) : new Date() })),
  customFields: r.custom_fields || {},
  timeTracked: r.time_tracked,
  timeEstimate: r.time_estimate,
  attachments: r.attachments || [],
});

const toRow = (t: Partial<Task>) => {
  const r: Record<string, unknown> = {};
  if (t.id !== undefined) r.id = t.id;
  if (t.clientId !== undefined) r.client_id = t.clientId;
  if (t.moduleId !== undefined) r.module_id = t.moduleId;
  if (t.title !== undefined) r.title = t.title;
  if (t.description !== undefined) r.description = t.description;
  if (t.status !== undefined) r.status = t.status;
  if (t.priority !== undefined) r.priority = t.priority;
  if (t.assignees !== undefined) r.assignees = t.assignees;
  if (t.tags !== undefined) r.tags = t.tags;
  if (t.startDate !== undefined) r.start_date = t.startDate ? t.startDate.toISOString().slice(0, 10) : null;
  if (t.dueDate !== undefined) r.due_date = t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null;
  if (t.progress !== undefined) r.progress = t.progress;
  if (t.subtasks !== undefined) r.subtasks = t.subtasks;
  if (t.checklists !== undefined) r.checklists = t.checklists;
  if (t.comments !== undefined) {
    r.comments = t.comments.map((c) => ({ ...c, when: c.when instanceof Date ? c.when.toISOString() : c.when }));
  }
  if (t.activity !== undefined) {
    r.activity = t.activity.map((a) => ({ ...a, when: a.when instanceof Date ? a.when.toISOString() : a.when }));
  }
  if (t.customFields !== undefined) r.custom_fields = t.customFields;
  if (t.timeTracked !== undefined) r.time_tracked = t.timeTracked;
  if (t.timeEstimate !== undefined) r.time_estimate = t.timeEstimate;
  if (t.attachments !== undefined) r.attachments = t.attachments;
  return r;
};

// ---- fetch / mutations ----
export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createTask(input: NewTask): Promise<Task> {
  const id = `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const { data, error } = await supabase
    .from("tasks")
    .insert(toRow({
      id,
      clientId: input.clientId,
      moduleId: input.moduleId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "media",
      assignees: input.assignees ?? [],
      tags: input.tags ?? [],
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      progress: 0,
      subtasks: [],
      checklists: [],
      comments: [],
      activity: [],
      customFields: {},
      attachments: [],
    }))
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
