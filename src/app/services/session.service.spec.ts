// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { SessionService } from './session.service';

beforeEach(() => localStorage.clear());

it('shares persisted session between instances and clears only session keys', () => {
  const session = new SessionService();
  session.save('fixture-token', { username: 'student', displayName: 'Student' }, session.getPreferences());
  const recovered = new SessionService();
  expect(recovered.getToken()).toBe('fixture-token');
  expect(recovered.getUser()).toEqual({ username: 'student', displayName: 'Student' });
  recovered.clear();
  expect(session.getToken()).toBeNull();
  expect(session.getUser()).toEqual({ username: undefined, displayName: undefined });
  expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
});

it.each(['null', '42', 'false', '"text"'])('narrows non-object stored user %s to an empty user', stored => {
  localStorage.setItem('workshop_user', stored);
  expect(new SessionService().getUser()).toEqual({});
});

it('does not fabricate a username or display name from invalid field types', () => {
  localStorage.setItem('workshop_user', '{"username":42,"displayName":false}');
  expect(new SessionService().getUser()).toEqual({ username: undefined, displayName: undefined });
});

it('regression: persists an absent optional user as valid empty JSON', () => {
  const session = new SessionService();
  session.save('fixture-token', undefined, session.getPreferences());
  expect(localStorage.getItem('workshop_user')).toBe('{}');
  expect(session.getUser()).toEqual({ username: undefined, displayName: undefined });
});

it('keeps default values, false, extra and nested preference properties', () => {
  const session = new SessionService();
  const defaults = { theme: 'light', compact: false, showTips: true };
  expect(session.getPreferences()).toEqual(defaults);
  localStorage.setItem('workshop_preferences', '{"showTips":false,"extra":{"level":2}}');
  expect(session.getPreferences()).toEqual({ ...defaults, showTips: false, extra: { level: 2 } });
  localStorage.setItem('workshop_preferences', '{bad');
  expect(session.getPreferences()).toEqual(defaults);
});

it('preserves the characterized failure for malformed stored user JSON', () => {
  localStorage.setItem('workshop_user', '{bad');
  expect(() => new SessionService().getUser()).toThrow(SyntaxError);
});