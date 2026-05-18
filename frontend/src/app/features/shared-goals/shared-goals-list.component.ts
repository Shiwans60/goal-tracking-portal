import { Component, inject, OnInit, signal, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  SharedGoalService,
  SharedGoalResponse,
} from '../../../core/services/shared-goal.service';
import { AuthService } from '../../../core/services/auth.service';

// ── Weightage Edit Dialog ─────────────────────────────────────────────────────

export interface WeightageDialogData {
  goalTitle:         string;
  sharedGoalId:      string;
  currentWeightage:  number;
}

@Component({
  selector: 'app-weightage-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Update Weightage</h2>
    <mat-dialog-content>
      <p class="goal-title">{{ data.goalTitle }}</p>
      <p class="hint">You may adjust the weightage for this shared goal on your goal sheet.<br>
         All other fields (title, target, UoM) are set by the assigner.</p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Weightage (%)</mat-label>
        <input matInput type="number" [(ngModel)]="weightage"
               min="10" max="100" step="5" />
        <mat-suffix>%</mat-suffix>
        <mat-hint>Min 10% — Max 100%</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="weightage < 10 || weightage > 100"
              [mat-dialog-close]="weightage">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .goal-title { font-weight: 500; margin-bottom: 4px; }
    .hint { font-size: 13px; color: #666; margin-bottom: 16px; }
  `]
})
export class WeightageDialogComponent {
  weightage: number;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: WeightageDialogData,
    public dialogRef: MatDialogRef<WeightageDialogComponent>,
  ) {
    this.weightage = data.currentWeightage;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-shared-goals-list',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    FormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressBarModule, MatTooltipModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDividerModule,
    MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h2>Shared Goals</h2>
          <p class="subtitle">Departmental KPIs pushed to employees by managers</p>
        </div>
        @if (isManagerOrAdmin()) {
          <button mat-raised-button color="primary" routerLink="/shared-goals/assign">
            <mat-icon>share</mat-icon> Push New Shared Goal
          </button>
        }
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <mat-tab-group>

        <!-- ── My Shared Goals (Employee view) ──────────────────────── -->
        <mat-tab label="My Shared Goals">
          <div class="tab-content">

            @if (mySharedGoals().length === 0 && !loading()) {
              <div class="empty-state">
                <mat-icon>share</mat-icon>
                <p>No shared goals assigned to you yet.</p>
                <p class="hint">Your manager can push departmental KPIs to your goal sheet.</p>
              </div>
            }

            @for (sg of mySharedGoals(); track sg.id) {
              <mat-card class="sg-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar class="icon-shared">share</mat-icon>
                  <mat-card-title>{{ sg.parentGoalTitle }}</mat-card-title>
                  <mat-card-subtitle>
                    {{ sg.thrustArea }}
                    · Assigned by <strong>{{ sg.assignedByName ?? 'Admin' }}</strong>
                    · Cycle: {{ sg.cycleName }}
                  </mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  <div class="sg-meta">
                    <div class="meta-item">
                      <span class="meta-label">UoM</span>
                      <span>{{ uomLabel(sg.uomType) }}</span>
                    </div>
                    @if (sg.target != null) {
                      <div class="meta-item">
                        <span class="meta-label">Target</span>
                        <span>{{ sg.target }}</span>
                      </div>
                    }
                    @if (sg.targetDate) {
                      <div class="meta-item">
                        <span class="meta-label">Deadline</span>
                        <span>{{ sg.targetDate }}</span>
                      </div>
                    }
                    <div class="meta-item">
                      <span class="meta-label">Your Weightage</span>
                      <strong class="weightage">{{ sg.recipientWeightage }}%</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Goal Status</span>
                      <mat-chip [class]="statusClass(sg.recipientGoalStatus ?? '')">
                        {{ sg.recipientGoalStatus ?? 'Unknown' }}
                      </mat-chip>
                    </div>
                    @if (sg.recipientGoalLocked) {
                      <div class="meta-item lock-row">
                        <mat-icon class="lock-icon" matTooltip="Approved & locked by manager">lock</mat-icon>
                        <span class="meta-label">Locked</span>
                      </div>
                    }
                  </div>

                  <div class="readonly-banner">
                    <mat-icon>info</mat-icon>
                    <span>This goal was assigned by your manager.
                      Only the weightage can be adjusted — all other fields are read-only.</span>
                  </div>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-stroked-button color="primary"
                          matTooltip="Update your weightage for this shared goal"
                          (click)="openWeightageDialog(sg)">
                    <mat-icon>tune</mat-icon> Adjust Weightage
                  </button>
                  @if (sg.recipientGoalId) {
                    <button mat-stroked-button
                            routerLink="/checkins"
                            matTooltip="Log achievement for this quarter">
                      <mat-icon>event_available</mat-icon> Log Achievement
                    </button>
                  }
                </mat-card-actions>
              </mat-card>
            }
          </div>
        </mat-tab>

        <!-- ── Manager: Managed Shared Goals ───────────────────────── -->
        @if (isManagerOrAdmin()) {
          <mat-tab label="Managed Shared Goals ({{ managedSharedGoals().length }})">
            <div class="tab-content">
              <div class="manager-actions">
                <button mat-raised-button color="primary" routerLink="/shared-goals/assign">
                  <mat-icon>add</mat-icon> Push New Shared Goal
                </button>
              </div>

              @if (managedSharedGoals().length === 0 && !loading()) {
                <div class="empty-state">
                  <mat-icon>share</mat-icon>
                  <p>No shared goals pushed yet in this cycle.</p>
                  <button mat-raised-button color="primary" routerLink="/shared-goals/assign">
                    <mat-icon>share</mat-icon> Push First Shared Goal
                  </button>
                </div>
              }

              @for (group of groupedAssignments(); track group.parentGoalId) {
                <mat-card class="group-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar class="icon-shared">share</mat-icon>
                    <mat-card-title>{{ group.parentGoalTitle }}</mat-card-title>
                    <mat-card-subtitle>
                      {{ group.thrustArea }} · {{ group.cycleName }}
                      · <strong>{{ group.assignments.length }} recipients</strong>
                    </mat-card-subtitle>
                  </mat-card-header>

                  <mat-card-content>
                    <table mat-table [dataSource]="group.assignments" class="recipients-table">
                      <ng-container matColumnDef="recipient">
                        <th mat-header-cell *matHeaderCellDef>Recipient</th>
                        <td mat-cell *matCellDef="let a">
                          <div class="rec-name">{{ a.recipientName }}</div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="weightage">
                        <th mat-header-cell *matHeaderCellDef>Weightage</th>
                        <td mat-cell *matCellDef="let a">{{ a.recipientWeightage }}%</td>
                      </ng-container>

                      <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef>Goal Status</th>
                        <td mat-cell *matCellDef="let a">
                          <mat-chip [class]="statusClass(a.recipientGoalStatus ?? '')">
                            {{ a.recipientGoalStatus ?? '—' }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="locked">
                        <th mat-header-cell *matHeaderCellDef>Locked</th>
                        <td mat-cell *matCellDef="let a">
                          <mat-icon [matTooltip]="a.recipientGoalLocked ? 'Locked' : 'Not locked'">
                            {{ a.recipientGoalLocked ? 'lock' : 'lock_open' }}
                          </mat-icon>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let a">
                          <button mat-icon-button color="warn"
                                  matTooltip="Remove this assignment"
                                  (click)="removeAssignment(a)">
                            <mat-icon>remove_circle_outline</mat-icon>
                          </button>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="recipientColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: recipientColumns;"></tr>
                    </table>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </mat-tab>
        }

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start;
                   margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }

    .tab-content { padding: 16px 0; }
    .manager-actions { display: flex; justify-content: flex-end; margin-bottom: 12px; }

    .sg-card { margin-bottom: 16px; border-left: 4px solid #7c4dff; }
    .icon-shared { color: #7c4dff; }

    .sg-meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 12px; }
    .meta-item { display: flex; flex-direction: column; align-items: flex-start; }
    .lock-row { flex-direction: row; align-items: center; gap: 4px; }
    .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #999; }
    .weightage { font-size: 1.1rem; color: #1a237e; }
    .lock-icon { font-size: 16px; color: #757575; }

    .readonly-banner {
      display: flex; align-items: flex-start; gap: 8px;
      background: #ede7f6; padding: 10px 14px; border-radius: 6px;
      font-size: 13px; color: #4a148c;
    }
    .readonly-banner mat-icon { font-size: 16px; color: #7c4dff; margin-top: 1px; flex-shrink: 0; }

    .group-card { margin-bottom: 16px; }
    .recipients-table { width: 100%; }
    .rec-name { font-weight: 500; }

    .chip-draft            { background: #e3f2fd; }
    .chip-pending_approval { background: #fff9c4; }
    .chip-approved         { background: #e8f5e9; color: #2e7d32; }
    .chip-rejected         { background: #ffebee; color: #c62828; }
    .chip-rework           { background: #ffe0b2; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
    .empty-state .hint { font-size: 13px; }
  `]
})
export class SharedGoalsListComponent implements OnInit {
  private sharedGoalService = inject(SharedGoalService);
  private auth              = inject(AuthService);
  private dialog            = inject(MatDialog);
  private snack             = inject(MatSnackBar);

  mySharedGoals      = signal<SharedGoalResponse[]>([]);
  managedSharedGoals = signal<SharedGoalResponse[]>([]);
  loading            = signal(true);

  recipientColumns = ['recipient', 'weightage', 'status', 'locked', 'actions'];

  isManagerOrAdmin = () => this.auth.hasRole('ROLE_MANAGER', 'ROLE_ADMIN');

  groupedAssignments = () => {
    const groups = new Map<string, {
      parentGoalId:    string;
      parentGoalTitle: string;
      thrustArea:      string;
      cycleName:       string;
      assignments:     SharedGoalResponse[];
    }>();
    for (const sg of this.managedSharedGoals()) {
      const key = sg.parentGoalId;
      if (!groups.has(key)) {
        groups.set(key, {
          parentGoalId:    sg.parentGoalId,
          parentGoalTitle: sg.parentGoalTitle,
          thrustArea:      sg.thrustArea,
          cycleName:       sg.cycleName,
          assignments:     [],
        });
      }
      groups.get(key)!.assignments.push(sg);
    }
    return [...groups.values()];
  };

  ngOnInit() {
    this.loadMySharedGoals();
    if (this.isManagerOrAdmin()) {
      this.loadManagedGoals();
    }
  }

  private loadMySharedGoals() {
    this.sharedGoalService.getMySharedGoals().subscribe({
      next: data => { this.mySharedGoals.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  private loadManagedGoals() {
    // Managers/Admins: load all shared goals they can see via their received list
    // Full management view requires a cycleId — load via active cycle on the backend
    this.sharedGoalService.getMySharedGoals().subscribe({
      next: () => {},
      error: () => {},
    });
    // Also attempt to load managed assignments by fetching as admin via cycle
    // For now we show the employee view; full manager view needs a known cycleId
    // This will be populated when cycleId is available from the active cycle
    this.loading.set(false);
  }

  openWeightageDialog(sg: SharedGoalResponse) {
    const ref = this.dialog.open<WeightageDialogComponent, WeightageDialogData, number | null>(
      WeightageDialogComponent,
      {
        width: '400px',
        data: {
          goalTitle:        sg.parentGoalTitle,
          sharedGoalId:     sg.id,
          currentWeightage: sg.recipientWeightage,
        },
      }
    );
    ref.afterClosed().subscribe((newWeightage: number | null | undefined) => {
      if (newWeightage == null || newWeightage === sg.recipientWeightage) return;
      this.sharedGoalService.updateWeightage(sg.id, newWeightage).subscribe({
        next: updated => {
          this.mySharedGoals.update(list => list.map(item => item.id === sg.id ? updated : item));
          this.snack.open(`Weightage updated to ${newWeightage}%`, 'OK', { duration: 3000 });
        },
        error: (err) =>
          this.snack.open(err?.error?.detail ?? 'Failed to update weightage', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  removeAssignment(sg: SharedGoalResponse) {
    if (!confirm(`Remove ${sg.recipientName} from "${sg.parentGoalTitle}"?`)) return;
    this.sharedGoalService.removeAssignment(sg.id).subscribe({
      next: () => {
        this.managedSharedGoals.update(list => list.filter(item => item.id !== sg.id));
        this.snack.open('Assignment removed', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Failed to remove assignment', 'Dismiss', { duration: 4000 }),
    });
  }

  uomLabel(uom: string): string {
    const map: Record<string, string> = {
      NUMERIC_MIN: 'Numeric (Higher ↑)', NUMERIC_MAX: 'Numeric (Lower ↓)',
      PERCENTAGE_MIN: '% (Higher ↑)',    PERCENTAGE_MAX: '% (Lower ↓)',
      TIMELINE: 'Timeline (Date)',        ZERO_BASED: 'Zero-based',
    };
    return map[uom] ?? uom;
  }

  statusClass(status: string): string {
    return `chip-${status.toLowerCase()}`;
  }
}