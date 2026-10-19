// @vitest-environment jsdom
import axios from 'axios';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDashboard, createLogin, createLoginFixture, createRouter, deferred } from '../../testing/workshop-test-helpers';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

describe('login characterization', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it.each([null, undefined, '', '   '])('rejects empty username %s before HTTP', async (username) => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username, password: '' });
    await component.login();
    expect(component.message).toContain('Ingrese un usuario.');
    expect(component.busy).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([null, undefined, '', '   '])('rejects empty password %s', async (password) => {
    const component = createLogin();
    Object.assign(component, { username: 'student', password });
    await component.login();
    expect(component.message).toContain('Ingrese una contrase');
    expect(axios.post).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it('preserves defaults and merges partial, false, extra and nested preferences', () => {
    expect(createLogin().preferences).toEqual({ theme: 'light', showTips: true, compact: false });
    localStorage.setItem('workshop_preferences', JSON.stringify({ showTips: false, custom: { level: 2 } }));
    expect(createLogin().preferences).toEqual({ theme: 'light', showTips: false, compact: false, custom: { level: 2 } });
    localStorage.setItem('workshop_preferences', JSON.stringify({ theme: 'dark', showTips: false, compact: true }));
    expect(createLogin().preferences).toEqual({ theme: 'dark', showTips: false, compact: true });
  });

  it('survives malformed preference JSON', () => {
    localStorage.setItem('workshop_preferences', '{invalid');
    expect(createLogin().preferences.theme).toBe('light');
  });

  it('preserves POST contract and stores session before navigation', async () => {
    const router = createRouter();
    router.navigate.mockImplementation(async () => {
      expect(localStorage.getItem('workshop_token')).toBe('test-token');
      expect(JSON.parse(localStorage.getItem('workshop_user') || '{}')).toEqual({ username: 'student' });
      expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
      return true;
    });
    const component = createLogin(router);
    component.username = ' student ';
    component.password = ' password ';
    const response = deferred<{ data: object }>();
    vi.mocked(axios.post).mockReturnValue(response.promise);
    const operation = component.login();
    expect(component.busy).toBe(true);
    response.resolve({ data: { token: 'test-token', user: { username: 'student' } } });
    await operation;
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/auth/login', {
      username: ' student ', password: ' password ', client: 'angular-workshop'
    }, { timeout: 5000 });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('does not store a session or navigate without a token', async () => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'test' });
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    await component.login();
    expect(component.message).toContain('sin token');
    expect(localStorage.getItem('workshop_token')).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it.each([
    { response: { data: { message: 'backend detail' } } },
    { message: 'network detail' },
    {}
  ])('shows safe login errors instead of backend details', async (failure) => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'test' });
    vi.mocked(axios.post).mockRejectedValue(failure);
    await component.login();
    expect(component.message).toContain('Verifique sus credenciales o intente nuevamente.');
    expect(component.message).not.toContain('detail');
    expect(component.busy).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('restores busy when navigation rejects', async () => {
    const router = createRouter();
    router.navigate.mockRejectedValue(new Error('navigation failed'));
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'test' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    await component.login();
    expect(component.busy).toBe(false);
  });

  it('integrates login, a new dashboard instance, tasks and logout', async () => {
    const router = createRouter();
    const login = createLogin(router);
    Object.assign(login, { username: 'student', password: 'test' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: { username: 'student' } } });
    vi.mocked(axios.get).mockResolvedValue({ data: [{ title: 'Task', status: 'TODO', owner: 'student', priority: 'high' }] });
    await login.login();
    const dashboard = createDashboard(router);
    await dashboard.ngOnInit();
    expect(dashboard.visibleTasks).toHaveLength(1);
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer test-token' }
    });
    await dashboard.logout();
    expect(localStorage.getItem('workshop_token')).toBeNull();
    expect(localStorage.getItem('workshop_user')).toBeNull();
    expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
    expect(router.navigate).toHaveBeenLastCalledWith(['/login']);
  });

  it('renders validation and busy state using the real template', async () => {
    const fixture = await createLoginFixture();
    await fixture.componentInstance.login();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.message')?.textContent).toContain('Ingrese un usuario.');
    fixture.componentInstance.busy = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(element.querySelector('button')?.disabled).toBe(true);
  });

  it('correction: renders username as literal text without exposing backend errors', async () => {
    const fixture = await createLoginFixture();
    Object.assign(fixture.componentInstance, { username: '<em>student</em>', password: 'test' });
    vi.mocked(axios.post).mockRejectedValue({ message: 'private-backend-detail' });
    await fixture.componentInstance.login();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.message em')).toBeNull();
    expect(element.querySelector('.message')?.textContent).toContain('<em>student</em>');
    expect(element.textContent).not.toContain('private-backend-detail');
  });

  it('updates the view after an asynchronous rejected login without manual detection', async () => {
    const fixture = await createLoginFixture();
    Object.assign(fixture.componentInstance, { username: 'student', password: 'test' });
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const response = deferred<{ data: object }>();
    vi.mocked(axios.post).mockReturnValue(response.promise);
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button');
    button?.click();
    await fixture.whenStable();
    expect(button?.disabled).toBe(true);
    response.reject({ message: 'private-backend-detail' });
    await response.promise.catch(() => undefined);
    await fixture.whenStable();
    expect(button?.disabled).toBe(false);
    expect(element.querySelector('.message')?.textContent).toContain('Verifique sus credenciales');
  });

  it.each([400, 401, 403, 404, 429, 500, 503])('handles login HTTP %s without leaking details or creating a session', async status => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockRejectedValue({ response: { status, data: { message: 'private-detail' } } });
    await component.login();
    expect(component.message).toBe('No se pudo autenticar a student. Verifique sus credenciales o intente nuevamente.');
    expect(component.busy).toBe(false);
    expect(localStorage.getItem('workshop_token')).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['backend unavailable', 'ECONNREFUSED'],
    ['network or CORS failure', 'ERR_NETWORK'],
    ['timeout', 'ECONNABORTED'],
    ['malformed response rejected by transport', 'ERR_BAD_RESPONSE']
  ])('handles login %s and restores busy', async (_scenario, code) => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockRejectedValue({ code, message: 'private-detail' });
    await component.login();
    expect(component.message).toContain('Verifique sus credenciales o intente nuevamente.');
    expect(component.message).not.toContain('private-detail');
    expect(component.busy).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/auth/login', {
      username: 'student', password: 'fixture-only', client: 'angular-workshop'
    }, { timeout: 5000 });
  });

  it.each([
    undefined, null, '', '{bad-json', '<html>error</html>',
    { data: { token: 'wrapped-token' } }, { token: '' }, { token: false }, { token: 0 }
  ])('rejects unexpected login body without a usable token: %j', async data => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ status: data === '' ? 204 : 200, data });
    await component.login();
    expect(component.message).toContain('sin token');
    expect(component.busy).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('workshop_token')).toBeNull();
  });

  it.each([undefined, null])('allows optional user %s and requests tasks with an empty owner', async user => {
    const router = createRouter();
    const login = createLogin(router);
    Object.assign(login, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user } });
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    await login.login();
    expect(localStorage.getItem('workshop_user')).toBe('{}');
    const dashboard = createDashboard(router);
    await dashboard.ngOnInit();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=', {
      headers: { Authorization: 'Bearer test-token' }
    });
    expect(dashboard.loading).toBe(false);
  });

  it('reports a storage failure without navigating and restores busy', async () => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Storage blocked', 'SecurityError'); });
    await component.login();
    expect(component.message).toContain('Verifique sus credenciales');
    expect(component.busy).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('preserves the stored session but restores busy if navigation rejects', async () => {
    const router = createRouter();
    router.navigate.mockRejectedValue(new Error('navigation failed'));
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    await component.login();
    expect(component.busy).toBe(false);
    expect(component.message).toContain('Verifique sus credenciales');
    expect(localStorage.getItem('workshop_token')).toBe('test-token');
  });

  it.each(['invalid-token', 'expired-token', 42])('shows tasks rejection for invalid, expired or unexpected token %s', async token => {
    const router = createRouter();
    const login = createLogin(router);
    Object.assign(login, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token, user: { username: 'student' } } });
    vi.mocked(axios.get).mockRejectedValue({ response: { status: 401 } });
    await login.login();
    const dashboard = createDashboard(router);
    await dashboard.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(dashboard.error).toBe('No se pudo cargar el dashboard');
    expect(dashboard.loading).toBe(false);
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer ' + String(token) }
    });
  });

  it('BUG H-12: reports navigation returning false instead of silently leaving login', async () => {
    const router = createRouter();
    router.navigate.mockResolvedValue(false);
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    await component.login();
    expect(component.busy).toBe(false);
    expect(component.message).toContain('Verifique sus credenciales');
  });

  it('BUG H-13: does not keep a partial session if saving preferences fails', async () => {
    const router = createRouter();
    const component = createLogin(router);
    Object.assign(component, { username: 'student', password: 'fixture-only' });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: { username: 'student' } } });
    const persist = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'workshop_preferences') throw new DOMException('Storage quota', 'QuotaExceededError');
      persist(key, value);
    });
    await component.login();
    expect(component.busy).toBe(false);
    expect(component.message).toContain('Verifique sus credenciales');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('workshop_token')).toBeNull();
    expect(localStorage.getItem('workshop_user')).toBeNull();
  });
});