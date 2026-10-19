// @vitest-environment jsdom
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDashboard, createRouter, deferred, seedSession } from '../../testing/workshop-test-helpers';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

describe('dashboard characterization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('redirects without a token and does not request tasks', async () => {
    const router = createRouter();
    await createDashboard(router).ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('filters archived tasks, labels, sorts and keeps the full response', async () => {
    seedSession();
    const tasks = [
      { title: 'low', status: 'TODO', priority: 'a', owner: 'student' },
      { title: 'hidden', status: 'ARCHIVED', priority: 'z' },
      { title: 'high', status: 'IN_PROGRESS', priority: 'z', owner: 'trainer' }
    ];
    vi.mocked(axios.get).mockResolvedValue({ data: tasks });
    const component = createDashboard();
    await component.ngOnInit();
    expect(component.visibleTasks.map(task => task.title)).toEqual(['high', 'low']);
    expect(component.visibleTasks[0].label).toBe('Z \u00b7 TRAINER');
    expect(component.tasks).toHaveLength(3);
    expect(component.loading).toBe(false);
  });

  it('uses an empty owner without a username and handles an empty array', async () => {
    seedSession({ displayName: 'Student' });
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const component = createDashboard();
    await component.ngOnInit();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=', {
      headers: { Authorization: 'Bearer test-token' }
    });
    expect(component.visibleTasks).toEqual([]);
    expect(component.loading).toBe(false);
  });

  it('keeps equal priorities and does not filter lowercase archived', async () => {
    seedSession();
    vi.mocked(axios.get).mockResolvedValue({ data: [
      { title: 'first', status: 'archived', priority: 'a' },
      { title: 'second', status: 'DONE', priority: 'a' }
    ] });
    const component = createDashboard();
    await component.ngOnInit();
    expect(component.visibleTasks.map(task => task.title)).toEqual(['first', 'second']);
  });

  it.each([
    { response: { data: { detail: 'backend detail' } } },
    { message: 'network detail' },
    {}
  ])('shows safe task errors without logout', async (failure) => {
    seedSession();
    const router = createRouter();
    const component = createDashboard(router);
    vi.mocked(axios.get).mockRejectedValue(failure);
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard');
    expect(component.loading).toBe(false);
    expect(localStorage.getItem('workshop_token')).toBe('test-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps loading while awaiting tasks', async () => {
    seedSession();
    const response = deferred<{ data: object[] }>();
    vi.mocked(axios.get).mockReturnValue(response.promise);
    const component = createDashboard();
    const operation = component.ngOnInit();
    expect(component.loading).toBe(true);
    response.resolve({ data: [] });
    await operation;
    expect(component.loading).toBe(false);
  });

  it.each([
    ['TODO', 'Por hacer'], ['IN_PROGRESS', 'En progreso'], ['DONE', 'Completado'],
    ['RESUELTO', 'Resuelto'], ['COMPLETED', 'Completado'], ['unknown', 'unknown'], ['', '']
  ])('maps status %s', (status, label) => {
    expect(createDashboard().statusLabel(status)).toBe(label);
  });

  it('characterizes invalid stored user JSON', async () => {
    seedSession();
    localStorage.setItem('workshop_user', '{bad');
    await expect(createDashboard().ngOnInit()).rejects.toThrow();
    expect(axios.get).not.toHaveBeenCalled();
  });
});