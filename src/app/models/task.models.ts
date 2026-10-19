export interface TaskLabelInput {
  priority?: unknown;
  owner?: unknown;
}

export interface Task extends TaskLabelInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string | number;
  label?: string;
}