type ErrorContext = 'login' | 'tasks';

export function userFacingError(_error: unknown, context: ErrorContext): string {
  return context === 'login'
    ? 'Verifique sus credenciales o intente nuevamente.'
    : 'No se pudo cargar el dashboard';
}