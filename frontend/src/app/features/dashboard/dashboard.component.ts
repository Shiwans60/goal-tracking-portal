import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/services/auth.service';
import { GoalService } from '../../core/services/goal.service';
import { Goal } from '../../core/models/goal.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, MatCardModule, MatIconModule,
    MatButtonModule, MatProgressBarModule, MatChipsModule
  ],
  template: `
    <div class="dashboard-wrapper">
      <div class="welcome-banner">
        <div class="welcome-text">
          <h2>Welcome back, {{ auth.currentUser()?.name?.split(' ')[0] }}! 👋</h2>
          <p class="subtitle">Here's a snapshot of your goal progress this cycle.</p>
        </div>
        <button mat-raised-button color="accent" routerLink="/goals/new">
          <mat-icon>add</mat-icon> New Goal
        </button>
      </div>

      <!-- Stats row -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ stats().total }}</div>
            <div class="stat-label">Total Goals</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card approved">
          <mat-card-content>
            <div class="stat-value">{{ stats().approved }}</div>
            <div class="stat-label">Approved</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card pending">
          <mat-card-content>
            <div class="stat-value">{{ stats().pending }}</div>
            <div class="stat-label">Pending Approval</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card weight">
          <mat-card-content>
            <div class="stat-value">{{ stats().weightage }}%</div>
            <div class="stat-label">Total Weightage</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Quick links -->
      <h3 class="section-title">Quick Actions</h3>
      <div class="card-grid">
        <mat-card class="action-card" routerLink="/goals">
          <mat-card-header>
            <mat-icon mat-card-avatar class="icon-goals">flag</mat-icon>
            <mat-card-title>My Goals</mat-card-title>
            <mat-card-subtitle>Create, edit & submit your goal sheet</mat-card-subtitle>
          </mat-card-header>
        </mat-card>

        <mat-card class="action-card" routerLink="/checkins">
          <mat-card-header>
            <mat-icon mat-card-avatar class="icon-checkin">event_available</mat-icon>
            <mat-card-title>Quarterly Check-ins</mat-card-title>
            <mat-card-subtitle>Log your quarterly achievements</mat-card-subtitle>
          </mat-card-header>
        </mat-card>

        <mat-card class="action-card" routerLink="/reports">
          <mat-card-header>
            <mat-icon mat-card-avatar class="icon-reports">bar_chart</mat-icon>
            <mat-card-title>Reports</mat-card-title>
            <mat-card-subtitle>Achievement reports & Excel export</mat-card-subtitle>
          </mat-card-header>
        </mat-card>

        @if (isManagerOrAdmin()) {
          <mat-card class="action-card" routerLink="/goals" [queryParams]="{ view: 'team' }">
            <mat-card-header>
              <mat-icon mat-card-avatar class="icon-team">group</mat-icon>
              <mat-card-title>Team Goals</mat-card-title>
              <mat-card-subtitle>Review & approve your team's goals</mat-card-subtitle>
            </mat-card-header>
          </mat-card>
        }

        @if (isAdmin()) {
          <mat-card class="action-card" routerLink="/admin">
            <mat-card-header>
              <mat-icon mat-card-avatar class="icon-admin">admin_panel_settings</mat-icon>
              <mat-card-title>Admin Panel</mat-card-title>
              <mat-card-subtitle>Manage cycles, users & org hierarchy</mat-card-subtitle>
            </mat-card-header>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper { padding: 24px; max-width: 1200px; margin: auto; }

    .welcome-banner {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    }
    h2 { margin: 0; font-size: 1.5rem; }
    .subtitle { margin: 4px 0 0; color: #666; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card mat-card-content { padding: 20px 16px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #1a237e; }
    .stat-label { font-size: 13px; color: #666; margin-top: 4px; }
    .stat-card.approved .stat-value { color: #2e7d32; }
    .stat-card.pending  .stat-value { color: #f57f17; }
    .stat-card.weight   .stat-value { color: #6a1b9a; }

    .section-title { margin: 0 0 16px; font-size: 1rem; color: #555; font-weight: 500; }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    .action-card { cursor: pointer; transition: box-shadow .2s; }
    .action-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.15); }

    .icon-goals   { color: #1a237e; }
    .icon-checkin { color: #2e7d32; }
    .icon-reports { color: #e65100; }
    .icon-team    { color: #6a1b9a; }
    .icon-admin   { color: #b71c1c; }
    mat-icon[mat-card-avatar] { font-size: 32px; }
  `]
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private goalService = inject(GoalService);

  stats = signal({ total: 0, approved: 0, pending: 0, weightage: 0 });

  isAdmin         = () => this.auth.hasRole('ROLE_ADMIN');
  isManagerOrAdmin = () => this.auth.hasRole('ROLE_ADMIN', 'ROLE_MANAGER');

  ngOnInit() {
    this.goalService.getMyGoals().subscribe({
      next: goals => {
        this.stats.set({
          total: goals.length,
          approved: goals.filter(g => g.status === 'APPROVED').length,
          pending: goals.filter(g => g.status === 'PENDING_APPROVAL').length,
          weightage: goals.reduce((s, g) => s + g.weightage, 0)
        });
      },
      error: () => {}
    });
  }
}