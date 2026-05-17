import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { UserService, AdminUserResponse } from '../../../core/services/user.service';

/* ── Role change dialog ─────────────────────────────────────────────── */
@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Change Role</h2>
    <mat-dialog-content>
      <p class="user-info">{{ data.name }} ({{ data.email }})</p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Role</mat-label>
        <mat-select [(ngModel)]="selectedRole">
          <mat-option value="ROLE_EMPLOYEE">Employee</mat-option>
          <mat-option value="ROLE_MANAGER">Manager</mat-option>
          <mat-option value="ROLE_ADMIN">Admin</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="selectedRole">Save</button>
    </mat-dialog-actions>
  `,
  styles: ['.user-info { color: #666; margin-bottom: 16px; }']
})
export class RoleDialogComponent {
  data: { name: string; email: string; currentRole: string } =
    inject(MatDialogRef).componentInstance.data ?? { name: '', email: '', currentRole: 'ROLE_EMPLOYEE' };
  selectedRole = this.data.currentRole;
  constructor() {
    this.data = (inject(MatDialogRef) as any)._containerInstance._config.data;
    this.selectedRole = this.data.currentRole;
  }
}

/* ── Manager assignment dialog ───────────────────────────────────────── */
@Component({
  selector: 'app-manager-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Assign Manager</h2>
    <mat-dialog-content>
      <p class="user-info">{{ data.name }}</p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Manager</mat-label>
        <mat-select [(ngModel)]="selectedManagerId">
          <mat-option [value]="null">— None (Top-level) —</mat-option>
          @for (m of data.managers; track m.id) {
            <mat-option [value]="m.id" [disabled]="m.id === data.userId">
              {{ m.name }} ({{ m.email }})
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="selectedManagerId">Save</button>
    </mat-dialog-actions>
  `,
  styles: ['.user-info { color: #666; margin-bottom: 16px; }']
})
export class ManagerDialogComponent {
  data: { name: string; userId: string; currentManagerId: string | null; managers: AdminUserResponse[] } =
    { name: '', userId: '', currentManagerId: null, managers: [] };
  selectedManagerId: string | null = null;
  constructor() {
    this.data = (inject(MatDialogRef) as any)._containerInstance._config.data;
    this.selectedManagerId = this.data.currentManagerId ?? null;
  }
}

/* ── Main component ──────────────────────────────────────────────────── */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatChipsModule,
    MatProgressBarModule, MatInputModule, MatSnackBarModule,
    MatDialogModule, MatTooltipModule, MatSlideToggleModule, MatDividerModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <h2>User Management</h2>
        <span class="subtitle">{{ users().length }} users · {{ activeCount() }} active</span>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <!-- Filter bar -->
      <mat-card class="filter-bar">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="searchQuery" placeholder="Name or email…" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Role</mat-label>
              <mat-select [(ngModel)]="roleFilter">
                <mat-option value="">All roles</mat-option>
                <mat-option value="ROLE_EMPLOYEE">Employee</mat-option>
                <mat-option value="ROLE_MANAGER">Manager</mat-option>
                <mat-option value="ROLE_ADMIN">Admin</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="activeFilter">
                <mat-option value="">All</mat-option>
                <mat-option value="true">Active</mat-option>
                <mat-option value="false">Inactive</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Users table -->
      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="filteredUsers()">

            <!-- Name / email -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>User</th>
              <td mat-cell *matCellDef="let u">
                <div class="user-cell">
                  <div class="avatar-sm">{{ u.name[0].toUpperCase() }}</div>
                  <div>
                    <div class="name">{{ u.name }}</div>
                    <div class="email">{{ u.email }}</div>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Department -->
            <ng-container matColumnDef="department">
              <th mat-header-cell *matHeaderCellDef>Department</th>
              <td mat-cell *matCellDef="let u">{{ u.department ?? '—' }}</td>
            </ng-container>

            <!-- Manager -->
            <ng-container matColumnDef="manager">
              <th mat-header-cell *matHeaderCellDef>Manager</th>
              <td mat-cell *matCellDef="let u">{{ u.managerName ?? '—' }}</td>
            </ng-container>

            <!-- Role -->
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Role</th>
              <td mat-cell *matCellDef="let u">
                <mat-chip [class]="roleClass(u.role)">{{ friendlyRole(u.role) }}</mat-chip>
              </td>
            </ng-container>

            <!-- Active toggle -->
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Active</th>
              <td mat-cell *matCellDef="let u">
                <mat-slide-toggle
                  [checked]="u.active"
                  (change)="toggleActive(u, $event.checked)"
                  color="primary">
                </mat-slide-toggle>
              </td>
            </ng-container>

            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let u">
                <button mat-icon-button matTooltip="Change role"
                        (click)="openRoleDialog(u)">
                  <mat-icon>manage_accounts</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Assign manager"
                        (click)="openManagerDialog(u)">
                  <mat-icon>supervisor_account</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"
                [class.inactive-row]="!row.active"></tr>
          </table>

          @if (filteredUsers().length === 0 && !loading()) {
            <div class="empty-state">
              <mat-icon>people_outline</mat-icon>
              <p>No users match the current filters.</p>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; }
    h2 { margin: 0; }
    .subtitle { color: #666; font-size: 14px; }

    .filter-bar { margin-bottom: 16px; }
    .filters { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .search-field { flex: 1; min-width: 200px; }

    table { width: 100%; }
    .user-cell { display: flex; align-items: center; gap: 12px; }
    .avatar-sm {
      width: 36px; height: 36px; border-radius: 50%;
      background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; flex-shrink: 0;
    }
    .name  { font-weight: 500; }
    .email { font-size: 12px; color: #888; }

    .chip-employee { background: #e3f2fd; }
    .chip-manager  { background: #e8f5e9; }
    .chip-admin    { background: #fce4ec; }

    .inactive-row { opacity: 0.5; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; }
  `],
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserService);
  private dialog      = inject(MatDialog);
  private snack       = inject(MatSnackBar);

  users   = signal<AdminUserResponse[]>([]);
  loading = signal(true);

  searchQuery  = '';
  roleFilter   = '';
  activeFilter = '';

  columns = ['name', 'department', 'manager', 'role', 'active', 'actions'];

  activeCount = computed(() => this.users().filter(u => u.active).length);

  filteredUsers = computed(() => {
    const q    = this.searchQuery.toLowerCase();
    return this.users().filter(u => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = !this.roleFilter || u.role === this.roleFilter;
      const matchActive = !this.activeFilter || String(u.active) === this.activeFilter;
      return matchSearch && matchRole && matchActive;
    });
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.userService.getAllUsers().subscribe({
      next: data => { this.users.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  /* ── Role dialog ────────────────────────────────────────────────── */
  openRoleDialog(user: AdminUserResponse) {
    const ref = this.dialog.open(RoleDialogComponent, {
      width: '380px',
      data: { name: user.name, email: user.email, currentRole: user.role },
    });
    ref.afterClosed().subscribe(newRole => {
      if (!newRole || newRole === user.role) return;
      this.userService.updateRole(user.id, newRole).subscribe({
        next: updated => {
          this.users.update(list => list.map(u => u.id === user.id ? updated : u));
          this.snack.open(`Role updated to ${this.friendlyRole(newRole)}`, 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Failed to update role', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  /* ── Manager dialog ─────────────────────────────────────────────── */
  openManagerDialog(user: AdminUserResponse) {
    const managers = this.users().filter(u => u.role !== 'ROLE_EMPLOYEE' && u.id !== user.id);
    const ref = this.dialog.open(ManagerDialogComponent, {
      width: '420px',
      data: {
        name: user.name,
        userId: user.id,
        currentManagerId: user.managerId ?? null,
        managers,
      },
    });
    ref.afterClosed().subscribe(managerId => {
      if (managerId === undefined) return; // cancelled
      this.userService.updateManager(user.id, managerId).subscribe({
        next: updated => {
          this.users.update(list => list.map(u => u.id === user.id ? updated : u));
          this.snack.open('Manager updated', 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Failed to update manager', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  /* ── Toggle active ──────────────────────────────────────────────── */
  toggleActive(user: AdminUserResponse, active: boolean) {
    this.userService.toggleActive(user.id, active).subscribe({
      next: () =>
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, active } : u)),
      error: () => this.snack.open('Failed to update status', 'Dismiss', { duration: 4000 }),
    });
  }

  friendlyRole(role: string): string {
    return ({ ROLE_EMPLOYEE: 'Employee', ROLE_MANAGER: 'Manager', ROLE_ADMIN: 'Admin' })[role] ?? role;
  }

  roleClass(role: string): string {
    return ({ ROLE_EMPLOYEE: 'chip-employee', ROLE_MANAGER: 'chip-manager', ROLE_ADMIN: 'chip-admin' })[role] ?? '';
  }
}