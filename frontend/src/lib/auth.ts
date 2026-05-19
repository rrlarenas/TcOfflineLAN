import type { User } from '../types';

const TOKEN_KEY = 'trakcare_token';
const USER_KEY = 'trakcare_user';

export interface StoredUser {
  username: string;
  role: string;
}

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getAuthHeader(): string | null {
    const token = this.getToken();
    if (!token) return null;
    return `Bearer ${token}`;
  },

  getUser(): StoredUser | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  setUser(user: StoredUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  updateUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify({ username: user.username, role: user.role }));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  logout(): void {
    this.removeToken();
    this.removeUser();
    sessionStorage.clear();
  }
};
