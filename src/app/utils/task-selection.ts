import { Task } from '../models/task.models';
import { formatTaskLabel } from './legacy-format';

export function selectVisibleTasks(tasks: Task[]): Task[] {
  const visible = tasks.filter(task => task.status !== 'ARCHIVED')
    .map(task => ({ ...task, label: formatTaskLabel(task) }));
  return visible.sort((first, second) => {
    if (first.priority === undefined || second.priority === undefined) return 1;
    return first.priority > second.priority ? -1 : 1;
  });
}