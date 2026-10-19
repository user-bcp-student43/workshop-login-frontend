export function isBlankCredential(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}