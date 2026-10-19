import { Injectable } from '@angular/core';
import merge from 'lodash/merge';
import { SessionUser } from '../models/auth.models';
import { defaultPreferences, Preferences } from '../models/preferences.models';

const STORAGE_KEYS = {
  token: 'workshop_token',
  user: 'workshop_user',
  preferences: 'workshop_preferences'
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.token);
  }

  getUser(): SessionUser {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || '{}');
    if (typeof stored !== 'object' || stored === null) return {};
    return {
      username: 'username' in stored && typeof stored.username === 'string' ? stored.username : undefined,
      displayName: 'displayName' in stored && typeof stored.displayName === 'string' ? stored.displayName : undefined
    };
  }

  getPreferences(): Preferences {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences) || '{}');
      return merge(defaultPreferences(), stored);
    } catch {
      return defaultPreferences();
    }
  }

  save(token: string, user: SessionUser | undefined, preferences: Preferences): void {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user ?? {}));
    localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}