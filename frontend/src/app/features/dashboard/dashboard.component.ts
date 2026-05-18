import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth.service';
import { GoalService } from '../../core/services/goal.service';
import { Goal } from '../../core/models/goal.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, MatCardModule, MatIconModule,
    MatButtonModule, MatProgressBarModule, MatChipsModule, MatBadgeModule
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

        <!-- Phase 5: Manager pending-to-review badge -->
        @if (isManagerOrAdmin() && pendingApprovals() > 0) {
          <mat-card class="stat-card review-alert">
            <mat-card-content>
              <div class="stat-value warn">{{ pendingApprovals() }}</div>
              <div class="stat-label">Awaiting Your Review</div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Pending approval alert banner -->
      @if (isManagerOrAdmin() && pendingApprovals() > 0) {
        <div class="alert-banner">
          <mat-icon>notification_important</mat-icon>
          <span>
            <strong>{{ pendingApprovals() }} goal{{ pendingApprovals() > 1 ? 's' : '' }}</strong>
            from your team {{ pendingApprovals() > 1 ? 'are' : 'is' }} awaiting your approval.
          </span>
          <button mat-stroked-button routerLink="/goals/team" class="review-btn">
            <mat-icon>rate_review</mat-icon> Review Now
          </button>
        </div>
      }

      <!-- Quick links -->
      <h3 class="section-title">Quick Actions</h3>
      <div class="card-grid">
        <mat-card class="action-card" routerLink="/goals">
          <mat-card-header>
            <mat-icon mat-card-avatar class="icon-goals">flag</mat-icon>
            <mat-card-title>My Goals</mat-card-title>
            <mat-card-subtitle>Create, edit &amp; submit your goal sheet</mat-card-subtitle>
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
            <mat-card-subtitle>Achievement reports &amp; Excel export</mat-card-subtitle>
          </mat-card-header>
        </mat-card>

        @if (isManagerOrAdmin()) {
          <mat-card class="action-card" routerLink="/goals/team">
            <mat-card-header>
              <div class="icon-wrap">
                <mat-icon mat-card-avatar class="icon-team">rate_review</mat-icon>
                @if (pendingApprovals() > 0) {
                  <span class="badge-dot">{{ pendingApprovals() }}</span>
                }
              </div>
              <mat-card-title>Team Review Queue</mat-card-title>
              <mat-card-subtitle>
                @if (pendingApprovals() > 0) {
                  {{ pendingApprovals() }} goal{{ pendingApprovals() > 1 ? 's' : '' }} pending approval
                } @else {
                  Review &amp; approve your team's goals
                }
              </mat-card-subtitle>
            </mat-card-header>
          </mat-card>
        }

        @if (isAdmin()) {
          <mat-card class="action-card" routerLink="/admin">
            <mat-card-header>
              <mat-icon mat-card-avatar class="icon-admin">admin_panel_settings</mat-icon>
              <mat-card-title>Admin Panel</mat-card-title>
              <mat-card-subtitle>Manage cycles, users &amp; org hierarchy</mat-card-subtitle>
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
      margin-bottom: 16px;
    }
    .stat-card mat-card-content { padding: 20px 16px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #1a237e; }
    .stat-value.warn { color: #e65100; }
    .stat-label { font-size: 13px; color: #666; margin-top: 4px; }
    .stat-card.approved .stat-value { color: #2e7d32; }
    .stat-card.pending  .stat-value { color: #f57f17; }
    .stat-card.weight   .stat-value { color: #6a1b9a; }
    .stat-card.review-alert { border: 2px solid #ff6d00; }

    /* Alert banner */
    .alert-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px; border-radius: 8px;
      background: #fff3e0; border: 1px solid #ff6d00;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .alert-banner mat-icon { color: #e65100; }
    .alert-banner span { flex: 1; font-size: 14px; }
    .review-btn { flex-shrink: 0; }

    .section-title { margin: 0 0 16px; font-size: 1rem; color: #555; font-weight: 500; }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    .action-card { cursor: pointer; transition: box-shadow .2s; }
    .action-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.15); }

    .icon-wrap { position: relative; display: inline-block; }
    .badge-dot {
      position: absolute; top: -6px; right: -8px;
      background: #e53935; color: white;
      border-radius: 50%; width: 20px; height: 20px;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

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

  stats            = signal({ total: 0, approved: 0, pending: 0, weightage: 0 });
  pendingApprovals = signal<number>(0);

  isAdmin          = () => this.auth.hasRole('ROLE_ADMIN');
  isManagerOrAdmin = () => this.auth.hasRole('ROLE_ADMIN', 'ROLE_MANAGER');

  ngOnInit() {
    // Load own goal stats
    this.goalService.getMyGoals().subscribe({
      next: goals => {
        this.stats.set({
          total:    goals.length,
          approved: goals.filter(g => g.status === 'APPROVED').length,
          pending:  goals.filter(g => g.status === 'PENDING_APPROVAL').length,
          weightage: goals.reduce((s, g) => s + g.weightage, 0),
        });
      },
      error: () => {},
    });

    // Phase 5: load pending approval count for managers
    if (this.isManagerOrAdmin()) {
      this.goalService.getTeamPendingCount().subscribe({
        next: res => this.pendingApprovals.set(res.count),
        error: () => {},
      });
    }
  }
}