import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <h2>Reports & Analytics</h2>
      <div class="card-grid">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>download</mat-icon>
            <mat-card-title>Achievement Report</mat-card-title>
            <mat-card-subtitle>Planned vs Actual for all employees (Excel)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="downloadAchievement()">
              <mat-icon>file_download</mat-icon> Download Excel
            </button>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>checklist</mat-icon>
            <mat-card-title>Completion Dashboard</mat-card-title>
            <mat-card-subtitle>Who has completed quarterly check-ins</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <button mat-raised-button color="accent" (click)="viewCompletion()">
              <mat-icon>open_in_new</mat-icon> View Dashboard
            </button>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>history</mat-icon>
            <mat-card-title>Audit Trail</mat-card-title>
            <mat-card-subtitle>All changes made to goals after lock date</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <button mat-stroked-button (click)="viewAudit()">
              <mat-icon>search</mat-icon> View Audit Log
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    h2 { margin: 0 0 24px; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    mat-icon[mat-card-avatar] { font-size: 32px; color: #1a237e; }
  `]
})
export class ReportListComponent {
  private http = inject(HttpClient);

  downloadAchievement() {
    this.http.get(`${environment.apiBaseUrl}/api/reports/achievement`, { responseType: 'blob' })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'achievement-report.xlsx'; a.click();
        URL.revokeObjectURL(url);
      });
  }

  viewCompletion() { alert('Completion dashboard — implemented in Phase 9'); }
  viewAudit()      { alert('Audit trail — implemented in Phase 10'); }
}
