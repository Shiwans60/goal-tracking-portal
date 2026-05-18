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
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  CheckinService,
  GoalCheckinView,
  Quarter,
  GoalProgress,
  UpsertCheckinRequest,
  CheckinComment,
} from '../../../core/services/checkin.service';
import { AuthService } from '../../../core/services/auth.service';

// ── Log Achievement Dialog ────────────────────────────────────────────────────

export interface LogDialogData {
  goalTitle: string;
  goalId:    string;
  quarter:   Quarter;
  uomType:   string;
  target?:   number;
  existing?: GoalCheckinView;
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
            <mat-hint>Enter the actual value achieved this quarter</mat-hint>
          </mat-form-field>
        }

        @if (data.uomType === 'ZERO_BASED') {
          <div class="zero-based-info">
            <mat-icon>info</mat-icon>
            <span>Zero-based goal: Enter <strong>0</strong> if target was fully achieved (0 incidents, etc.),
              or the actual count if there were occurrences.</span>
          </div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Actual Count (0 = fully achieved)</mat-label>
            <input matInput type="number" formControlName="achievement" min="0" />
          </mat-form-field>
        }

        @if (data.uomType === 'TIMELINE') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Actual Completion Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="completionDate" />
            <mat-datepicker-toggle matSuffix [for]="picker" />
            <mat-datepicker #picker />
            <mat-hint>Date when the deliverable was actually completed</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Progress Status</mat-label>
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
        Save Achievement
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .goal-title  { font-weight: 500; margin-bottom: 4px; }
    .target-hint { font-size: 13px; color: #666; margin-bottom: 16px; }
    .dialog-form { display: flex; flex-direction: column; gap: 12px; }
    .full-width  { width: 100%; }
    .zero-based-info {
      display: flex; gap: 8px; align-items: flex-start;
      background: #e3f2fd; padding: 10px 12px; border-radius: 6px;
      font-size: 13px; color: #1565c0; margin-bottom: 4px;
    }
    .zero-based-info mat-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  `]
})
export class LogCheckinDialogComponent {
  form = inject(FormBuilder).group({
    achievement:    [this.data.existing?.achievement ?? null as number | null],
    completionDate: [
      this.data.existing?.completionDate
        ? new Date(this.data.existing.completionDate)
        : null
    ],
    progress: [
      this.data.existing?.hasCheckin ? this.data.existing.progress : 'NOT_STARTED' as GoalProgress,
      Validators.required
    ],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LogDialogData,
    public dialogRef: MatDialogRef<LogCheckinDialogComponent>,
  ) {}

  buildPayload(): UpsertCheckinRequest {
    const raw = this.form.getRawValue();
    const payload: UpsertCheckinRequest = { progress: raw.progress as GoalProgress };
    if (raw.achievement != null) payload.achievement = raw.achievement;
    if (raw.completionDate) {
      payload.completionDate = (raw.completionDate as Date).toISOString().split('T')[0];
    }
    return payload;
  }

  uomLabel(uom: string): string {
    const map: Record<string, string> = {
      NUMERIC_MIN:    'Numeric (Higher is Better)',
      NUMERIC_MAX:    'Numeric (Lower is Better)',
      PERCENTAGE_MIN: '% (Higher is Better)',
      PERCENTAGE_MAX: '% (Lower is Better)',
      TIMELINE:       'Timeline (Date-based)',
      ZERO_BASED:     'Zero-based (0 = 100% success)',
    };
    return map[uom] ?? uom;
  }
}

// ── Comment Panel ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-comment-panel-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            FormsModule, MatDividerModule],
  template: `
    <h2 mat-dialog-title>Check-in Comments</h2>
    <mat-dialog-content class="comments-content">
      <p class="goal-ref">{{ data.goalTitle }} — {{ data.quarter }}</p>

      <div class="comment-list">
        @for (c of comments(); track c.id) {
          <div class="comment-row">
            <div class="comment-avatar">{{ c.authorName[0].toUpperCase() }}</div>
            <div class="comment-body">
              <div class="comment-meta">
                <span class="comment-author">{{ c.authorName }}</span>
                <span class="comment-date">{{ c.createdAt | date:'mediumDate' }}</span>
              </div>
              <div class="comment-text">{{ c.comment }}</div>
            </div>
          </div>
        }
        @if (comments().length === 0) {
          <p class="no-comments">No comments yet. Be the first to add context.</p>
        }
      </div>

      <mat-divider style="margin: 16px 0" />

      <div class="add-comment-row">
        <mat-form-field appearance="outline" class="comment-field">
          <mat-label>Add a comment</mat-label>
          <textarea matInput [(ngModel)]="newComment" rows="2"
                    placeholder="Add context, observations, or action items…"></textarea>
        </mat-form-field>
        <button mat-raised-button color="primary"
                [disabled]="!newComment.trim() || saving()"
                (click)="submit()">
          Post
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .goal-ref { font-weight: 500; color: #666; margin-bottom: 12px; }
    .comment-list { max-height: 300px; overflow-y: auto; }
    .comment-row { display: flex; gap: 10px; margin-bottom: 12px; }
    .comment-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0;
    }
    .comment-body { flex: 1; }
    .comment-meta { display: flex; gap: 8px; align-items: baseline; margin-bottom: 2px; }
    .comment-author { font-weight: 600; font-size: 13px; }
    .comment-date { font-size: 11px; color: #888; }
    .comment-text { font-size: 14px; color: #333; }
    .no-comments { color: #999; text-align: center; padding: 24px 0; }
    .add-comment-row { display: flex; gap: 12px; align-items: flex-start; }
    .comment-field { flex: 1; }
  `]
})
export class CommentPanelDialogComponent implements OnInit {
  private checkinService = inject(CheckinService);
  comments = signal<CheckinComment[]>([]);
  newComment = '';
  saving = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    checkinId: string;
    goalTitle: string;
    quarter:   string;
  }) {}

  ngOnInit() {
    this.checkinService.getComments(this.data.checkinId).subscribe({
      next: cs => this.comments.set(cs),
      error: () => {},
    });
  }

  submit() {
    if (!this.newComment.trim()) return;
    this.saving.set(true);
    this.checkinService.addComment(this.data.checkinId, this.newComment).subscribe({
      next: c => {
        this.comments.update(list => [...list, c]);
        this.newComment = '';
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}

// Needed for ngOnInit in CommentPanelDialogComponent
import { OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

// ── Main Check-in List Component ─────────────────────────────────────────────

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
    MatSnackBarModule, MatDialogModule, MatTabsModule, MatDividerModule,
    MatExpansionModule,
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
            <mat-option value="Q1">Q1 — (Apr–Jun)</mat-option>
            <mat-option value="Q2">Q2 — (Jul–Sep)</mat-option>
            <mat-option value="Q3">Q3 — (Oct–Dec)</mat-option>
            <mat-option value="Q4">Q4 / Annual — (Jan–Mar)</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <!-- Summary chips -->
      @if (entries().length > 0) {
        <div class="summary-row">
          <mat-chip class="chip-checked">
            <mat-icon>check_circle</mat-icon>
            {{ checkedInCount() }} logged
          </mat-chip>
          <mat-chip class="chip-pending">
            <mat-icon>pending</mat-icon>
            {{ pendingCount() }} pending
          </mat-chip>
          @if (avgScore() != null) {
            <mat-chip class="chip-score">
              <mat-icon>trending_up</mat-icon>
              Avg score: {{ avgScore()! * 100 | number:'1.0-1' }}%
            </mat-chip>
          }
        </div>
      }

      <mat-tab-group>
        <!-- My goals tab -->
        <mat-tab label="My Goals ({{ entries().length }})">
          <div class="tab-content">
            <mat-card>
              <mat-card-content>
                <table mat-table [dataSource]="entries()">

                  <ng-container matColumnDef="goal">
                    <th mat-header-cell *matHeaderCellDef>Goal</th>
                    <td mat-cell *matCellDef="let e">
                      <div class="goal-title-cell">{{ e.goalTitle }}</div>
                      <div class="goal-sub">{{ e.thrustArea }}</div>
                      @if (e.isShared) {
                        <div class="shared-badge">
                          <mat-icon>share</mat-icon> Shared
                        </div>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="uom">
                    <th mat-header-cell *matHeaderCellDef>UoM / Target</th>
                    <td mat-cell *matCellDef="let e">
                      <div>{{ uomLabel(e.uomType) }}</div>
                      @if (e.target != null) {
                        <div class="goal-sub">Target: {{ e.target }}</div>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="weightage">
                    <th mat-header-cell *matHeaderCellDef>Wt%</th>
                    <td mat-cell *matCellDef="let e">{{ e.weightage }}%</td>
                  </ng-container>

                  <ng-container matColumnDef="achievement">
                    <th mat-header-cell *matHeaderCellDef>Achievement</th>
                    <td mat-cell *matCellDef="let e">
                      @if (e.hasCheckin) {
                        @if (e.achievement != null) { <span class="value-strong">{{ e.achievement }}</span> }
                        @else if (e.completionDate) { <span class="value-strong">{{ e.completionDate }}</span> }
                        @else { <span class="muted">Logged</span> }
                      } @else {
                        <span class="muted">—</span>
                      }
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
                        <div class="score-cell">
                          <strong>{{ e.progressScore * 100 | number:'1.0-1' }}%</strong>
                          <div class="score-bar">
                            <div class="score-fill"
                                 [style.width.%]="e.progressScore * 100"
                                 [class]="scoreBarClass(e.progressScore)">
                            </div>
                          </div>
                        </div>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let e">
                      <button mat-stroked-button color="primary"
                              (click)="openLogDialog(e)"
                              [matTooltip]="e.hasCheckin ? 'Update achievement' : 'Log achievement'">
                        <mat-icon>{{ e.hasCheckin ? 'edit' : 'add' }}</mat-icon>
                        {{ e.hasCheckin ? 'Update' : 'Log' }}
                      </button>
                      @if (e.hasCheckin && e.checkinId) {
                        <button mat-icon-button
                                (click)="openComments(e)"
                                matTooltip="View / add comments">
                          <mat-icon>chat_bubble_outline</mat-icon>
                        </button>
                      }
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="columns"></tr>
                  <tr mat-row *matRowDef="let row; columns: columns;"
                      [class.row-logged]="row.hasCheckin"
                      [class.row-at-risk]="row.progress === 'AT_RISK'">
                  </tr>
                </table>

                @if (entries().length === 0 && !loading()) {
                  <div class="empty-state">
                    <mat-icon>event_available</mat-icon>
                    <p>No approved goals found for this quarter.</p>
                    <p class="hint">Goals must be approved before check-ins can be logged.</p>
                    <button mat-stroked-button routerLink="/goals">
                      <mat-icon>flag</mat-icon> View Goals
                    </button>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Manager team view -->
        @if (isManagerOrAdmin()) {
          <mat-tab label="Team Check-ins">
            <div class="tab-content">
              @if (teamLoading()) { <mat-progress-bar mode="indeterminate" /> }
              <mat-card>
                <mat-card-content>
                  <table mat-table [dataSource]="teamEntries()">

                    <ng-container matColumnDef="employee">
                      <th mat-header-cell *matHeaderCellDef>Employee</th>
                      <td mat-cell *matCellDef="let e">{{ e.employeeName }}</td>
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
                      <td mat-cell *matCellDef="let e">
                        @if (e.hasCheckin && e.achievement != null) { {{ e.achievement }} }
                        @else if (e.hasCheckin && e.completionDate) { {{ e.completionDate }} }
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
                          {{ e.progressScore * 100 | number:'1.0-1' }}%
                        } @else { — }
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="teamColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: teamColumns;"
                        [class.row-logged]="row.hasCheckin"
                        [class.row-at-risk]="row.progress === 'AT_RISK'">
                    </tr>
                  </table>

                  @if (teamEntries().length === 0 && !teamLoading()) {
                    <div class="empty-state">
                      <mat-icon>group</mat-icon>
                      <p>No team check-ins for {{ selectedQuarter }} yet.</p>
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
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
    }
    h2 { margin: 0; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .quarter-select { width: 240px; }

    .summary-row {
      display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
    }
    .chip-checked  { background: #e8f5e9; }
    .chip-pending  { background: #fff8e1; }
    .chip-score    { background: #e3f2fd; }
    .summary-row mat-chip mat-icon { font-size: 16px; margin-right: 4px; }

    .tab-content { padding: 16px 0; }
    table { width: 100%; }

    .goal-title-cell { font-weight: 500; }
    .goal-sub { font-size: 12px; color: #888; }
    .shared-badge {
      display: inline-flex; align-items: center; gap: 2px;
      font-size: 11px; color: #7c4dff;
      background: #ede7f6; padding: 2px 6px; border-radius: 8px;
      margin-top: 2px;
    }
    .shared-badge mat-icon { font-size: 11px; }
    .muted { color: #aaa; }
    .value-strong { font-weight: 600; color: #1a237e; }

    .score-cell { display: flex; flex-direction: column; gap: 4px; }
    .score-bar { height: 4px; width: 60px; background: #e0e0e0; border-radius: 2px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 2px; transition: width .3s; }
    .score-fill.good   { background: #4caf50; }
    .score-fill.medium { background: #ff9800; }
    .score-fill.poor   { background: #f44336; }

    .row-logged   { background: #f9fff9; }
    .row-at-risk  { background: #fff5f5; }

    .chip-not_started { background: #eeeeee; }
    .chip-on_track    { background: #e8f5e9; color: #2e7d32; }
    .chip-completed   { background: #e3f2fd; color: #1565c0; }
    .chip-at_risk     { background: #ffebee; color: #c62828; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
    .empty-state .hint { font-size: 13px; }
  `]
})
export class CheckinListComponent implements OnInit {
  private checkinService = inject(CheckinService);
  private auth           = inject(AuthService);
  private dialog         = inject(MatDialog);
  private snack          = inject(MatSnackBar);

  entries     = signal<GoalCheckinView[]>([]);
  teamEntries = signal<GoalCheckinView[]>([]);
  loading     = signal(true);
  teamLoading = signal(false);

  selectedQuarter: Quarter = 'Q1';

  columns     = ['goal', 'uom', 'weightage', 'achievement', 'progress', 'score', 'actions'];
  teamColumns = ['employee', 'goal', 'target', 'achievement', 'progress', 'score'];

  isManagerOrAdmin = () => this.auth.hasRole('ROLE_MANAGER', 'ROLE_ADMIN');

  checkedInCount = () => this.entries().filter(e => e.hasCheckin).length;
  pendingCount   = () => this.entries().filter(e => !e.hasCheckin).length;
  avgScore = () => {
    const scored = this.entries().filter(e => e.progressScore != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((s, e) => s + (e.progressScore ?? 0), 0);
    return sum / scored.length;
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.checkinService.getGoalsWithCheckins(undefined, this.selectedQuarter).subscribe({
      next: data => { this.entries.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });

    if (this.isManagerOrAdmin()) {
      this.teamLoading.set(true);
      this.checkinService.getTeamGoalsWithCheckins(undefined, this.selectedQuarter).subscribe({
        next: data => { this.teamEntries.set(data); this.teamLoading.set(false); },
        error: ()   => this.teamLoading.set(false),
      });
    }
  }

  openLogDialog(entry: GoalCheckinView) {
    const ref = this.dialog.open<LogCheckinDialogComponent, LogDialogData, UpsertCheckinRequest | null>(
      LogCheckinDialogComponent,
      {
        width: '460px',
        data: {
          goalTitle: entry.goalTitle,
          goalId:    entry.goalId,
          quarter:   this.selectedQuarter,
          uomType:   entry.uomType as string,
          target:    entry.target,
          existing:  entry.hasCheckin ? entry : undefined,
        },
      }
    );

    ref.afterClosed().subscribe((payload: UpsertCheckinRequest | null | undefined) => {
      if (!payload) return;
      this.checkinService.upsertCheckin(entry.goalId, this.selectedQuarter, payload).subscribe({
        next: updated => {
          // Refresh the entries
          this.load();
          this.snack.open('Achievement logged!', 'OK', { duration: 3000 });
        },
        error: (err) => this.snack.open(
          err?.error?.detail ?? 'Failed to save achievement',
          'Dismiss', { duration: 4000 }),
      });
    });
  }

  openComments(entry: GoalCheckinView) {
    if (!entry.checkinId) return;
    this.dialog.open(CommentPanelDialogComponent, {
      width: '560px',
      data: {
        checkinId: entry.checkinId,
        goalTitle: entry.goalTitle,
        quarter:   this.selectedQuarter,
      },
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

  uomLabel(uom: string): string {
    const map: Record<string, string> = {
      NUMERIC_MIN:    'Numeric ↑',
      NUMERIC_MAX:    'Numeric ↓',
      PERCENTAGE_MIN: '% ↑',
      PERCENTAGE_MAX: '% ↓',
      TIMELINE:       'Timeline',
      ZERO_BASED:     'Zero-based',
    };
    return map[uom] ?? uom;
  }

  scoreBarClass(score: number): string {
    if (score >= 0.8) return 'good';
    if (score >= 0.5) return 'medium';
    return 'poor';
  }
}