import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Inject } from '@angular/core';
import { GoalService } from '../../../core/services/goal.service';
import { Goal, GoalStatus } from '../../../core/models/goal.model';

// ── Note dialog (for reject/rework) ──────────────────────────────────────────
@Component({
  selector: 'app-note-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Note</mat-label>
        <textarea matInput [(ngModel)]="note" rows="4"
                  [placeholder]="data.placeholder"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button [color]="data.color" [mat-dialog-close]="note" [disabled]="!note.trim()">
        {{ data.action }}
      </button>
    </mat-dialog-actions>
  `
})
export class NoteDialogComponent {
  note = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    title: string; placeholder: string; action: string; color: string;
  }) {}
}

// ── Main Component ────────────────────────────────────────────────────────────
@Component({
  selector: 'app-manager-review',
  standalone: true,
  imports: [
    RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressBarModule, MatCardModule,
    MatTooltipModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatTabsModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <h2>Team Goal Review</h2>
        <span class="subtitle">{{ pendingGoals().length }} awaiting approval</span>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <mat-tab-group>
        <!-- Pending Approval Tab -->
        <mat-tab label="Pending Approval ({{ pendingGoals().length }})">
          <div class="tab-content">
            @if (pendingGoals().length === 0) {
              <div class="empty-state">
                <mat-icon>check_circle_outline</mat-icon>
                <p>No goals awaiting approval. ✅</p>
              </div>
            }
            @for (goal of pendingGoals(); track goal.id) {
              <mat-card class="goal-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>flag</mat-icon>
                  <mat-card-title>{{ goal.title }}</mat-card-title>
                  <mat-card-subtitle>
                    {{ goal.employeeName }} · {{ goal.thrustArea }} · {{ goal.weightage }}%
                  </mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  @if (goal.description) {
                    <p class="description">{{ goal.description }}</p>
                  }
                  <div class="meta-row">
                    <span><strong>UoM:</strong> {{ goal.uomType }}</span>
                    @if (goal.target != null) { <span><strong>Target:</strong> {{ goal.target }}</span> }
                    @if (goal.targetDate) { <span><strong>Deadline:</strong> {{ goal.targetDate }}</span> }
                    <span><strong>Cycle:</strong> {{ goal.cycleName }}</span>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-raised-button color="primary"
                          matTooltip="Approve & lock this goal"
                          (click)="approve(goal)">
                    <mat-icon>check</mat-icon> Approve
                  </button>
                  <button mat-stroked-button color="warn"
                          matTooltip="Return for employee to rework"
                          (click)="rework(goal)">
                    <mat-icon>edit</mat-icon> Return for Rework
                  </button>
                  <button mat-stroked-button
                          matTooltip="Reject this goal"
                          (click)="reject(goal)">
                    <mat-icon>close</mat-icon> Reject
                  </button>
                </mat-card-actions>
              </mat-card>
            }
          </div>
        </mat-tab>

        <!-- All Team Goals Tab -->
        <mat-tab label="All Team Goals">
          <div class="tab-content">
            <table mat-table [dataSource]="allGoals()">
              <ng-container matColumnDef="employee">
                <th mat-header-cell *matHeaderCellDef>Employee</th>
                <td mat-cell *matCellDef="let g">{{ g.employeeName }}</td>
              </ng-container>
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Goal</th>
                <td mat-cell *matCellDef="let g">
                  <div>{{ g.title }}</div>
                  <div class="sub">{{ g.thrustArea }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="weightage">
                <th mat-header-cell *matHeaderCellDef>Weight</th>
                <td mat-cell *matCellDef="let g">{{ g.weightage }}%</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let g">
                  <mat-chip [class]="statusClass(g.status)">{{ g.status }}</mat-chip>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="teamColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: teamColumns;"></tr>
            </table>
            @if (allGoals().length === 0 && !loading()) {
              <div class="empty-state">
                <mat-icon>flag</mat-icon>
                <p>No team goals found for the current cycle.</p>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
    h2 { margin: 0; }
    .subtitle { color: #666; font-size: 14px; }

    .tab-content { padding: 16px 0; }

    .goal-card { margin-bottom: 16px; }
    .goal-card mat-card-actions { display: flex; gap: 8px; padding: 8px 16px; }
    .description { color: #555; font-size: 14px; margin-bottom: 8px; }
    .meta-row { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #666; }

    table { width: 100%; }
    .sub { font-size: 12px; color: #888; }

    .chip-draft            { background: #e3f2fd; }
    .chip-pending_approval { background: #fff8e1; }
    .chip-approved         { background: #e8f5e9; }
    .chip-rejected         { background: #ffebee; }
    .chip-rework           { background: #ffe0b2; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
  `]
})
export class ManagerReviewComponent implements OnInit {
  private goalService = inject(GoalService);
  private dialog      = inject(MatDialog);
  private snack       = inject(MatSnackBar);

  allGoals     = signal<Goal[]>([]);
  loading      = signal(true);
  teamColumns  = ['employee', 'title', 'weightage', 'status'];

  pendingGoals = () =>
    this.allGoals().filter(g => g.status === 'PENDING_APPROVAL');

  ngOnInit() {
    this.goalService.getTeamGoals().subscribe({
      next: goals => { this.allGoals.set(goals); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  approve(goal: Goal) {
    this.goalService.approveGoal(goal.id).subscribe({
      next: updated => {
        this.allGoals.update(gs => gs.map(g => g.id === goal.id ? updated : g));
        this.snack.open('Goal approved and locked ✅', 'OK', { duration: 3000 });
      },
      error: (err) => this.snack.open(err?.error?.detail ?? 'Approve failed', 'Dismiss', { duration: 4000 })
    });
  }

  rework(goal: Goal) {
    const ref = this.dialog.open(NoteDialogComponent, {
      width: '420px',
      data: {
        title: 'Return for Rework',
        placeholder: 'Explain what needs to be changed…',
        action: 'Return for Rework',
        color: 'accent'
      }
    });
    ref.afterClosed().subscribe((note: string | null) => {
      if (!note) return;
      this.goalService.returnForRework(goal.id, note).subscribe({
        next: updated => {
          this.allGoals.update(gs => gs.map(g => g.id === goal.id ? updated : g));
          this.snack.open('Goal returned for rework', 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Action failed', 'Dismiss', { duration: 4000 })
      });
    });
  }

  reject(goal: Goal) {
    const ref = this.dialog.open(NoteDialogComponent, {
      width: '420px',
      data: {
        title: 'Reject Goal',
        placeholder: 'Provide a reason for rejection…',
        action: 'Reject',
        color: 'warn'
      }
    });
    ref.afterClosed().subscribe((note: string | null) => {
      if (!note) return;
      this.goalService.rejectGoal(goal.id, note).subscribe({
        next: updated => {
          this.allGoals.update(gs => gs.map(g => g.id === goal.id ? updated : g));
          this.snack.open('Goal rejected', 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Action failed', 'Dismiss', { duration: 4000 })
      });
    });
  }

  statusClass(status: GoalStatus): string {
    return `chip-${status.toLowerCase()}`;
  }
}