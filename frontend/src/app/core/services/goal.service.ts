import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Goal, CreateGoalRequest, UpdateGoalRequest } from '../models/goal.model';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/goals`;

  getMyGoals(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<Goal[]>(this.base, { params });
  }

  getTeamGoals(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<Goal[]>(`${this.base}/team`, { params });
  }

  getGoalById(id: string) {
    return this.http.get<Goal>(`${this.base}/${id}`);
  }

  createGoal(payload: CreateGoalRequest) {
    return this.http.post<Goal>(this.base, payload);
  }

  updateGoal(id: string, payload: UpdateGoalRequest) {
    return this.http.put<Goal>(`${this.base}/${id}`, payload);
  }

  submitGoal(id: string) {
    return this.http.patch<Goal>(`${this.base}/${id}/submit`, {});
  }

  approveGoal(id: string) {
    return this.http.patch<Goal>(`${this.base}/${id}/approve`, {});
  }

  rejectGoal(id: string, note: string) {
    return this.http.patch<Goal>(`${this.base}/${id}/reject`, { note });
  }

  returnForRework(id: string, note: string) {
    return this.http.patch<Goal>(`${this.base}/${id}/rework`, { note });
  }

  deleteGoal(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
