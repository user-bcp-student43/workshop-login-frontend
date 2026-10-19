// @vitest-environment jsdom
import axios from 'axios';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDashboard, createDashboardFixture, createRouter, deferred, seedSession } from '../../testing/workshop-test-helpers';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

describe('dashboard characterization', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
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

  it('BUG H-11: corrupted user JSON should end loading and show a safe error', async () => {
    seedSession();
    localStorage.setItem('workshop_user', '{bad');
    const router = createRouter();
    const component = createDashboard(router);
    await expect(component.ngOnInit()).resolves.toBeUndefined();
    expect(component.loading).toBe(false);
    expect(component.error).toBe('No se pudo cargar el dashboard');
    expect(axios.get).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('workshop_user')).toBe('{bad');
  });

  it.each(['workshop_token', 'workshop_user'])(
    'BUG H-11: inaccessible %s should end loading and show a safe error', async blockedKey => {
      seedSession();
      const router = createRouter();
      const component = createDashboard(router);
      const read = localStorage.getItem.bind(localStorage);
      vi.spyOn(localStorage, 'getItem').mockImplementation(key => {
        if (key === blockedKey) throw new DOMException('Storage blocked', 'SecurityError');
        return read(key);
      });
      await expect(component.ngOnInit()).resolves.toBeUndefined();
      expect(component.loading).toBe(false);
      expect(component.error).toBe('No se pudo cargar el dashboard');
      expect(axios.get).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }
  );

  it.each(['corrupt-user', 'workshop_token', 'workshop_user'])(
    'BUG H-11: renders a safe initialization error without loading placeholders for %s', async scenario => {
      seedSession();
      if (scenario === 'corrupt-user') {
        localStorage.setItem('workshop_user', '{bad');
      } else {
        const read = localStorage.getItem.bind(localStorage);
        vi.spyOn(localStorage, 'getItem').mockImplementation(key => {
          if (key === scenario) throw new DOMException('Storage blocked', 'SecurityError');
          return read(key);
        });
      }
      const fixture = await createDashboardFixture();
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('.error')?.textContent).toBe('No se pudo cargar el dashboard');
      expect(element.querySelector('.state-row')).toBeNull();
      expect(element.querySelector('.grid')).toBeNull();
      expect(axios.get).not.toHaveBeenCalled();
    }
  );

  it.each([400, 401, 403, 404, 429, 500, 503])('handles tasks HTTP %s without losing session or redirecting', async status => {
    seedSession();
    const router = createRouter();
    const component = createDashboard(router);
    vi.mocked(axios.get).mockRejectedValue({ response: { status, data: { detail: 'private-detail' } } });
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard');
    expect(component.loading).toBe(false);
    expect(component.visibleTasks).toEqual([]);
    expect(localStorage.getItem('workshop_token')).toBe('test-token');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['backend unavailable', 'ECONNREFUSED'],
    ['network or CORS failure', 'ERR_NETWORK'],
    ['transport timeout', 'ECONNABORTED']
  ])('handles tasks %s with a safe error', async (_scenario, code) => {
    seedSession();
    const router = createRouter();
    const component = createDashboard(router);
    vi.mocked(axios.get).mockRejectedValue({ code, message: 'private-detail' });
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard');
    expect(component.loading).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('workshop_token')).toBe('test-token');
  });

  it.each([undefined, null, '', '{bad-json', '<html>error</html>', { tasks: [] }, { data: [] }, [null], [undefined]])(
    'handles unexpected tasks response %j without treating it as an empty success', async data => {
      seedSession();
      const router = createRouter();
      const component = createDashboard(router);
      vi.mocked(axios.get).mockResolvedValue({ status: data === '' ? 204 : 200, data });
      await component.ngOnInit();
      expect(component.error).toBe('No se pudo cargar el dashboard');
      expect(component.loading).toBe(false);
      expect(component.visibleTasks).toEqual([]);
      expect(router.navigate).not.toHaveBeenCalled();
    }
  );

  it('does not invent a 5000 ms timeout for tasks while its promise remains pending', async () => {
    vi.useFakeTimers();
    seedSession();
    const response = deferred<{ data: object[] }>();
    vi.mocked(axios.get).mockReturnValue(response.promise);
    const component = createDashboard();
    const operation = component.ngOnInit();
    await vi.advanceTimersByTimeAsync(10000);
    expect(component.loading).toBe(true);
    expect(component.error).toBe('');
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer test-token' }
    });
    response.resolve({ data: [] });
    await operation;
    expect(component.loading).toBe(false);
  });

  it('accepts omitted task fields with the documented label defaults', async () => {
    seedSession();
    vi.mocked(axios.get).mockResolvedValue({ data: [{}] });
    const component = createDashboard();
    await component.ngOnInit();
    expect(component.error).toBe('');
    expect(component.loading).toBe(false);
    expect(component.visibleTasks[0].label).toBe('NORMAL \u00b7 SIN-ASIGNAR');
  });

  it.each(['null', '42', '{"username":42,"displayName":false}'])('uses empty owner for unsupported stored user %s', async stored => {
    seedSession();
    localStorage.setItem('workshop_user', stored);
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const component = createDashboard();
    await component.ngOnInit();
    expect(component.loading).toBe(false);
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=', {
      headers: { Authorization: 'Bearer test-token' }
    });
  });

  it('renders loaded tasks and the empty state with the real dashboard template', async () => {
    seedSession();
    vi.mocked(axios.get).mockResolvedValue({ data: [{ title: 'Task', description: 'Fixture', status: 'TODO' }] });
    const fixture = await createDashboardFixture();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h2')?.textContent).toBe('Task');
    expect(element.querySelector('.pill')?.textContent).toBe('Por hacer');
    expect(element.querySelector('.state-row')).toBeNull();
    fixture.componentInstance.visibleTasks = [];
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(element.querySelector('.empty')?.textContent).toContain('No hay tareas');
  });

  it('shows a safe error for an unexpected status type during real rendering', async () => {
    seedSession();
    vi.mocked(axios.get).mockResolvedValue({ data: [{ title: 'Task', status: 42 }] });
    const fixture = await createDashboardFixture();
    const element: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance.loading).toBe(false);
    expect(element.querySelector('.error')?.textContent).toBe('No se pudo cargar el dashboard');
    expect(element.querySelector('.grid')).toBeNull();
  });

  it.each(['storage', 'navigation'])('BUG H-14: logout %s failure should be contained and shown safely', async failure => {
    seedSession();
    const router = createRouter();
    const component = createDashboard(router);
    if (failure === 'storage') {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new DOMException('Storage blocked', 'SecurityError'); });
    } else {
      router.navigate.mockRejectedValue(new Error('Navigation failed'));
    }
    await expect(component.logout()).resolves.toBeUndefined();
    expect(component.error).not.toBe('');
    if (failure === 'storage') expect(router.navigate).not.toHaveBeenCalled();
  });
});