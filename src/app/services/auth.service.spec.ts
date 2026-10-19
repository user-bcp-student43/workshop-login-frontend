import axios from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('keeps the exact login URL, original credentials, client and timeout', async () => {
  const payload = { token: 'fixture-token', user: { username: 'student' } };
  vi.mocked(axios.post).mockResolvedValue({ data: payload });
  expect(await new AuthService().login(' student ', ' password ')).toBe(payload);
  expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/auth/login', {
    username: ' student ', password: ' password ', client: 'angular-workshop'
  }, { timeout: 5000 });
});

it('does not turn an HTTP failure into a successful response', async () => {
  const failure = { response: { status: 401, data: { message: 'fixture' } } };
  vi.mocked(axios.post).mockRejectedValue(failure);
  await expect(new AuthService().login('student', 'test')).rejects.toBe(failure);
});