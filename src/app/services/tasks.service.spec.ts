import axios from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it.each(['student', '', 'a b&next=1'])('keeps the owner construction and Bearer header for %s', async owner => {
  const tasks = [{ title: 'Task', status: 'TODO' }];
  vi.mocked(axios.get).mockResolvedValue({ data: tasks });
  expect(await new TasksService().getTasks('fixture-token', owner)).toBe(tasks);
  expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=' + owner, {
    headers: { Authorization: 'Bearer fixture-token' }
  });
});

it('preserves HTTP rejection for presentation-layer error handling', async () => {
  const failure = { response: { status: 403, data: { detail: 'fixture' } } };
  vi.mocked(axios.get).mockRejectedValue(failure);
  await expect(new TasksService().getTasks('fixture-token', 'student')).rejects.toBe(failure);
});