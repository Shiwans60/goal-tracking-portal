import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  icon: 'dashboard',           route: '/dashboard' },
  { label: 'My Goals',   icon: 'flag',                route: '/goals' },
  { label: 'Check-ins',  icon: 'event_available',     route: '/checkins' },
  { label: 'Reports',    icon: 'bar_chart',            route: '/reports' },
  { label: 'Profile',    icon: 'person',              route: '/profile' },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Users',      icon: 'manage_accounts',     route: '/admin/users',     roles: ['ROLE_ADMIN'] },
  { label: 'Org Chart',  icon: 'account_tree',        route: '/admin/org-chart', roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
  { label: 'Cycles',     icon: 'date_range',          route: '/admin/cycles',    roles: ['ROLE_ADMIN'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatDividerModule, MatTooltipModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">

      <!-- ── Side navigation ─────────────────────────────────── -->
      <mat-sidenav
        #sidenav
        [mode]="mobile() ? 'over' : 'side'"
        [opened]="!mobile()"
        class="sidenav">

        <!-- Brand -->
        <div class="brand">
          <span class="brand-icon">⚡</span>
          <span class="brand-name">AtomQuest</span>
        </div>
        <mat-divider />

        <!-- Main nav -->
        <mat-nav-list>
          @for (item of visibleNav(); track item.route) {
            <a mat-list-item
               [routerLink]="item.route"
               routerLinkActive="active-link"
               (click)="mobile() && sidenav.close()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>

        <!-- Admin section -->
        @if (hasAdminAccess()) {
          <mat-divider />
          <div class="section-label">Administration</div>
          <mat-nav-list>
            @for (item of visibleAdmin(); track item.route) {
              <a mat-list-item
                 [routerLink]="item.route"
                 routerLinkActive="active-link"
                 (click)="mobile() && sidenav.close()">
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          </mat-nav-list>
        }

        <!-- User info at bottom -->
        <div class="sidenav-footer">
          <mat-divider />
          <div class="user-info">
            <div class="user-avatar">{{ initials() }}</div>
            <div class="user-details">
              <div class="user-name">{{ auth.currentUser()?.name }}</div>
              <div class="user-role">{{ friendlyRole(auth.currentUser()?.role ?? '') }}</div>
            </div>
          </div>
        </div>
      </mat-sidenav>

      <!-- ── Main content area ────────────────────────────────── -->
      <mat-sidenav-content>

        <!-- Top toolbar -->
        <mat-toolbar class="top-toolbar" color="primary">
          <button mat-icon-button (click)="sidenav.toggle()" class="menu-btn">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>

          <!-- User menu -->
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
            <div class="user-avatar-sm">{{ initials() }}</div>
            <span class="user-menu-name">{{ auth.currentUser()?.name }}</span>
            <mat-icon>arrow_drop_down</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu" xPosition="before">
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon> My Profile
            </button>
            <mat-divider />
            <button mat-menu-item (click)="auth.logout()">
              <mat-icon>logout</mat-icon> Sign Out
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Page content -->
        <div class="page-content">
          <router-outlet />
        </div>

      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; }

    /* Sidenav */
    .sidenav {
      width: 240px;
      border-right: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
    }
    .brand-icon { font-size: 1.5rem; }
    .brand-name { font-size: 1.1rem; font-weight: 700; color: #1a237e; }

    .section-label {
      padding: 12px 16px 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .8px;
      color: #9e9e9e;
    }

    .active-link {
      background: #e8eaf6 !important;
      color: #1a237e !important;
      border-radius: 0 24px 24px 0;
    }
    .active-link mat-icon { color: #1a237e; }

    .sidenav-footer { margin-top: auto; }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
    }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; flex-shrink: 0;
    }
    .user-details { min-width: 0; }
    .user-name { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: 11px; color: #888; }

    /* Toolbar */
    .top-toolbar { position: sticky; top: 0; z-index: 100; }
    .toolbar-spacer { flex: 1; }
    .menu-btn { margin-right: 8px; }

    .user-menu-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      color: white;
    }
    .user-avatar-sm {
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .user-menu-name { font-size: 14px; margin: 0 2px; }

    /* Page content */
    .page-content { min-height: calc(100vh - 64px); background: #f5f5f5; }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  /** True when viewport < 768 px — uses CSS matchMedia */
  mobile = signal(window.innerWidth < 768);

  visibleNav = () => NAV_ITEMS;

  hasAdminAccess = () =>
    this.auth.hasRole('ROLE_ADMIN', 'ROLE_MANAGER');

  visibleAdmin = () =>
    ADMIN_ITEMS.filter(item =>
      !item.roles || this.auth.hasRole(...(item.roles ?? []))
    );

  initials(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  friendlyRole(role: string): string {
    return ({
      ROLE_EMPLOYEE: 'Employee',
      ROLE_MANAGER:  'Manager',
      ROLE_ADMIN:    'Admin',
    })[role] ?? role;
  }
}