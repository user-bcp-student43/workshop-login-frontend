import { expect, it } from 'vitest';
import { selectVisibleTasks } from './task-selection';

it('filters and labels copies without modifying the input', () => {
  const tasks = [
    { title: 'low', priority: 'a', status: 'TODO', owner: 'student' },
    { title: 'hidden', priority: 'z', status: 'ARCHIVED' },
    { title: 'high', priority: 'z', status: 'DONE' }
  ];
  const original = JSON.stringify(tasks);
  expect(selectVisibleTasks(tasks).map(task => task.title)).toEqual(['high', 'low']);
  expect(JSON.stringify(tasks)).toBe(original);
});

it('preserves comparison for equal, missing and numeric priorities', () => {
  expect(selectVisibleTasks([{ title: 'first' }, { title: 'second', priority: 1 }]).map(task => task.title))
    .toEqual(['first', 'second']);
  expect(selectVisibleTasks([{ priority: 1 }, {}])).toHaveLength(2);
  expect(selectVisibleTasks([{ priority: 1 }, { priority: 2 }]).map(task => task.priority)).toEqual([2, 1]);
  expect(selectVisibleTasks([{ priority: 2 }, { priority: 1 }]).map(task => task.priority)).toEqual([2, 1]);
  expect(selectVisibleTasks([{ title: 'first', priority: 1 }, { title: 'second', priority: 1 }]).map(task => task.title))
    .toEqual(['first', 'second']);
  expect(selectVisibleTasks([])).toEqual([]);
});