import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <h1>AtomQuest</h1>
            <p class="subtitle">Goal Setting & Tracking Portal</p>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <button mat-raised-button color="primary" class="google-btn" (click)="loginWithGoogle()">
            <mat-icon>login</mat-icon>
            Sign in with Google
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
    }
    .login-card {
      width: 380px;
      padding: 32px;
      text-align: center;
    }
    h1 { font-size: 2rem; margin: 0; color: #1a237e; }
    .subtitle { color: #666; margin-top: 8px; }
    .google-btn { width: 100%; margin-top: 24px; gap: 8px; }
  `]
})
export class LoginComponent {
  loginWithGoogle() {
    // Phase 2: Wire Google OAuth2 flow
    console.log('Google OAuth2 login — implemented in Phase 2');
  }
}
