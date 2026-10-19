import { describe, expect, it } from 'vitest';
import { formatTaskLabel } from './legacy-format';

describe('formatTaskLabel', () => {
  it('formats priority and owner', () => {
    expect(formatTaskLabel({ priority: 'high', owner: 'student' })).toBe('HIGH · STUDENT');
  });
  it.each([null, undefined])('handles missing data', (task) => {
    expect(formatTaskLabel(task)).toBe('SIN-DATOS');
  });
  it('keeps defaults for absent or false values', () => {
    expect(formatTaskLabel({})).toBe('NORMAL \u00b7 SIN-ASIGNAR');
    expect(formatTaskLabel({ priority: 0, owner: false })).toBe('NORMAL \u00b7 SIN-ASIGNAR');
  });
  it('converts truthy values to strings', () => {
    expect(formatTaskLabel({ priority: 2, owner: true })).toBe('2 \u00b7 TRUE');
  });
});
