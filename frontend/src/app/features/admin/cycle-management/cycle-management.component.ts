import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../../../environments/environment';

interface Cycle {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

@Component({
  selector: 'app-cycle-management',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <h2>Cycle Management</h2>
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon> New Cycle
        </button>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="cycles()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Cycle</th>
              <td mat-cell *matCellDef="let c">{{ c.name }}</td>
            </ng-container>
            <ng-container matColumnDef="year">
              <th mat-header-cell *matHeaderCellDef>Year</th>
              <td mat-cell *matCellDef="let c">{{ c.year }}</td>
            </ng-container>
            <ng-container matColumnDef="period">
              <th mat-header-cell *matHeaderCellDef>Period</th>
              <td mat-cell *matCellDef="let c">{{ c.startDate }} – {{ c.endDate }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let c">
                <mat-chip [class]="'chip-' + c.status.toLowerCase()">{{ c.status }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button><mat-icon>edit</mat-icon></button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h2 { margin: 0; }
    table { width: 100%; }
    .chip-active   { background: #e8f5e9; }
    .chip-upcoming { background: #e3f2fd; }
    .chip-closed   { background: #eeeeee; }
  `]
})
export class CycleManagementComponent implements OnInit {
  private http = inject(HttpClient);
  cycles = signal<Cycle[]>([]);
  loading = signal(true);
  columns = ['name', 'year', 'period', 'status', 'actions'];

  ngOnInit() {
    this.http.get<Cycle[]>(`${environment.apiBaseUrl}/api/admin/cycles`).subscribe({
      next: data => { this.cycles.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
