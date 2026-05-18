import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoalService } from '../../../core/services/goal.service';
import { UomType } from '../../../core/models/goal.model';
import { environment } from '../../../../environments/environment';

const UOM_OPTIONS: { value: UomType; label: string; hint: string }[] = [
  { value: 'NUMERIC_MIN', label: 'Numeric — Higher is Better',   hint: 'e.g. Sales Revenue' },
  { value: 'NUMERIC_MAX', label: 'Numeric — Lower is Better',    hint: 'e.g. TAT, Cost' },
  { value: 'PERCENTAGE_MIN', label: '% — Higher is Better',      hint: 'e.g. Customer Satisfaction' },
  { value: 'PERCENTAGE_MAX', label: '% — Lower is Better',       hint: 'e.g. Defect Rate' },
  { value: 'TIMELINE', label: 'Timeline (Date-based)',            hint: 'Completion vs Deadline' },
  { value: 'ZERO_BASED', label: 'Zero-based',                    hint: 'e.g. Safety Incidents' }
];

const THRUST_AREAS = [
  'Revenue Growth', 'Customer Experience', 'Operational Excellence',
  'People & Culture', 'Innovation', 'Risk & Compliance', 'Digital Transformation', 'Other'
];

interface Cycle { id: string; name: string; status: string; }

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <button mat-icon-button routerLink="/goals"><mat-icon>arrow_back</mat-icon></button>
        <h2>{{ isEdit() ? 'Edit Goal' : 'New Goal' }}</h2>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">

              <!-- Cycle (read-only in edit mode) -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Performance Cycle</mat-label>
                <mat-select formControlName="cycleId">
                  @for (c of cycles(); track c.id) {
                    <mat-option [value]="c.id">{{ c.name }}</mat-option>
                  }
                </mat-select>
                <mat-error>Cycle is required</mat-error>
                <mat-hint>Select the active performance cycle for this goal</mat-hint>
              </mat-form-field>

              <!-- Thrust Area -->
              <mat-form-field appearance="outline">
                <mat-label>Thrust Area</mat-label>
                <mat-select formControlName="thrustArea">
                  @for (area of thrustAreas; track area) {
                    <mat-option [value]="area">{{ area }}</mat-option>
                  }
                </mat-select>
                <mat-error>Thrust Area is required</mat-error>
              </mat-form-field>

              <!-- Weightage -->
              <mat-form-field appearance="outline">
                <mat-label>Weightage (%)</mat-label>
                <input matInput type="number" formControlName="weightage"
                       placeholder="Min 10%" />
                <mat-suffix>%</mat-suffix>
                <mat-hint>Min 10% · Max goals = 8 · Total must be 100%</mat-hint>
                <mat-error>Must be between 10% and 100%</mat-error>
              </mat-form-field>

              <!-- Title -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Goal Title</mat-label>
                <input matInput formControlName="title"
                       placeholder="Enter a clear, measurable goal title" />
                <mat-error>Goal title is required</mat-error>
              </mat-form-field>

              <!-- Description -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description (optional)</mat-label>
                <textarea matInput formControlName="description" rows="3"
                          placeholder="Provide context, scope, or acceptance criteria"></textarea>
              </mat-form-field>

              <!-- UoM Type -->
              <mat-form-field appearance="outline">
                <mat-label>Unit of Measurement</mat-label>
                <mat-select formControlName="uomType">
                  @for (opt of uomOptions; track opt.value) {
                    <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                  }
                </mat-select>
                <mat-hint>{{ selectedUomHint() }}</mat-hint>
                <mat-error>UoM is required</mat-error>
              </mat-form-field>

              <!-- Target Value (hidden for ZERO_BASED / TIMELINE) -->
              @if (selectedUom() !== 'ZERO_BASED' && selectedUom() !== 'TIMELINE') {
                <mat-form-field appearance="outline">
                  <mat-label>Target Value</mat-label>
                  <input matInput type="number" formControlName="target" />
                </mat-form-field>
              }

              <!-- Target Date (shown for TIMELINE) -->
              @if (selectedUom() === 'TIMELINE') {
                <mat-form-field appearance="outline">
                  <mat-label>Target / Deadline Date</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="targetDate" />
                  <mat-datepicker-toggle matSuffix [for]="picker" />
                  <mat-datepicker #picker />
                </mat-form-field>
              }

            </div><!-- /form-grid -->

            <div class="form-actions">
              <button mat-stroked-button type="button" routerLink="/goals">Cancel</button>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="18" /> }
                {{ isEdit() ? 'Save Changes' : 'Create Goal (Draft)' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; max-width: 820px; margin: auto; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    h2 { margin: 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { grid-column: span 2; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: span 1; }
    }
  `]
})
export class GoalFormComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private goalService = inject(GoalService);
  private http        = inject(HttpClient);
  private snack       = inject(MatSnackBar);

  uomOptions  = UOM_OPTIONS;
  thrustAreas = THRUST_AREAS;

  isEdit  = signal(false);
  saving  = signal(false);
  goalId  = signal<string | null>(null);
  cycles  = signal<Cycle[]>([]);

  selectedUom = signal<UomType | null>(null);
  selectedUomHint = () =>
    UOM_OPTIONS.find(o => o.value === this.selectedUom())?.hint ?? '';

  form = this.fb.group({
    cycleId:     ['', Validators.required],
    thrustArea:  ['', Validators.required],
    title:       ['', [Validators.required, Validators.maxLength(500)]],
    description: [''],
    uomType:     ['' as UomType, Validators.required],
    target:      [null as number | null],
    targetDate:  [null as Date | null],
    weightage:   [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]]
  });

  ngOnInit() {
    // Watch UoM changes for conditional fields
    this.form.get('uomType')!.valueChanges.subscribe(v => this.selectedUom.set(v as UomType));

    // Load available cycles (active + upcoming)
    this.http.get<Cycle[]>(`${environment.apiBaseUrl}/api/admin/cycles`).subscribe({
      next: cycles => {
        const active = cycles.filter(c => c.status === 'ACTIVE' || c.status === 'UPCOMING');
        this.cycles.set(active);
        // Pre-select active cycle if creating new
        if (!this.isEdit()) {
          const activeCycle = cycles.find(c => c.status === 'ACTIVE');
          if (activeCycle) this.form.patchValue({ cycleId: activeCycle.id });
        }
      },
      error: () => {
        // Fallback: try the active-cycle endpoint
        this.http.get<Cycle>(`${environment.apiBaseUrl}/api/admin/cycles/active`).subscribe({
          next: cycle => {
            this.cycles.set([cycle]);
            if (!this.isEdit()) this.form.patchValue({ cycleId: cycle.id });
          }
        });
      }
    });

    // If editing, load the existing goal
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.goalId.set(id);
      this.goalService.getGoalById(id).subscribe(g => {
        this.form.patchValue({
          cycleId:     g.cycleId,
          thrustArea:  g.thrustArea,
          title:       g.title,
          description: g.description ?? '',
          uomType:     g.uomType,
          target:      g.target ?? null,
          weightage:   g.weightage
        });
        // cycleId is locked when editing
        this.form.get('cycleId')!.disable();
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();

    // Format targetDate as ISO string if present
    const payload = {
      ...raw,
      targetDate: raw.targetDate
        ? (raw.targetDate as any instanceof Date
            ? (raw.targetDate as Date).toISOString().split('T')[0]
            : raw.targetDate)
        : null,
    };

    const obs = this.isEdit()
      ? this.goalService.updateGoal(this.goalId()!, payload as any)
      : this.goalService.createGoal(payload as any);

    obs.subscribe({
      next: () => {
        this.snack.open(
          this.isEdit() ? 'Goal updated!' : 'Goal created as Draft.',
          'OK', { duration: 3000 }
        );
        this.router.navigate(['/goals']);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.detail ?? err?.error?.message ?? 'Save failed. Please try again.';
        this.snack.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }
}