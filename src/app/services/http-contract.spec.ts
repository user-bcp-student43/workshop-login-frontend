// @vitest-environment jsdom
import { createServer, Server } from 'node:http';
import axios from 'axios';
import { afterAll, beforeAll, expect, it } from 'vitest';

let server: Server;
let baseUrl: string;
const requests: { method?: string; url?: string; body: string; authorization?: string }[] = [];

beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    let body = '';
    request.on('data', chunk => { body += String(chunk); });
    request.on('end', () => {
      requests.push({ method: request.method, url: request.url, body, authorization: request.headers.authorization });
      response.setHeader('Content-Type', 'application/json');
      if (request.url === '/auth/login') {
        response.end(JSON.stringify({ token: 'fixture-token', user: { username: 'student' } }));
        return;
      }
      if (request.url === '/api/tasks?owner=student') {
        response.end(JSON.stringify([{ title: 'Task', status: 'TODO' }]));
        return;
      }
      response.writeHead(401).end(JSON.stringify({ detail: 'unauthorized fixture' }));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

it('uses the browser XHR adapter for JSON login, Bearer tasks and HTTP rejection', async () => {
  const client = axios.create({ adapter: 'xhr' });
  const login = await client.post(`${baseUrl}/auth/login`, {
    username: 'student', password: 'fixture-only', client: 'angular-workshop'
  }, { timeout: 5000 });
  expect(login.data.token).toBe('fixture-token');
  const tasks = await client.get(`${baseUrl}/api/tasks?owner=student`, {
    headers: { Authorization: 'Bearer ' + login.data.token }
  });
  expect(tasks.data).toEqual([{ title: 'Task', status: 'TODO' }]);
  expect(requests[0].method).toBe('POST');
  expect(requests[0].authorization).toBeUndefined();
  expect(JSON.parse(requests[0].body)).toEqual({
    username: 'student', password: 'fixture-only', client: 'angular-workshop'
  });
  expect(requests[1]).toMatchObject({ method: 'GET', url: '/api/tasks?owner=student', authorization: 'Bearer fixture-token' });
  await expect(client.get(`${baseUrl}/rejected`)).rejects.toMatchObject({ response: { status: 401 } });
});