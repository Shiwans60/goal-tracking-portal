import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GoalService } from '../../../core/services/goal.service';
import { Goal } from '../../../core/models/goal.model';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [
    RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressBarModule, MatCardModule, MatTooltipModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <h2>My Goals</h2>
        <button mat-raised-button color="primary" routerLink="/goals/new">
          <mat-icon>add</mat-icon> New Goal
        </button>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <mat-card>
        <mat-card-content>
          <div class="summary-row">
            <span>Total weightage: <strong>{{ totalWeightage() }}%</strong></span>
            <span [class.warn]="totalWeightage() !== 100">
              {{ totalWeightage() === 100 ? '✅ Valid' : '⚠️ Must equal 100%' }}
            </span>
          </div>

          <table mat-table [dataSource]="goals()">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Goal Title</th>
              <td mat-cell *matCellDef="let g">{{ g.title }}</td>
            </ng-container>
            <ng-container matColumnDef="thrustArea">
              <th mat-header-cell *matHeaderCellDef>Thrust Area</th>
              <td mat-cell *matCellDef="let g">{{ g.thrustArea }}</td>
            </ng-container>
            <ng-container matColumnDef="uomType">
              <th mat-header-cell *matHeaderCellDef>UoM</th>
              <td mat-cell *matCellDef="let g">{{ g.uomType }}</td>
            </ng-container>
            <ng-container matColumnDef="weightage">
              <th mat-header-cell *matHeaderCellDef>Weightage</th>
              <td mat-cell *matCellDef="let g">{{ g.weightage }}%</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let g">
                <mat-chip [class]="'chip-' + g.status.toLowerCase()">{{ g.status }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let g">
                @if (!g.locked) {
                  <button mat-icon-button [routerLink]="['/goals', g.id, 'edit']" matTooltip="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                }
                @if (g.status === 'DRAFT') {
                  <button mat-icon-button color="primary" matTooltip="Submit for approval"
                          (click)="submit(g.id)">
                    <mat-icon>send</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (goals().length === 0 && !loading()) {
            <div class="empty-state">
              <mat-icon>flag</mat-icon>
              <p>No goals yet. Create your first goal to get started.</p>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h2 { margin: 0; }
    .summary-row { display: flex; gap: 16px; padding: 8px 0 16px; font-size: 14px; }
    .warn { color: #e53935; }
    .empty-state { text-align: center; padding: 48px; color: #999; }
    .empty-state mat-icon { font-size: 48px; }
    mat-chip.chip-draft { background: #e3f2fd; }
    mat-chip.chip-approved { background: #e8f5e9; }
    mat-chip.chip-rejected { background: #ffebee; }
    mat-chip.chip-pending_approval { background: #fff8e1; }
    table { width: 100%; }
  `]
})
export class GoalListComponent implements OnInit {
  private goalService = inject(GoalService);

  goals = signal<Goal[]>([]);
  loading = signal(true);
  columns = ['title', 'thrustArea', 'uomType', 'weightage', 'status', 'actions'];

  totalWeightage = () =>
    this.goals().reduce((sum, g) => sum + g.weightage, 0);

  ngOnInit() {
    this.goalService.getMyGoals().subscribe({
      next: data => { this.goals.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  submit(id: string) {
    this.goalService.submitGoal(id).subscribe(updated =>
      this.goals.update(gs => gs.map(g => g.id === id ? updated : g))
    );
  }
}
