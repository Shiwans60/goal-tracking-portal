import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'ROLE_EMPLOYEE' | 'ROLE_MANAGER' | 'ROLE_ADMIN';
}

export interface AuthResponse {
  token: string;
  user: User;
}

const TOKEN_KEY = 'aq_token';
const USER_KEY  = 'aq_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiBaseUrl;

  /** Reactive signal — inject & read anywhere with no boilerplate. */
  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  // ── Auth flows ───────────────────────────────────────────────────────────

  /**
   * Exchange a Google ID token (from GIS One Tap / button) for an AtomQuest JWT.
   * Returns the full AuthResponse observable — caller decides what to do next.
   */
  loginWithGoogle(idToken: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/google`, { idToken });
  }

  /** Call after a successful loginWithGoogle() to persist and navigate. */
  handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.currentUser.set(response.user);
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  // ── Token helpers ─────────────────────────────────────────────────────────

  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    // Reject obviously expired tokens to avoid wasted API calls
    if (this.isTokenExpired(token)) {
      this.clearStorage();
      return null;
    }
    return token;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private clearStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  /**
   * Decode the JWT payload (no signature verification — server does that).
   * Returns true if the `exp` claim is in the past.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true; // Treat malformed tokens as expired
    }
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}