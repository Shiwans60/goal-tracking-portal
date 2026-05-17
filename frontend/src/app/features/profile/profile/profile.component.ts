import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { UserService, UserProfile } from '../../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatListModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <button mat-icon-button routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2>My Profile</h2>
      </div>

      @if (loading()) {
        <div class="spinner-center"><mat-spinner diameter="48" /></div>
      } @else if (profile()) {
        <div class="profile-grid">

          <!-- ── Identity card ── -->
          <mat-card class="identity-card">
            <mat-card-content>
              <div class="avatar-row">
                @if (profile()!.picture) {
                  <img [src]="profile()!.picture" class="avatar" alt="Profile photo" />
                } @else {
                  <div class="avatar-placeholder">
                    {{ profile()!.name[0].toUpperCase() }}
                  </div>
                }
                <div>
                  <h3>{{ profile()!.name }}</h3>
                  <p class="email">{{ profile()!.email }}</p>
                  <mat-chip [class]="roleClass(profile()!.role)">
                    {{ friendlyRole(profile()!.role) }}
                  </mat-chip>
                </div>
              </div>

              <mat-divider class="mt-16 mb-16" />

              @if (profile()!.manager) {
                <div class="info-row">
                  <mat-icon>supervisor_account</mat-icon>
                  <div>
                    <div class="label">Reports to</div>
                    <div class="value">{{ profile()!.manager!.name }}</div>
                    <div class="sub">{{ profile()!.manager!.email }}</div>
                  </div>
                </div>
              } @else {
                <div class="info-row muted">
                  <mat-icon>supervisor_account</mat-icon>
                  <span>No manager assigned</span>
                </div>
              }

              <div class="info-row mt-8">
                <mat-icon>domain</mat-icon>
                <div>
                  <div class="label">Department</div>
                  <div class="value">{{ profile()!.department ?? '—' }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- ── Edit form ── -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Edit Profile</mat-card-title>
              <mat-card-subtitle>Update your display name and department</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="save()" class="edit-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Full Name</mat-label>
                  <input matInput formControlName="name" />
                  <mat-error>Name is required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Department</mat-label>
                  <input matInput formControlName="department"
                         placeholder="e.g. Engineering, HR, Finance" />
                </mat-form-field>

                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit"
                          [disabled]="form.invalid || saving()">
                    @if (saving()) { <mat-spinner diameter="18" /> }
                    Save Changes
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>

          <!-- ── Direct reports (managers only) ── -->
          @if (profile()!.directReports?.length) {
            <mat-card class="reports-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>group</mat-icon>
                  Direct Reports ({{ profile()!.directReports.length }})
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-list>
                  @for (r of profile()!.directReports; track r.id) {
                    <mat-list-item>
                      <mat-icon matListItemIcon>person</mat-icon>
                      <div matListItemTitle>{{ r.name }}</div>
                      <div matListItemLine>{{ r.email }} · {{ r.department ?? '—' }}</div>
                      <mat-chip matListItemMeta [class]="roleClass(r.role)">
                        {{ friendlyRole(r.role) }}
                      </mat-chip>
                    </mat-list-item>
                  }
                </mat-list>
              </mat-card-content>
            </mat-card>
          }

        </div>
      }
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; max-width: 960px; margin: auto; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    h2 { margin: 0; }
    .spinner-center { display: flex; justify-content: center; padding: 64px; }
    .profile-grid { display: grid; grid-template-columns: 340px 1fr; gap: 24px; }
    .reports-card { grid-column: span 2; }

    .avatar-row { display: flex; gap: 16px; align-items: flex-start; }
    .avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
    .avatar-placeholder {
      width: 72px; height: 72px; border-radius: 50%;
      background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; font-weight: 700; flex-shrink: 0;
    }
    h3 { margin: 0 0 4px; font-size: 1.2rem; }
    .email { margin: 0 0 8px; color: #666; font-size: 0.85rem; }

    .info-row { display: flex; gap: 12px; align-items: flex-start; }
    .info-row mat-icon { color: #666; margin-top: 2px; }
    .label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: .5px; }
    .value { font-weight: 500; }
    .sub { font-size: 12px; color: #888; }
    .muted { color: #aaa; }

    .edit-form { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
    .full-width { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; }

    .chip-employee { background: #e3f2fd; }
    .chip-manager  { background: #e8f5e9; }
    .chip-admin    { background: #fce4ec; }

    .mt-8  { margin-top: 8px; }
    .mt-16 { margin-top: 16px; }
    .mb-16 { margin-bottom: 16px; }

    mat-card-title mat-icon { vertical-align: middle; margin-right: 8px; }

    @media (max-width: 720px) {
      .profile-grid { grid-template-columns: 1fr; }
      .reports-card { grid-column: span 1; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private fb          = inject(FormBuilder);
  private snack       = inject(MatSnackBar);

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  saving  = signal(false);

  form = this.fb.group({
    name:       ['', Validators.required],
    department: [''],
  });

  ngOnInit() {
    this.userService.getMyProfile().subscribe({
      next: p => {
        this.profile.set(p);
        this.form.patchValue({ name: p.name, department: p.department ?? '' });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const { name, department } = this.form.getRawValue();
    this.userService.updateMyProfile({ name: name!, department: department ?? undefined })
      .subscribe({
        next: updated => {
          this.profile.set(updated);
          this.saving.set(false);
          this.snack.open('Profile updated!', 'OK', { duration: 3000 });
        },
        error: () => {
          this.saving.set(false);
          this.snack.open('Update failed — please try again.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  friendlyRole(role: string): string {
    return ({ ROLE_EMPLOYEE: 'Employee', ROLE_MANAGER: 'Manager', ROLE_ADMIN: 'Admin' })[role] ?? role;
  }

  roleClass(role: string): string {
    return ({ ROLE_EMPLOYEE: 'chip-employee', ROLE_MANAGER: 'chip-manager', ROLE_ADMIN: 'chip-admin' })[role] ?? '';
  }
}