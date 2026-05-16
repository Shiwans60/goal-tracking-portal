import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="dashboard-wrapper">
      <header class="top-bar">
        <span class="brand">⚡ AtomQuest</span>
        <span class="user-info">{{ auth.currentUser()?.name }} · {{ auth.currentUser()?.role }}</span>
        <button mat-stroked-button (click)="auth.logout()">Logout</button>
      </header>

      <main class="content">
        <h2>Welcome, {{ auth.currentUser()?.name }}!</h2>
        <div class="card-grid">
          <mat-card routerLink="/goals">
            <mat-card-header>
              <mat-icon mat-card-avatar>flag</mat-icon>
              <mat-card-title>My Goals</mat-card-title>
              <mat-card-subtitle>Create & track your goal sheet</mat-card-subtitle>
            </mat-card-header>
          </mat-card>

          <mat-card routerLink="/checkins">
            <mat-card-header>
              <mat-icon mat-card-avatar>event_available</mat-icon>
              <mat-card-title>Check-ins</mat-card-title>
              <mat-card-subtitle>Log quarterly achievements</mat-card-subtitle>
            </mat-card-header>
          </mat-card>

          <mat-card routerLink="/reports">
            <mat-card-header>
              <mat-icon mat-card-avatar>bar_chart</mat-icon>
              <mat-card-title>Reports</mat-card-title>
              <mat-card-subtitle>Achievement & completion reports</mat-card-subtitle>
            </mat-card-header>
          </mat-card>

          @if (isAdmin()) {
            <mat-card routerLink="/admin">
              <mat-card-header>
                <mat-icon mat-card-avatar>admin_panel_settings</mat-icon>
                <mat-card-title>Admin</mat-card-title>
                <mat-card-subtitle>Cycle & org management</mat-card-subtitle>
              </mat-card-header>
            </mat-card>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-wrapper { min-height: 100vh; background: #f5f5f5; }
    .top-bar {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 24px; background: #1a237e; color: white;
    }
    .brand { font-size: 1.25rem; font-weight: 700; flex: 1; }
    .content { padding: 32px 24px; }
    h2 { margin: 0 0 24px; }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    mat-card { cursor: pointer; transition: box-shadow .2s; }
    mat-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.15); }
    mat-icon[mat-card-avatar] { font-size: 32px; color: #1a237e; }
  `]
})
export class DashboardComponent {
  auth = inject(AuthService);
  isAdmin = () => this.auth.hasRole('ROLE_ADMIN');
}
