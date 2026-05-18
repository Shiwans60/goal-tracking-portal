import { Component, inject, OnInit, signal, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { GoalService, ManagerEditGoalRequest } from '../../../core/services/goal.service';
import { Goal, GoalStatus } from '../../../core/models/goal.model';

// ── Note dialog (for reject/rework) ──────────────────────────────────────────

export interface NoteDialogData {
  title: string;
  placeholder: string;
  action: string;
  color: string;
}

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
      <button mat-raised-button [color]="data.color" [mat-dialog-close]="note"
              [disabled]="!note.trim()">
        {{ data.action }}
      </button>
    </mat-dialog-actions>
  `
})
export class NoteDialogComponent {
  note = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: NoteDialogData) {}
}

// ── Inline Edit Dialog (Phase 5) ──────────────────────────────────────────────

export interface InlineEditDialogData {
  goalTitle:    string;
  goalId:       string;
  currentTarget?:     number;
  currentTargetDate?: string;
  currentWeightage:   number;
  uomType:      string;
}

@Component({
  selector: 'app-inline-edit-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    FormsModule, ReactiveFormsModule, MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit Goal — Before Approval</h2>
    <mat-dialog-content>
      <p class="goal-title">{{ data.goalTitle }}</p>
      <p class="hint-text">You may adjust the target value, target date, and weightage.
        Goal title and thrust area remain as submitted.</p>

      <form [formGroup]="form" class="edit-form">

        @if (data.uomType !== 'ZERO_BASED' && data.uomType !== 'TIMELINE') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Target Value</mat-label>
            <input matInput type="number" formControlName="target" />
          </mat-form-field>
        }

        @if (data.uomType === 'TIMELINE') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Target / Deadline Date</mat-label>
            <input matInput [matDatepicker]="dp" formControlName="targetDate" />
            <mat-datepicker-toggle matSuffix [for]="dp" />
            <mat-datepicker #dp />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Weightage (%)</mat-label>
          <input matInput type="number" formControlName="weightage" />
          <mat-suffix>%</mat-suffix>
          <mat-error>Must be between 10% and 100%</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Manager Note (optional)</mat-label>
          <textarea matInput formControlName="note" rows="3"
                    placeholder="Explain the adjustment to the employee…"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="form.invalid"
              [mat-dialog-close]="buildPayload()">
        Save Edits
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .goal-title  { font-weight: 500; margin-bottom: 4px; }
    .hint-text   { font-size: 13px; color: #666; margin-bottom: 16px; }
    .edit-form   { display: flex; flex-direction: column; gap: 4px; }
    .full-width  { width: 100%; }
  `]
})
export class InlineEditDialogComponent {
  form = inject(FormBuilder).group({
    target:      [this.data.currentTarget ?? null as number | null],
    targetDate:  [this.data.currentTargetDate ? new Date(this.data.currentTargetDate) : null],
    weightage:   [this.data.currentWeightage, [Validators.required, Validators.min(10), Validators.max(100)]],
    note:        [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: InlineEditDialogData) {}

  buildPayload(): ManagerEditGoalRequest {
    const raw = this.form.getRawValue();
    const payload: ManagerEditGoalRequest = {};
    if (raw.target != null)    payload.target    = raw.target;
    if (raw.weightage != null) payload.weightage = raw.weightage;
    if (raw.targetDate) {
      payload.targetDate = (raw.targetDate as Date).toISOString().split('T')[0];
    }
    if (raw.note?.trim()) payload.note = raw.note;
    return payload;
  }
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
    MatInputModule, MatSnackBarModule, MatTabsModule,
    MatDividerModule, MatExpansionModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h2>Team Goal Review</h2>
          <p class="subtitle">
            @if (pendingGoals().length > 0) {
              <span class="pending-badge">{{ pendingGoals().length }}</span>
              goal{{ pendingGoals().length > 1 ? 's' : '' }} awaiting your approval
            } @else {
              All team goals reviewed ✅
            }
          </p>
        </div>
        <button mat-stroked-button routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon> Dashboard
        </button>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <mat-tab-group>

        <!-- ── Pending Approval Tab ─────────────────────────────────────── -->
        <mat-tab label="Pending Approval ({{ pendingGoals().length }})">
          <div class="tab-content">
            @if (pendingGoals().length === 0 && !loading()) {
              <div class="empty-state">
                <mat-icon>check_circle_outline</mat-icon>
                <p>No goals awaiting approval. ✅</p>
                <p class="hint">Once employees submit their goals, they'll appear here.</p>
              </div>
            }

            @for (goal of pendingGoals(); track goal.id) {
              <mat-card class="goal-card" [class.edited]="goal.id === lastEditedId()">
                <mat-card-header>
                  <mat-icon mat-card-avatar class="icon-pending">pending_actions</mat-icon>
                  <mat-card-title>{{ goal.title }}</mat-card-title>
                  <mat-card-subtitle>
                    <strong>{{ goal.employeeName }}</strong>
                    · {{ goal.thrustArea }}
                    · <span class="weight-badge">{{ goal.weightage }}%</span>
                    · {{ goal.cycleName }}
                  </mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  @if (goal.description) {
                    <p class="description">{{ goal.description }}</p>
                  }
                  <div class="meta-row">
                    <div class="meta-item">
                      <span class="meta-label">UoM</span>
                      <span>{{ uomLabel(goal.uomType) }}</span>
                    </div>
                    @if (goal.target != null) {
                      <div class="meta-item">
                        <span class="meta-label">Target</span>
                        <span>{{ goal.target }}</span>
                      </div>
                    }
                    @if (goal.targetDate) {
                      <div class="meta-item">
                        <span class="meta-label">Deadline</span>
                        <span>{{ goal.targetDate }}</span>
                      </div>
                    }
                  </div>

                  @if (goal.rejectionNote) {
                    <div class="manager-note">
                      <mat-icon>edit_note</mat-icon>
                      <span>Manager note: {{ goal.rejectionNote }}</span>
                    </div>
                  }
                </mat-card-content>

                <mat-card-actions class="card-actions">
                  <!-- Approve -->
                  <button mat-raised-button color="primary"
                          [disabled]="actionInProgress()"
                          matTooltip="Approve & lock this goal"
                          (click)="approve(goal)">
                    <mat-icon>check_circle</mat-icon> Approve
                  </button>

                  <!-- Inline Edit -->
                  <button mat-stroked-button color="accent"
                          [disabled]="actionInProgress()"
                          matTooltip="Edit target / weightage before approving"
                          (click)="openInlineEdit(goal)">
                    <mat-icon>tune</mat-icon> Edit &amp; Approve
                  </button>

                  <!-- Return for Rework -->
                  <button mat-stroked-button
                          [disabled]="actionInProgress()"
                          matTooltip="Return for employee to rework"
                          (click)="rework(goal)">
                    <mat-icon>undo</mat-icon> Return for Rework
                  </button>

                  <!-- Reject -->
                  <button mat-stroked-button color="warn"
                          [disabled]="actionInProgress()"
                          matTooltip="Reject this goal"
                          (click)="reject(goal)">
                    <mat-icon>cancel</mat-icon> Reject
                  </button>
                </mat-card-actions>
              </mat-card>
            }
          </div>
        </mat-tab>

        <!-- ── All Team Goals Tab ───────────────────────────────────────── -->
        <mat-tab label="All Team Goals">
          <div class="tab-content">
            <table mat-table [dataSource]="allGoals()">
              <ng-container matColumnDef="employee">
                <th mat-header-cell *matHeaderCellDef>Employee</th>
                <td mat-cell *matCellDef="let g">
                  <div class="emp-name">{{ g.employeeName }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Goal</th>
                <td mat-cell *matCellDef="let g">
                  <div class="goal-title-cell">{{ g.title }}</div>
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
                  <mat-chip [class]="statusClass(g.status)">{{ friendlyStatus(g.status) }}</mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Quick Action</th>
                <td mat-cell *matCellDef="let g">
                  @if (g.status === 'PENDING_APPROVAL') {
                    <button mat-icon-button color="primary" matTooltip="Approve"
                            (click)="approve(g)">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                    <button mat-icon-button matTooltip="Return for Rework"
                            (click)="rework(g)">
                      <mat-icon>undo</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="teamColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: teamColumns;"
                  [class.row-pending]="row.status === 'PENDING_APPROVAL'"></tr>
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
    .page-header { display: flex; justify-content: space-between; align-items: flex-start;
                   margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px;
                display: flex; align-items: center; gap: 6px; }
    .pending-badge {
      background: #e53935; color: white; border-radius: 50%;
      width: 24px; height: 24px; display: inline-flex;
      align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
    }

    .tab-content { padding: 16px 0; }

    /* Goal cards */
    .goal-card { margin-bottom: 16px; border-left: 4px solid #e0e0e0; }
    .goal-card.edited { border-left-color: #7c4dff; }
    .icon-pending { color: #f57c00; }

    .description { color: #555; font-size: 14px; margin-bottom: 12px; }
    .meta-row { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 8px; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 11px; text-transform: uppercase;
                  letter-spacing: .5px; color: #999; }
    .weight-badge { font-weight: 600; color: #1a237e; }

    .manager-note {
      display: flex; align-items: flex-start; gap: 6px;
      background: #fffde7; padding: 8px 12px; border-radius: 6px;
      font-size: 13px; color: #555; margin-top: 8px;
    }
    .manager-note mat-icon { font-size: 16px; color: #f9a825; margin-top: 1px; }

    .card-actions { display: flex; flex-wrap: wrap; gap: 8px;
                    padding: 8px 16px 16px; }

    /* Table */
    table { width: 100%; }
    .emp-name { font-weight: 500; }
    .goal-title-cell { font-weight: 500; }
    .goal-sub { font-size: 12px; color: #888; }
    .row-pending { background: #fffde7; }

    /* Status chips */
    .chip-draft            { background: #e3f2fd; }
    .chip-pending_approval { background: #fff9c4; color: #f57f17; }
    .chip-approved         { background: #e8f5e9; color: #2e7d32; }
    .chip-rejected         { background: #ffebee; color: #c62828; }
    .chip-rework           { background: #ffe0b2; color: #e65100; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
    .empty-state .hint { font-size: 13px; }
  `]
})
export class ManagerReviewComponent implements OnInit {
  private goalService    = inject(GoalService);
  private dialog         = inject(MatDialog);
  private snack          = inject(MatSnackBar);

  allGoals         = signal<Goal[]>([]);
  loading          = signal(true);
  actionInProgress = signal(false);
  lastEditedId     = signal<string | null>(null);

  teamColumns = ['employee', 'title', 'weightage', 'status', 'actions'];

  pendingGoals = () =>
    this.allGoals().filter(g => g.status === 'PENDING_APPROVAL');

  ngOnInit() { this.loadTeamGoals(); }

  loadTeamGoals() {
    this.loading.set(true);
    this.goalService.getTeamGoals().subscribe({
      next: goals => { this.allGoals.set(goals); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  approve(goal: Goal) {
    this.actionInProgress.set(true);
    this.goalService.approveGoal(goal.id).subscribe({
      next: updated => {
        this.updateGoal(updated);
        this.actionInProgress.set(false);
        this.snack.open(`✅ "${goal.title}" approved and locked`, 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.actionInProgress.set(false);
        this.snack.open(err?.error?.detail ?? 'Approve failed', 'Dismiss', { duration: 4000 });
      },
    });
  }

  openInlineEdit(goal: Goal) {
    const ref = this.dialog.open<InlineEditDialogComponent, InlineEditDialogData, ManagerEditGoalRequest | null>(
      InlineEditDialogComponent,
      {
        width: '460px',
        data: {
          goalTitle:          goal.title,
          goalId:             goal.id,
          currentTarget:      goal.target,
          currentTargetDate:  goal.targetDate,
          currentWeightage:   goal.weightage,
          uomType:            goal.uomType as string,
        },
      }
    );

    ref.afterClosed().subscribe((payload: ManagerEditGoalRequest | null | undefined) => {
      if (!payload) return;
      // First save the edit
      this.goalService.managerEditGoal(goal.id, payload).subscribe({
        next: edited => {
          this.updateGoal(edited);
          this.lastEditedId.set(edited.id);
          // Then approve the edited goal
          this.goalService.approveGoal(edited.id).subscribe({
            next: approved => {
              this.updateGoal(approved);
              this.lastEditedId.set(null);
              this.snack.open(
                `✅ "${goal.title}" edited and approved`,
                'OK', { duration: 4000 }
              );
            },
            error: () =>
              this.snack.open('Edit saved but approval failed — try approving manually', 'Dismiss', { duration: 5000 }),
          });
        },
        error: (err) =>
          this.snack.open(err?.error?.detail ?? 'Edit failed', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  rework(goal: Goal) {
    const ref = this.dialog.open<NoteDialogComponent, NoteDialogData, string | null>(
      NoteDialogComponent,
      {
        width: '420px',
        data: {
          title:       'Return for Rework',
          placeholder: 'Explain what needs to be changed…',
          action:      'Return for Rework',
          color:       'accent',
        },
      }
    );
    ref.afterClosed().subscribe((note: string | null | undefined) => {
      if (!note) return;
      this.goalService.returnForRework(goal.id, note).subscribe({
        next: updated => {
          this.updateGoal(updated);
          this.snack.open('Goal returned for rework', 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Action failed', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  reject(goal: Goal) {
    const ref = this.dialog.open<NoteDialogComponent, NoteDialogData, string | null>(
      NoteDialogComponent,
      {
        width: '420px',
        data: {
          title:       'Reject Goal',
          placeholder: 'Provide a reason for rejection…',
          action:      'Reject',
          color:       'warn',
        },
      }
    );
    ref.afterClosed().subscribe((note: string | null | undefined) => {
      if (!note) return;
      this.goalService.rejectGoal(goal.id, note).subscribe({
        next: updated => {
          this.updateGoal(updated);
          this.snack.open('Goal rejected', 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Action failed', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private updateGoal(updated: Goal) {
    this.allGoals.update(gs => gs.map(g => g.id === updated.id ? updated : g));
  }

  uomLabel(uom: string): string {
    const map: Record<string, string> = {
      NUMERIC_MIN:    'Numeric (Higher ↑)',
      NUMERIC_MAX:    'Numeric (Lower ↓)',
      PERCENTAGE_MIN: '% (Higher ↑)',
      PERCENTAGE_MAX: '% (Lower ↓)',
      TIMELINE:       'Timeline (Date)',
      ZERO_BASED:     'Zero-based',
    };
    return map[uom] ?? uom;
  }

  statusClass(status: GoalStatus): string {
    return `chip-${status.toLowerCase()}`;
  }

  friendlyStatus(status: GoalStatus): string {
    const map: Record<GoalStatus, string> = {
      DRAFT:            'Draft',
      PENDING_APPROVAL: 'Pending',
      APPROVED:         'Approved',
      REJECTED:         'Rejected',
      REWORK:           'Rework',
    };
    return map[status] ?? status;
  }
}