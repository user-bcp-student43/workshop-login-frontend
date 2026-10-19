export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface SessionUser {
  username?: string;
  displayName?: string;
}

export interface LoginResponse {
  token?: string;
  user?: SessionUser;
}