import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface CheckinEntry {
  goalId: string;
  goalTitle: string;
  thrustArea: string;
  uomType: string;
  target: number;
  weightage: number;
  quarter: Quarter;
  achievement?: number;
  progress: string;
  progressScore?: number;
}

@Component({
  selector: 'app-checkin-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    FormsModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <h2>Quarterly Check-ins</h2>
        <mat-form-field appearance="outline" class="quarter-select">
          <mat-label>Quarter</mat-label>
          <mat-select [(ngModel)]="selectedQuarter" (ngModelChange)="load()">
            <mat-option value="Q1">Q1 (July)</mat-option>
            <mat-option value="Q2">Q2 (October)</mat-option>
            <mat-option value="Q3">Q3 (January)</mat-option>
            <mat-option value="Q4">Q4 / Annual (March)</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="entries()">
            <ng-container matColumnDef="goal">
              <th mat-header-cell *matHeaderCellDef>Goal</th>
              <td mat-cell *matCellDef="let e">
                <div><strong>{{ e.goalTitle }}</strong></div>
                <div class="sub">{{ e.thrustArea }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="target">
              <th mat-header-cell *matHeaderCellDef>Target</th>
              <td mat-cell *matCellDef="let e">{{ e.target ?? '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="achievement">
              <th mat-header-cell *matHeaderCellDef>Achievement</th>
              <td mat-cell *matCellDef="let e">{{ e.achievement ?? '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="progress">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let e">
                <mat-chip>{{ e.progress }}</mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>Score</th>
              <td mat-cell *matCellDef="let e">
                {{ e.progressScore != null ? (e.progressScore * 100 | number:'1.0-0') + '%' : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="weightage">
              <th mat-header-cell *matHeaderCellDef>Wt%</th>
              <td mat-cell *matCellDef="let e">{{ e.weightage }}%</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (entries().length === 0) {
            <div class="empty-state">
              <mat-icon>event_available</mat-icon>
              <p>No approved goals found. Goals must be approved before check-ins can be logged.</p>
              <button mat-stroked-button routerLink="/goals">View Goals</button>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h2 { margin: 0; }
    .quarter-select { width: 200px; }
    table { width: 100%; }
    .sub { font-size: 12px; color: #888; }
    .empty-state {
      text-align: center;
      padding: 48px;
      color: #999;
    }
    .empty-state mat-icon {
      font-size: 48px;
      display: block;
    }
  `]
})
export class CheckinListComponent implements OnInit {
  private http = inject(HttpClient);

  entries = signal<CheckinEntry[]>([]);
  selectedQuarter: Quarter = 'Q1';
  columns = ['goal', 'target', 'achievement', 'progress', 'score', 'weightage'];

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<CheckinEntry[]>(
      `${environment.apiBaseUrl}/api/checkins?quarter=${this.selectedQuarter}`
    ).subscribe({
      next: data => this.entries.set(data),
      error: () => this.entries.set([])
    });
  }
}