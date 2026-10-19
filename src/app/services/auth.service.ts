import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.models';

const LOGIN_CLIENT = 'angular-workshop';
const LOGIN_TIMEOUT_MS = 5000;

export const AUTH_ROUTES = { login: '/login', dashboard: '/dashboard' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = { username, password, client: LOGIN_CLIENT };
    const response = await axios.post<LoginResponse>(environment.authUrl, request, { timeout: LOGIN_TIMEOUT_MS });
    return response.data;
  }
}