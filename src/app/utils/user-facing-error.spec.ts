import { expect, it } from 'vitest';
import { userFacingError } from './user-facing-error';

it.each([null, undefined, {}, new Error('private detail'), { response: { data: { detail: '<b>private</b>' } } }])(
  'returns local context-specific messages without leaking error details', failure => {
    expect(userFacingError(failure, 'login')).toBe('Verifique sus credenciales o intente nuevamente.');
    expect(userFacingError(failure, 'tasks')).toBe('No se pudo cargar el dashboard');
  }
);