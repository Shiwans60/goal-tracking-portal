import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoalService } from '../../../core/services/goal.service';
import { AuthService } from '../../../core/services/auth.service';
import { Goal } from '../../../core/models/goal.model';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [
    RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressBarModule, MatCardModule,
    MatTooltipModule, MatTabsModule, MatSnackBarModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <h2>Goals</h2>
        <button mat-raised-button color="primary" routerLink="/goals/new">
          <mat-icon>add</mat-icon> New Goal
        </button>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <mat-tab-group>
        <!-- My Goals Tab -->
        <mat-tab label="My Goals">
          <div class="tab-content">
            <!-- Weightage summary -->
            <div class="summary-bar" [class.summary-ok]="totalWeightage() === 100"
                 [class.summary-warn]="totalWeightage() !== 100 && myGoals().length > 0">
              <mat-icon>{{ totalWeightage() === 100 ? 'check_circle' : 'warning' }}</mat-icon>
              <span>Total weightage: <strong>{{ totalWeightage() }}%</strong></span>
              @if (totalWeightage() !== 100 && myGoals().length > 0) {
                <span class="hint">· Must equal 100% to be complete</span>
              }
              <span class="spacer"></span>
              <span>{{ myGoals().length }}/8 goals</span>
            </div>

            <mat-card>
              <mat-card-content>
                <table mat-table [dataSource]="myGoals()">
                  <ng-container matColumnDef="title">
                    <th mat-header-cell *matHeaderCellDef>Goal Title</th>
                    <td mat-cell *matCellDef="let g">
                      <div class="goal-title">{{ g.title }}</div>
                      <div class="goal-sub">{{ g.thrustArea }}</div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="uomType">
                    <th mat-header-cell *matHeaderCellDef>UoM</th>
                    <td mat-cell *matCellDef="let g">{{ uomLabel(g.uomType) }}</td>
                  </ng-container>
                  <ng-container matColumnDef="weightage">
                    <th mat-header-cell *matHeaderCellDef>Weight</th>
                    <td mat-cell *matCellDef="let g">{{ g.weightage }}%</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let g">
                      <mat-chip [class]="statusClass(g.status)">{{ g.status | titlecase }}</mat-chip>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="locked">
                    <th mat-header-cell *matHeaderCellDef>Locked</th>
                    <td mat-cell *matCellDef="let g">
                      <mat-icon [matTooltip]="g.locked ? 'Approved & locked' : 'Editable'">
                        {{ g.locked ? 'lock' : 'lock_open' }}
                      </mat-icon>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let g">
                      @if (!g.locked && (g.status === 'DRAFT' || g.status === 'REWORK')) {
                        <button mat-icon-button [routerLink]="['/goals', g.id, 'edit']" matTooltip="Edit">
                          <mat-icon>edit</mat-icon>
                        </button>
                      }
                      @if (g.status === 'DRAFT' || g.status === 'REWORK') {
                        <button mat-icon-button color="primary"
                                matTooltip="Submit for manager approval"
                                (click)="submit(g.id)">
                          <mat-icon>send</mat-icon>
                        </button>
                      }
                      @if (g.status === 'DRAFT') {
                        <button mat-icon-button color="warn"
                                matTooltip="Delete this draft"
                                (click)="delete(g.id)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                      @if (g.status === 'REJECTED') {
                        <span class="rejection-note" [matTooltip]="g.rejectionNote ?? ''">
                          <mat-icon color="warn">info</mat-icon>
                        </span>
                      }
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="myColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: myColumns;"></tr>
                </table>

                @if (myGoals().length === 0 && !loading()) {
                  <div class="empty-state">
                    <mat-icon>flag</mat-icon>
                    <p>No goals yet for this cycle.</p>
                    <button mat-raised-button color="primary" routerLink="/goals/new">
                      <mat-icon>add</mat-icon> Create First Goal
                    </button>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Team Goals Tab (managers/admins only) -->
        @if (isManagerOrAdmin()) {
          <mat-tab label="Team Goals">
            <div class="tab-content">
              <div class="team-actions">
                <button mat-raised-button color="primary" routerLink="/goals/team">
                  <mat-icon>rate_review</mat-icon> Open Review Queue
                </button>
              </div>
              <mat-card>
                <mat-card-content>
                  <table mat-table [dataSource]="teamGoals()">
                    <ng-container matColumnDef="employee">
                      <th mat-header-cell *matHeaderCellDef>Employee</th>
                      <td mat-cell *matCellDef="let g">{{ g.employeeName }}</td>
                    </ng-container>
                    <ng-container matColumnDef="title">
                      <th mat-header-cell *matHeaderCellDef>Goal</th>
                      <td mat-cell *matCellDef="let g">
                        <div>{{ g.title }}</div>
                        <div class="goal-sub">{{ g.thrustArea }}</div>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="weightage">
                      <th mat-header-cell *matHeaderCellDef>Weight</th>
                      <td mat-cell *matCellDef="let g">{{ g.weightage }}%</td>
                    </ng-container>
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let g">
                        <mat-chip [class]="statusClass(g.status)">{{ g.status | titlecase }}</mat-chip>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="teamColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: teamColumns;"></tr>
                  </table>

                  @if (teamGoals().length === 0 && !loading()) {
                    <div class="empty-state">
                      <mat-icon>group</mat-icon>
                      <p>No team goals found. Direct reports may not have submitted yet.</p>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h2 { margin: 0; }

    .tab-content { padding: 16px 0; }

    .summary-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; border-radius: 8px;
      margin-bottom: 16px; font-size: 14px;
      background: #f5f5f5;
    }
    .summary-bar mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .summary-ok  { background: #e8f5e9; color: #2e7d32; }
    .summary-warn { background: #fff8e1; color: #f57f17; }
    .spacer { flex: 1; }
    .hint { color: #888; }

    table { width: 100%; }
    .goal-title { font-weight: 500; }
    .goal-sub { font-size: 12px; color: #888; }
    .rejection-note { cursor: default; display: inline-flex; align-items: center; }

    .chip-draft            { background: #e3f2fd; }
    .chip-pending_approval { background: #fff8e1; }
    .chip-approved         { background: #e8f5e9; }
    .chip-rejected         { background: #ffebee; }
    .chip-rework           { background: #ffe0b2; }

    .team-actions { display: flex; justify-content: flex-end; margin-bottom: 12px; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
  `]
})
export class GoalListComponent implements OnInit {
  private goalService = inject(GoalService);
  private auth        = inject(AuthService);
  private snack       = inject(MatSnackBar);

  myGoals   = signal<Goal[]>([]);
  teamGoals = signal<Goal[]>([]);
  loading   = signal(true);

  myColumns   = ['title', 'uomType', 'weightage', 'status', 'locked', 'actions'];
  teamColumns = ['employee', 'title', 'weightage', 'status'];

  isManagerOrAdmin = () => this.auth.hasRole('ROLE_MANAGER', 'ROLE_ADMIN');

  totalWeightage = () =>
    this.myGoals().reduce((sum, g) => sum + g.weightage, 0);

  ngOnInit() {
    this.goalService.getMyGoals().subscribe({
      next: data => { this.myGoals.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });

    if (this.isManagerOrAdmin()) {
      this.goalService.getTeamGoals().subscribe({
        next: data => this.teamGoals.set(data),
        error: ()   => {}
      });
    }
  }

  submit(id: string) {
    this.goalService.submitGoal(id).subscribe({
      next: updated => {
        this.myGoals.update(gs => gs.map(g => g.id === id ? updated : g));
        this.snack.open('Goal submitted for approval!', 'OK', { duration: 3000 });
      },
      error: (err) => this.snack.open(err?.error?.detail ?? 'Submit failed', 'Dismiss', { duration: 4000 })
    });
  }

  delete(id: string) {
    if (!confirm('Delete this draft goal?')) return;
    this.goalService.deleteGoal(id).subscribe({
      next: () => {
        this.myGoals.update(gs => gs.filter(g => g.id !== id));
        this.snack.open('Goal deleted', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Delete failed', 'Dismiss', { duration: 4000 })
    });
  }

  uomLabel(uom: string): string {
    const map: Record<string, string> = {
      NUMERIC_MIN: 'Numeric ↑', NUMERIC_MAX: 'Numeric ↓',
      PERCENTAGE_MIN: '% ↑', PERCENTAGE_MAX: '% ↓',
      TIMELINE: 'Timeline', ZERO_BASED: 'Zero-based'
    };
    return map[uom] ?? uom;
  }

  statusClass(status: string): string {
    return `chip-${status.toLowerCase()}`;
  }
}