import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChangeDetectorRef, Injector, NgZone, runInInjectionContext, Type, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { LoginComponent } from '../app/login/login.component';
import { DashboardComponent } from '../app/dashboard/dashboard.component';
import { AuthService } from '../app/services/auth.service';
import { SessionService } from '../app/services/session.service';
import { TasksService } from '../app/services/tasks.service';

export function createRouter() {
  return { navigate: vi.fn().mockResolvedValue(true) };
}

export function createLogin(router = createRouter()) {
  const injector = Injector.create({ providers: [
    AuthService, SessionService, { provide: Router, useValue: router },
    { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } }
  ] });
  return runInInjectionContext(injector, () => new LoginComponent());
}

export function createDashboard(router = createRouter()) {
  const detector = { detectChanges: vi.fn() };
  const zone = { run: (operation: () => void) => operation() };
  const injector = Injector.create({ providers: [
    TasksService, SessionService, { provide: Router, useValue: router },
    { provide: ChangeDetectorRef, useValue: detector }, { provide: NgZone, useValue: zone }
  ] });
  return runInInjectionContext(injector, () => new DashboardComponent());
}

export function seedSession(user: object = { username: 'student' }) {
  localStorage.setItem('workshop_token', 'test-token');
  localStorage.setItem('workshop_user', JSON.stringify(user));
}

export function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export async function prepareComponentResources(): Promise<void> {
  await resolveComponentResources(resource => {
    const folder = resource.includes('login') ? 'login' : 'dashboard';
    return Promise.resolve(readFileSync(resolve('src/app', folder, resource), 'utf8'));
  });
}

async function createComponentFixture<ComponentType>(component: Type<ComponentType>) {
  await prepareComponentResources();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [{ provide: Router, useValue: createRouter() }]
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

export function createLoginFixture() {
  return createComponentFixture(LoginComponent);
}

export function createDashboardFixture() {
  return createComponentFixture(DashboardComponent);
}