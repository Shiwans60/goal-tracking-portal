import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { UserService, OrgChartNode } from '../../../core/services/user.service';

interface TreeNode extends OrgChartNode {
  children: TreeNode[];
  depth: number;
  expanded: boolean;
}

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatChipsModule, MatProgressBarModule,
    MatTooltipModule, MatDividerModule,
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h2>Organisation Chart</h2>
          <p class="subtitle">{{ flat().length }} total employees across {{ deptCount() }} departments</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="expandAll()">
            <mat-icon>unfold_more</mat-icon> Expand All
          </button>
          <button mat-stroked-button (click)="collapseAll()">
            <mat-icon>unfold_less</mat-icon> Collapse All
          </button>
        </div>
      </div>

      <!-- Search bar -->
      <mat-card class="search-card">
        <mat-card-content>
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search employees</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [(ngModel)]="query" placeholder="Name, email, or department…" />
            @if (query) {
              <button matSuffix mat-icon-button (click)="query = ''">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
          <div class="legend">
            <mat-chip class="chip-admin">Admin</mat-chip>
            <mat-chip class="chip-manager">Manager</mat-chip>
            <mat-chip class="chip-employee">Employee</mat-chip>
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (query.trim()) {
        <!-- Search results -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Search Results ({{ searchResults().length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (node of searchResults(); track node.id) {
              <div class="search-result">
                <div [class]="avatarClass(node.role)">{{ node.name[0].toUpperCase() }}</div>
                <div class="node-info">
                  <div class="node-name">{{ node.name }}</div>
                  <div class="node-sub">{{ node.email }}</div>
                  @if (node.department) { <div class="node-sub">{{ node.department }}</div> }
                </div>
                <div class="node-meta">
                  <mat-chip [class]="chipClass(node.role)">{{ friendlyRole(node.role) }}</mat-chip>
                  @if (node.managerName) { <div class="reports-to">Reports to: {{ node.managerName }}</div> }
                  @if (node.directReportCount > 0) {
                    <div class="direct-count">{{ node.directReportCount }} direct report(s)</div>
                  }
                </div>
              </div>
              <mat-divider />
            }
            @if (searchResults().length === 0) {
              <div class="empty-state">
                <mat-icon>search_off</mat-icon>
                <p>No employees match "{{ query }}"</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <!-- Tree view -->
        <mat-card class="tree-card">
          <mat-card-content>
            @if (roots().length === 0 && !loading()) {
              <div class="empty-state">
                <mat-icon>corporate_fare</mat-icon>
                <p>No users found in the organisation.</p>
              </div>
            }
            @for (root of roots(); track root.id) {
              <ng-container [ngTemplateOutlet]="treeNode" [ngTemplateOutletContext]="{ $implicit: root }" />
            }
          </mat-card-content>
        </mat-card>
      }
    </div>

    <ng-template #treeNode let-node>
      <div class="tree-node" [style.padding-left.px]="node.depth * 28">
        <div class="node-row">
          <button class="expand-btn" mat-icon-button
                  [style.visibility]="node.children.length ? 'visible' : 'hidden'"
                  (click)="toggle(node)">
            <mat-icon>{{ node.expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
          <div [class]="avatarClass(node.role)">{{ node.name[0].toUpperCase() }}</div>
          <div class="node-info">
            <span class="node-name">{{ node.name }}</span>
            <span class="node-sub">{{ node.email }}</span>
            @if (node.department) {
              <span class="node-sub">{{ node.department }}</span>
            }
          </div>
          <div class="node-badge-area">
            <mat-chip [class]="chipClass(node.role)">{{ friendlyRole(node.role) }}</mat-chip>
            @if (node.directReportCount > 0) {
              <span class="report-count" [matTooltip]="node.directReportCount + ' direct report(s)'">
                <mat-icon>group</mat-icon>{{ node.directReportCount }}
              </span>
            }
          </div>
        </div>

        @if (node.expanded && node.children.length) {
          <div class="children">
            @for (child of node.children; track child.id) {
              <ng-container [ngTemplateOutlet]="treeNode" [ngTemplateOutletContext]="{ $implicit: child }" />
            }
          </div>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    h2 { margin: 0; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .header-actions { display: flex; gap: 8px; }

    .search-card { margin-bottom: 16px; }
    .search-card mat-card-content { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 250px; margin-bottom: -1.25em; }
    .legend { display: flex; gap: 8px; align-items: center; }

    .tree-card mat-card-content { padding: 8px 0; }

    .tree-node { position: relative; }
    .node-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px 8px 0; border-radius: 8px; transition: background .15s;
    }
    .node-row:hover { background: #f5f5f5; }
    .expand-btn { flex-shrink: 0; }

    /* Avatar (base class overridden by specific classes) */
    .node-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }
    .avatar-admin    { background: #fce4ec; color: #c62828; }
    .avatar-manager  { background: #e8f5e9; color: #2e7d32; }
    .avatar-employee { background: #e3f2fd; color: #1565c0; }

    .node-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .node-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .node-sub { font-size: 12px; color: #888; }

    .node-badge-area { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .report-count { display: flex; align-items: center; gap: 2px; font-size: 12px; color: #666; cursor: default; }
    .report-count mat-icon { font-size: 14px; height: 14px; width: 14px; line-height: 14px; }

    .children { border-left: 2px solid #e0e0e0; margin-left: 32px; }

    /* Search results */
    .search-result { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; }
    .node-meta { margin-left: auto; text-align: right; }
    .reports-to { font-size: 12px; color: #666; margin-top: 4px; }
    .direct-count { font-size: 12px; color: #1565c0; }

    /* Chips */
    .chip-admin    { background: #fce4ec; }
    .chip-manager  { background: #e8f5e9; }
    .chip-employee { background: #e3f2fd; }

    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; display: block; margin-bottom: 8px; }
  `]
})
export class OrgChartComponent implements OnInit {
  private userService = inject(UserService);

  flat    = signal<OrgChartNode[]>([]);
  loading = signal(true);
  query   = '';

  deptCount = computed(() =>
    new Set(this.flat().map(n => n.department).filter(Boolean)).size
  );

  roots = computed<TreeNode[]>(() => this.buildTree(this.flat()));

  searchResults = computed<OrgChartNode[]>(() => {
    const q = this.query.trim().toLowerCase();
    if (!q) return [];
    return this.flat().filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.email.toLowerCase().includes(q) ||
      (n.department ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.userService.getOrgChart().subscribe({
      next: data => { this.flat.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  toggle(node: TreeNode) { node.expanded = !node.expanded; }

  expandAll() {
    const walk = (nodes: TreeNode[]) =>
      nodes.forEach(n => { n.expanded = true; walk(n.children); });
    walk(this.roots());
  }

  collapseAll() {
    const walk = (nodes: TreeNode[]) =>
      nodes.forEach(n => { n.expanded = false; walk(n.children); });
    walk(this.roots());
  }

  private buildTree(nodes: OrgChartNode[]): TreeNode[] {
    const map = new Map<string, TreeNode>();
    nodes.forEach(n =>
      map.set(n.id, { ...n, children: [], depth: 0, expanded: true })
    );
    const roots: TreeNode[] = [];
    map.forEach(node => {
      if (node.managerId && map.has(node.managerId)) {
        map.get(node.managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    this.assignDepths(roots, 0);
    return roots;
  }

  private assignDepths(nodes: TreeNode[], depth: number) {
    nodes.forEach(n => { n.depth = depth; this.assignDepths(n.children, depth + 1); });
  }

  friendlyRole(role: string): string {
    return ({ ROLE_EMPLOYEE: 'Employee', ROLE_MANAGER: 'Manager', ROLE_ADMIN: 'Admin' }[role]) ?? role;
  }

  avatarClass(role: string): string {
    const cls = ({ ROLE_EMPLOYEE: 'avatar-employee', ROLE_MANAGER: 'avatar-manager', ROLE_ADMIN: 'avatar-admin' }[role]) ?? 'avatar-employee';
    return `node-avatar ${cls}`;
  }

  chipClass(role: string): string {
    return ({ ROLE_EMPLOYEE: 'chip-employee', ROLE_MANAGER: 'chip-manager', ROLE_ADMIN: 'chip-admin' }[role]) ?? '';
  }
}