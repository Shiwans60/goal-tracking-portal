import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SharedGoalService, CreateSharedGoalRequest } from '../../../core/services/shared-goal.service';
import { UserService, AdminUserResponse } from '../../../core/services/user.service';
import { UomType } from '../../../core/models/goal.model';
import { environment } from '../../../../environments/environment';

interface Cycle { id: string; name: string; status: string; }

const UOM_OPTIONS: { value: UomType; label: string }[] = [
  { value: 'NUMERIC_MIN',    label: 'Numeric — Higher is Better' },
  { value: 'NUMERIC_MAX',    label: 'Numeric — Lower is Better' },
  { value: 'PERCENTAGE_MIN', label: '% — Higher is Better' },
  { value: 'PERCENTAGE_MAX', label: '% — Lower is Better' },
  { value: 'TIMELINE',       label: 'Timeline (Date-based)' },
  { value: 'ZERO_BASED',     label: 'Zero-based' },
];

const THRUST_AREAS = [
  'Revenue Growth', 'Customer Experience', 'Operational Excellence',
  'People & Culture', 'Innovation', 'Risk & Compliance', 'Digital Transformation', 'Other',
];

@Component({
  selector: 'app-assign-shared-goal',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatCheckboxModule, MatDatepickerModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, MatStepperModule, MatProgressBarModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <button mat-icon-button routerLink="/shared-goals"><mat-icon>arrow_back</mat-icon></button>
        <div>
          <h2>Push Shared Goal</h2>
          <p class="subtitle">Create a departmental KPI and assign it to multiple employees</p>
        </div>
      </div>

      <mat-stepper linear #stepper>

        <!-- ── Step 1: Goal Definition ───────────────────────────── -->
        <mat-step [stepControl]="goalForm" label="Goal Definition">
          <form [formGroup]="goalForm">
            <div class="step-content">
              <div class="form-grid">

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Performance Cycle</mat-label>
                  <mat-select formControlName="cycleId">
                    @for (c of cycles(); track c.id) {
                      <mat-option [value]="c.id">{{ c.name }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Cycle is required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Thrust Area</mat-label>
                  <mat-select formControlName="thrustArea">
                    @for (a of thrustAreas; track a) {
                      <mat-option [value]="a">{{ a }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Default Weightage (%)</mat-label>
                  <input matInput type="number" formControlName="defaultWeightage" />
                  <mat-suffix>%</mat-suffix>
                  <mat-hint>Applied to all recipients by default (they can adjust)</mat-hint>
                  <mat-error>Min 10%</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Goal Title</mat-label>
                  <input matInput formControlName="title"
                         placeholder="e.g. Increase department NPS by 15 points" />
                  <mat-hint>Recipients cannot change this</mat-hint>
                  <mat-error>Required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description (optional)</mat-label>
                  <textarea matInput formControlName="description" rows="3"
                            placeholder="Context, measurement methodology, acceptance criteria…"></textarea>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Unit of Measurement</mat-label>
                  <mat-select formControlName="uomType">
                    @for (opt of uomOptions; track opt.value) {
                      <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>Recipients cannot change this</mat-hint>
                  <mat-error>Required</mat-error>
                </mat-form-field>

                @if (selectedUom() !== 'ZERO_BASED' && selectedUom() !== 'TIMELINE') {
                  <mat-form-field appearance="outline">
                    <mat-label>Target Value</mat-label>
                    <input matInput type="number" formControlName="target" />
                    <mat-hint>Recipients cannot change this</mat-hint>
                  </mat-form-field>
                }

                @if (selectedUom() === 'TIMELINE') {
                  <mat-form-field appearance="outline">
                    <mat-label>Target / Deadline Date</mat-label>
                    <input matInput [matDatepicker]="dp" formControlName="targetDate" />
                    <mat-datepicker-toggle matSuffix [for]="dp" />
                    <mat-datepicker #dp />
                  </mat-form-field>
                }

              </div>

              <div class="step-actions">
                <button mat-raised-button color="primary"
                        matStepperNext
                        [disabled]="goalForm.invalid">
                  Next: Select Recipients
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </div>
          </form>
        </mat-step>

        <!-- ── Step 2: Recipient Selection ───────────────────────── -->
        <mat-step label="Select Recipients">
          <div class="step-content">
            <p class="section-hint">
              Select the employees who will receive this goal.
              Recipients may only adjust the weightage.
            </p>

            @if (loadingUsers()) {
              <mat-progress-bar mode="indeterminate" />
            } @else {
              <div class="recipient-grid">
                @for (user of employees(); track user.id) {
                  <div class="recipient-row"
                       [class.selected]="selectedIds().has(user.id)"
                       (click)="toggleRecipient(user.id)">
                    <mat-checkbox
                      [checked]="selectedIds().has(user.id)"
                      (click)="$event.stopPropagation()"
                      (change)="toggleRecipient(user.id)"
                      color="primary">
                    </mat-checkbox>
                    <div class="user-avatar">{{ user.name[0].toUpperCase() }}</div>
                    <div class="user-info-col">
                      <div class="user-name">{{ user.name }}</div>
                      <div class="user-sub">{{ user.email }}</div>
                      @if (user.department) {
                        <div class="user-sub">{{ user.department }}</div>
                      }
                    </div>
                    @if (user.managerName) {
                      <div class="mgr-badge">Mgr: {{ user.managerName }}</div>
                    }
                  </div>
                }
              </div>

              @if (employees().length === 0) {
                <div class="empty-state">
                  <mat-icon>people_outline</mat-icon>
                  <p>No employees found.</p>
                </div>
              }
            }

            <div class="selected-summary">
              <mat-icon>group</mat-icon>
              <span>{{ selectedIds().size }} recipient{{ selectedIds().size !== 1 ? 's' : '' }} selected</span>
            </div>

            <div class="step-actions">
              <button mat-stroked-button matStepperPrevious>
                <mat-icon>chevron_left</mat-icon> Back
              </button>
              <button mat-raised-button color="primary"
                      matStepperNext
                      [disabled]="selectedIds().size === 0">
                Review & Confirm
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        </mat-step>

        <!-- ── Step 3: Review & Confirm ───────────────────────────── -->
        <mat-step label="Review & Push">
          <div class="step-content">
            <div class="review-card">
              <h3>Goal Summary</h3>
              <div class="review-row">
                <span class="review-label">Cycle</span>
                <span>{{ cycleNameById(goalForm.value.cycleId) }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Thrust Area</span>
                <span>{{ goalForm.value.thrustArea }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Title</span>
                <span>{{ goalForm.value.title }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">UoM</span>
                <span>{{ goalForm.value.uomType }}</span>
              </div>
              @if (goalForm.value.target != null) {
                <div class="review-row">
                  <span class="review-label">Target</span>
                  <span>{{ goalForm.value.target }}</span>
                </div>
              }
              <div class="review-row">
                <span class="review-label">Default Weightage</span>
                <span>{{ goalForm.value.defaultWeightage }}%</span>
              </div>
            </div>

            <mat-divider class="my-16" />

            <h3>Recipients ({{ selectedIds().size }})</h3>
            <div class="chip-row">
              @for (id of selectedIds(); track id) {
                <div class="recipient-chip">
                  <mat-icon>person</mat-icon>
                  {{ employeeNameById(id) }}
                </div>
              }
            </div>

            <div class="step-actions">
              <button mat-stroked-button matStepperPrevious>
                <mat-icon>chevron_left</mat-icon> Back
              </button>
              <button mat-raised-button color="primary"
                      [disabled]="saving()"
                      (click)="assign()">
                @if (saving()) { <mat-spinner diameter="18" /> }
                <mat-icon>send</mat-icon>
                Push to {{ selectedIds().size }} Employee{{ selectedIds().size !== 1 ? 's' : '' }}
              </button>
            </div>
          </div>
        </mat-step>

      </mat-stepper>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; max-width: 860px; margin: auto; }
    .page-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 24px; }
    h2 { margin: 0; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }

    .step-content { padding: 24px 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .full-width { grid-column: span 2; }
    .step-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }

    .section-hint { color: #666; font-size: 14px; margin-bottom: 16px; }

    .recipient-grid { display: flex; flex-direction: column; gap: 4px;
                      max-height: 400px; overflow-y: auto; margin-bottom: 12px; }
    .recipient-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: 8px; cursor: pointer;
      border: 1px solid #e0e0e0; transition: background .15s;
    }
    .recipient-row:hover  { background: #f5f5f5; }
    .recipient-row.selected { background: #e8eaf6; border-color: #3f51b5; }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; flex-shrink: 0; font-size: 14px;
    }
    .user-info-col { flex: 1; }
    .user-name { font-weight: 500; }
    .user-sub  { font-size: 12px; color: #888; }
    .mgr-badge { font-size: 11px; color: #666; }

    .selected-summary {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; color: #1a237e; font-weight: 500;
    }

    .review-card { background: #f9f9f9; border-radius: 8px; padding: 20px; }
    h3 { margin: 0 0 12px; }
    .review-row { display: flex; gap: 16px; padding: 6px 0; }
    .review-label { font-weight: 500; width: 140px; flex-shrink: 0; color: #555; }

    .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .recipient-chip {
      display: flex; align-items: center; gap: 4px;
      background: #e8eaf6; padding: 6px 12px; border-radius: 16px; font-size: 13px;
    }
    .recipient-chip mat-icon { font-size: 14px; color: #3f51b5; }

    .my-16 { margin: 16px 0; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: span 1; }
    }
  `],
})
export class AssignSharedGoalComponent implements OnInit {
  private fb            = inject(FormBuilder);
  private router        = inject(Router);
  private http          = inject(HttpClient);
  private sharedSvc     = inject(SharedGoalService);
  private userService   = inject(UserService);
  private snack         = inject(MatSnackBar);

  uomOptions  = UOM_OPTIONS;
  thrustAreas = THRUST_AREAS;

  cycles       = signal<Cycle[]>([]);
  employees    = signal<AdminUserResponse[]>([]);
  selectedIds  = signal<Set<string>>(new Set());
  saving       = signal(false);
  loadingUsers = signal(true);
  selectedUom  = signal<UomType | null>(null);

  goalForm = this.fb.group({
    cycleId:          ['', Validators.required],
    thrustArea:       ['', Validators.required],
    title:            ['', [Validators.required, Validators.maxLength(500)]],
    description:      [''],
    uomType:          ['' as UomType, Validators.required],
    target:           [null as number | null],
    targetDate:       [null as Date | null],
    defaultWeightage: [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]],
  });

  ngOnInit() {
    this.goalForm.get('uomType')!.valueChanges.subscribe(v =>
      this.selectedUom.set(v as UomType)
    );

    this.http.get<Cycle[]>(`${environment.apiBaseUrl}/api/admin/cycles/all`).subscribe({
      next: cs => {
        const active = cs.filter(c => c.status === 'ACTIVE');
        this.cycles.set(active.length ? active : cs);
        if (active.length === 1) this.goalForm.patchValue({ cycleId: active[0].id });
      },
      error: () => {},
    });

    this.userService.getAllUsers().subscribe({
      next: users => {
        this.employees.set(users.filter(u => u.active && u.role !== 'ROLE_ADMIN'));
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  toggleRecipient(id: string) {
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  assign() {
    if (this.goalForm.invalid || this.selectedIds().size === 0) return;
    this.saving.set(true);

    const raw = this.goalForm.getRawValue();
    const payload: CreateSharedGoalRequest = {
      cycleId:          raw.cycleId!,
      thrustArea:       raw.thrustArea!,
      title:            raw.title!,
      description:      raw.description ?? undefined,
      uomType:          raw.uomType as UomType,
      target:           raw.target ?? undefined,
      targetDate:       raw.targetDate
        ? (raw.targetDate instanceof Date
            ? (raw.targetDate as Date).toISOString().split('T')[0]
            : raw.targetDate as string)
        : undefined,
      defaultWeightage: raw.defaultWeightage!,
      recipientIds:     [...this.selectedIds()],
    };

    this.sharedSvc.createAndAssign(payload).subscribe({
      next: res => {
        this.snack.open(
          `✅ Shared goal pushed to ${res.recipientCount} employee${res.recipientCount !== 1 ? 's' : ''}`,
          'OK', { duration: 4000 },
        );
        this.router.navigate(['/shared-goals']);
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(
          err?.error?.detail ?? 'Failed to push shared goal.',
          'Dismiss', { duration: 5000 },
        );
      },
    });
  }

  cycleNameById(id: string | null | undefined): string {
    return this.cycles().find(c => c.id === id)?.name ?? id ?? '—';
  }

  employeeNameById(id: string): string {
    return this.employees().find(u => u.id === id)?.name ?? id;
  }
}