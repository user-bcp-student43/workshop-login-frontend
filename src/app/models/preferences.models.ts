export interface Preferences {
  theme: unknown;
  showTips: unknown;
  compact: unknown;
  [key: string]: unknown;
}

export function defaultPreferences(): Preferences {
  return { theme: 'light', showTips: true, compact: false };
}