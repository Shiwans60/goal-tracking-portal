import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: object): void;
          renderButton(parent: HTMLElement, config: object): void;
          prompt(): void;
          disableAutoSelect(): void;
        };
      };
    };
    handleGoogleCredential?: (response: { credential: string }) => void;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <div class="logo">⚡</div>
            <h1>AtomQuest</h1>
            <p class="subtitle">Goal Setting &amp; Tracking Portal</p>
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (!loading) {
            <div id="google-btn-container" class="google-btn-wrap"></div>

            <div class="divider"><span>or</span></div>

            <button mat-raised-button color="primary" class="sign-in-btn"
                    (click)="triggerOneTap()">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                   alt="Google" class="g-logo" />
              Sign in with Google
            </button>
          } @else {
            <div class="spinner-wrap">
              <mat-spinner diameter="40" />
              <p>Signing you in…</p>
            </div>
          }
        </mat-card-content>

        <mat-card-footer>
          <p class="footer-note">Use your company Google account to continue.</p>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #283593 60%, #1565c0 100%);
    }
    .login-card {
      width: 380px; padding: 32px; text-align: center;
      border-radius: 12px !important;
    }
    .logo { font-size: 3rem; margin-bottom: 8px; }
    h1 { font-size: 1.8rem; margin: 0; color: #1a237e; font-weight: 700; }
    .subtitle { color: #666; margin: 8px 0 0; font-size: 0.9rem; }
    .google-btn-wrap {
      display: flex; justify-content: center; margin-top: 24px;
    }
    .divider {
      display: flex; align-items: center; gap: 12px;
      margin: 16px 0; color: #bbb; font-size: 12px;
    }
    .divider::before, .divider::after {
      content: ''; flex: 1; height: 1px; background: #e0e0e0;
    }
    .sign-in-btn { width: 100%; gap: 8px; height: 44px; }
    .g-logo { width: 18px; height: 18px; margin-right: 4px; vertical-align: middle; }
    .spinner-wrap {
      display: flex; flex-direction: column;
      align-items: center; gap: 16px; padding: 24px 0; color: #666;
    }
    .footer-note { font-size: 11px; color: #999; margin: 8px 0 0; padding: 8px 16px; }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  private auth   = inject(AuthService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private snack  = inject(MatSnackBar);
  private zone   = inject(NgZone);

  loading = false;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Show session-expired banner if redirected here by the interceptor
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'session_expired') {
      this.snack.open('Your session has expired. Please sign in again.', 'OK', {
        duration: 5000,
      });
    }

    this.loadGisScript().then(() => this.initGoogle());
  }

  ngOnDestroy(): void {
    // Clean up the global callback to avoid memory leaks
    delete window.handleGoogleCredential;
  }

  // ── Google Identity Services ─────────────────────────────────────────────

  private loadGisScript(): Promise<void> {
    return new Promise(resolve => {
      if (window.google?.accounts?.id) { resolve(); return; }
      const script = document.createElement('script');
      script.src   = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private initGoogle(): void {
    if (!window.google) return;

    // Global callback — GIS SDK calls this with the ID token
    window.handleGoogleCredential = (response: { credential: string }) => {
      this.zone.run(() => this.onCredential(response.credential));
    };

    window.google.accounts.id.initialize({
      client_id:           environment.googleClientId,
      callback:            'handleGoogleCredential',
      auto_select:         false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,   // disable FedCM to keep One Tap working broadly
    });

    const container = document.getElementById('google-btn-container');
    if (container) {
      window.google.accounts.id.renderButton(container, {
        theme:         'outline',
        size:          'large',
        width:         280,
        text:          'signin_with',
        shape:         'rectangular',
        logo_alignment: 'left',
      });
    }
  }

  triggerOneTap(): void {
    window.google?.accounts.id.prompt();
  }

  // ── Token exchange ────────────────────────────────────────────────────────

  private onCredential(idToken: string): void {
    this.loading = true;
    this.auth.loginWithGoogle(idToken).subscribe({
      next: res => {
        this.auth.handleAuthSuccess(res);
        // Component will be destroyed by the navigation; loading stays true
      },
      error: err => {
        this.loading = false;
        const msg =
          err?.error?.detail ??
          err?.error?.message ??
          'Login failed — please try again.';
        this.snack.open(msg, 'Dismiss', { duration: 6000 });
      },
    });
  }
}