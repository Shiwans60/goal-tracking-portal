import { Component, inject, OnInit, signal, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  CheckinService,
  CheckinEntry,
  Quarter,
  GoalProgress,
  UpsertCheckinRequest,
} from '../../../core/services/checkin.service';
import { AuthService } from '../../../core/services/auth.service';

// ── Log Achievement Dialog ────────────────────────────────────────────────────

export interface LogDialogData {
  goalTitle: string;
  goalId:    string;
  quarter:   Quarter;
  uomType:   string;
  target?:   number;
  existing?: CheckinEntry;
}

@Component({
  selector: 'app-log-checkin-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, FormsModule, ReactiveFormsModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Log Achievement — {{ data.quarter }}</h2>
    <mat-dialog-content>
      <p class="goal-title">{{ data.goalTitle }}</p>
      <p class="target-hint">
        UoM: <strong>{{ uomLabel(data.uomType) }}</strong>
        @if (data.target != null) { · Target: <strong>{{ data.target }}</strong> }
      </p>

      <form [formGroup]="form" class="dialog-form">

        @if (data.uomType !== 'ZERO_BASED' && data.uomType !== 'TIMELINE') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Actual Achievement</mat-label>
            <input matInput type="number" formControlName="achievement" />
          </mat-form-field>
        }

        @if (data.uomType === 'TIMELINE') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Completion Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="completionDate" />
            <mat-datepicker-toggle matSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Status</mat-label>
          <mat-select formControlName="progress">
            <mat-option value="NOT_STARTED">Not Started</mat-option>
            <mat-option value="ON_TRACK">On Track</mat-option>
            <mat-option value="COMPLETED">Completed</mat-option>
            <mat-option value="AT_RISK">At Risk</mat-option>
          </mat-select>
          <mat-error>Status is required</mat-error>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="form.invalid"
              [mat-dialog-close]="buildPayload()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .goal-title  { font-weight: 500; margin-bottom: 4px; }
    .target-hint { font-size: 13px; color: #666; margin-bottom: 16px; }
    .dialog-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width  { width: 100%; }
  `]
})
export class LogCheckinDialogComponent {
  form = inject(FormBuilder).group({
    achievement:    [this.data.existing?.achievement ?? null as number | null],
    completionDate: [this.data.existing?.completionDate ? new Date(this.data.existing.completionDate) : null],
    progress:       [this.data.existing?.progress ?? 'NOT_STARTED' as GoalProgress, Validators.required],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LogDialogData,
    public dialogRef: MatDialogRef<LogCheckinDialogComponent>,
  ) {}

  buildPayload(): UpsertCheckinRequest {
    const raw = this.form.getRawValue();
    const payload: UpsertCheckinRequest = {
      progress: raw.progress as GoalProgress,
    };
    if (raw.achievement != null) payload.achievement = raw.achievement;
    if (raw.completionDate) {
      payload.completionDate = (raw.completionDate as Date).toISOString().split('T')[0];
    }
    return payload;
  }

  uomLabel(uom: string): string {
    const map: Record<string, string> = {
      NUMERIC_MIN: 'Numeric (Higher is Better)', NUMERIC_MAX: 'Numeric (Lower is Better)',
      PERCENTAGE_MIN: '% (Higher is Better)',   PERCENTAGE_MAX: '% (Lower is Better)',
      TIMELINE: 'Timeline (Date-based)',         ZERO_BASED: 'Zero-based (0 = Success)',
    };
    return map[uom] ?? uom;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-checkin-list',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    FormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, MatProgressBarModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h2>Quarterly Check-ins</h2>
          <p class="subtitle">Log your actual achievements against approved goals</p>
        </div>
        <mat-form-field appearance="outline" class="quarter-select">
          <mat-label>Quarter</mat-label>
          <mat-select [(ngModel)]="selectedQuarter" (ngModelChange)="load()">
            <mat-option value="Q1">Q1 — July Check-in</mat-option>
            <mat-option value="Q2">Q2 — October Check-in</mat-option>
            <mat-option value="Q3">Q3 — January Check-in</mat-option>
            <mat-option value="Q4">Q4 / Annual — March Check-in</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="entries()">

            <ng-container matColumnDef="goal">
              <th mat-header-cell *matHeaderCellDef>Goal</th>
              <td mat-cell *matCellDef="let e">
                <div class="goal-title">{{ e.goalTitle }}</div>
                <div class="goal-sub">{{ e.thrustArea }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="target">
              <th mat-header-cell *matHeaderCellDef>Target</th>
              <td mat-cell *matCellDef="let e">{{ e.target ?? '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="achievement">
              <th mat-header-cell *matHeaderCellDef>Achievement</th>
              <td mat-cell *matCellDef="let e">
                @if (e.achievement != null) { {{ e.achievement }} }
                @else if (e.completionDate) { {{ e.completionDate }} }
                @else { <span class="muted">—</span> }
              </td>
            </ng-container>

            <ng-container matColumnDef="progress">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let e">
                <mat-chip [class]="progressClass(e.progress)">
                  {{ progressLabel(e.progress) }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>Score</th>
              <td mat-cell *matCellDef="let e">
                @if (e.progressScore != null) {
                  <strong>{{ e.progressScore * 100 | number:'1.0-1' }}%</strong>
                } @else {
                  <span class="muted">—</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="weightage">
              <th mat-header-cell *matHeaderCellDef>Wt%</th>
              <td mat-cell *matCellDef="let e">{{ e.weightage }}%</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let e">
                <button mat-stroked-button color="primary"
                        (click)="openLogDialog(e)"
                        matTooltip="Log achievement for this quarter">
                  <mat-icon>edit</mat-icon>
                  {{ e.id ? 'Update' : 'Log' }}
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (entries().length === 0 && !loading()) {
            <div class="empty-state">
              <mat-icon>event_available</mat-icon>
              <p>No approved goals found for check-in.</p>
              <p class="hint">Goals must be approved before check-ins can be logged.</p>
              <button mat-stroked-button routerLink="/goals">
                <mat-icon>flag</mat-icon> View Goals
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Manager team view -->
      @if (isManagerOrAdmin()) {
        <div class="team-section">
          <h3>Team Check-ins</h3>
          <mat-card>
            <mat-card-content>
              <table mat-table [dataSource]="teamEntries()">

                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>Employee</th>
                  <td mat-cell *matCellDef="let e">{{ e.goalTitle }}</td>
                </ng-container>

                <ng-container matColumnDef="goal">
                  <th mat-header-cell *matHeaderCellDef>Goal</th>
                  <td mat-cell *matCellDef="let e">
                    <div>{{ e.goalTitle }}</div>
                    <div class="goal-sub">{{ e.thrustArea }}</div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="target">
                  <th mat-header-cell *matHeaderCellDef>Target</th>
                  <td mat-cell *matCellDef="let e">{{ e.target ?? '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="achievement">
                  <th mat-header-cell *matHeaderCellDef>Achievement</th>
                  <td mat-cell *matCellDef="let e">{{ e.achievement ?? '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="progress">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let e">
                    <mat-chip [class]="progressClass(e.progress)">
                      {{ progressLabel(e.progress) }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="score">
                  <th mat-header-cell *matHeaderCellDef>Score</th>
                  <td mat-cell *matCellDef="let e">
                    @if (e.progressScore != null) {
                      {{ e.progressScore * 100 | number:'1.0-1' }}%
                    } @else { — }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="teamColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: teamColumns;"></tr>
              </table>

              @if (teamEntries().length === 0 && !loading()) {
                <div class="empty-state">
                  <mat-icon>group</mat-icon>
                  <p>No team check-ins for this quarter yet.</p>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
    }
    h2 { margin: 0; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .quarter-select { width: 240px; }
    table { width: 100%; }
    .goal-title { font-weight: 500; }
    .goal-sub { font-size: 12px; color: #888; }
    .muted { color: #aaa; }

    .chip-not_started { background: #eeeeee; }
    .chip-on_track    { background: #e8f5e9; color: #2e7d32; }
    .chip-completed   { background: #e3f2fd; color: #1565c0; }
    .chip-at_risk     { background: #ffebee; color: #c62828; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
    .empty-state .hint { font-size: 13px; }

    .team-section { margin-top: 32px; }
    .team-section h3 { margin: 0 0 16px; }
  `]
})
export class CheckinListComponent implements OnInit {
  private checkinService = inject(CheckinService);
  private auth           = inject(AuthService);
  private dialog         = inject(MatDialog);
  private snack          = inject(MatSnackBar);

  entries     = signal<CheckinEntry[]>([]);
  teamEntries = signal<CheckinEntry[]>([]);
  loading     = signal(true);

  selectedQuarter: Quarter = 'Q1';

  columns     = ['goal', 'target', 'achievement', 'progress', 'score', 'weightage', 'actions'];
  teamColumns = ['goal', 'target', 'achievement', 'progress', 'score'];

  isManagerOrAdmin = () => this.auth.hasRole('ROLE_MANAGER', 'ROLE_ADMIN');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.checkinService.getMyCheckins(undefined, this.selectedQuarter).subscribe({
      next: data => { this.entries.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });

    if (this.isManagerOrAdmin()) {
      this.checkinService.getTeamCheckins(undefined, this.selectedQuarter).subscribe({
        next: data => this.teamEntries.set(data),
        error: ()   => {},
      });
    }
  }

  openLogDialog(entry: CheckinEntry) {
    const ref = this.dialog.open(LogCheckinDialogComponent, {
      width: '420px',
      data: {
        goalTitle: entry.goalTitle,
        goalId:    entry.goalId,
        quarter:   this.selectedQuarter,
        uomType:   entry.uomType,
        target:    entry.target,
        existing:  entry.id ? entry : undefined,
      } satisfies import('./checkin-list.component').LogDialogData,
    });

    ref.afterClosed().subscribe((payload: import('../../..').UpsertCheckinRequest | null) => {
      if (!payload) return;
      this.checkinService.upsertCheckin(entry.goalId, this.selectedQuarter, payload).subscribe({
        next: updated => {
          this.entries.update(es =>
            es.map(e => e.goalId === entry.goalId ? updated : e)
          );
          this.snack.open('Achievement logged!', 'OK', { duration: 3000 });
        },
        error: (err) => this.snack.open(
          err?.error?.detail ?? 'Failed to save',
          'Dismiss', { duration: 4000 }),
      });
    });
  }

  progressLabel(p: GoalProgress): string {
    const map: Record<GoalProgress, string> = {
      NOT_STARTED: 'Not Started',
      ON_TRACK:    'On Track',
      COMPLETED:   'Completed',
      AT_RISK:     'At Risk',
    };
    return map[p] ?? p;
  }

  progressClass(p: GoalProgress): string {
    return `chip-${p.toLowerCase()}`;
  }
}