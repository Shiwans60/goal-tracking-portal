import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type GoalProgress = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED' | 'AT_RISK';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type UomType =
  | 'NUMERIC_MIN' | 'NUMERIC_MAX'
  | 'PERCENTAGE_MIN' | 'PERCENTAGE_MAX'
  | 'TIMELINE' | 'ZERO_BASED';

/**
 * Phase 7 — GoalCheckinView: goal details merged with existing check-in.
 * Backend: GET /api/checkins/goals?quarter=Q1&cycleId=xxx
 */
export interface GoalCheckinView {
  // Goal fields
  goalId:        string;
  goalTitle:     string;
  thrustArea:    string;
  uomType:       UomType;
  target?:       number;
  targetDate?:   string;
  weightage:     number;
  goalStatus:    string;
  goalLocked:    boolean;
  isShared:      boolean;
  employeeId:    string;
  employeeName:  string;
  cycleId:       string;
  cycleName:     string;
  // Check-in fields (null / default values when no check-in yet)
  checkinId?:           string;
  quarter:              Quarter;
  hasCheckin:           boolean;
  achievement?:         number;
  completionDate?:      string;
  progress:             GoalProgress;
  progressScore?:       number;
  checkedAt?:           string;
  checkinCreatedAt?:    string;
  checkinUpdatedAt?:    string;
}

export interface CheckinEntry {
  id:            string;
  goalId:        string;
  goalTitle:     string;
  thrustArea:    string;
  uomType:       string;
  target?:       number;
  weightage:     number;
  quarter:       Quarter;
  achievement?:  number;
  completionDate?: string;
  progress:      GoalProgress;
  progressScore?: number;
  checkedAt?:    string;
  createdAt:     string;
  updatedAt:     string;
}

export interface UpsertCheckinRequest {
  achievement?:    number;
  completionDate?: string;
  progress:        GoalProgress;
}

export interface CheckinComment {
  id:         string;
  checkinId:  string;
  authorId:   string;
  authorName: string;
  comment:    string;
  createdAt:  string;
}

@Injectable({ providedIn: 'root' })
export class CheckinService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/checkins`;

  /**
   * Primary method for the check-in list page.
   * Returns ALL approved goals with their check-in status merged.
   */
  getGoalsWithCheckins(cycleId?: string, quarter?: Quarter) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    if (quarter) params = params.set('quarter', quarter);
    return this.http.get<GoalCheckinView[]>(`${this.base}/goals`, { params });
  }

  /**
   * Manager: team goals with check-in status.
   */
  getTeamGoalsWithCheckins(cycleId?: string, quarter?: Quarter) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    if (quarter) params = params.set('quarter', quarter);
    return this.http.get<GoalCheckinView[]>(`${this.base}/team/goals`, { params });
  }

  getMyCheckins(cycleId?: string, quarter?: Quarter) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    if (quarter) params = params.set('quarter', quarter);
    return this.http.get<CheckinEntry[]>(this.base, { params });
  }

  getTeamCheckins(cycleId?: string, quarter?: Quarter) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    if (quarter) params = params.set('quarter', quarter);
    return this.http.get<CheckinEntry[]>(`${this.base}/team`, { params });
  }

  upsertCheckin(goalId: string, quarter: Quarter, payload: UpsertCheckinRequest) {
    return this.http.put<CheckinEntry>(`${this.base}/${goalId}/${quarter}`, payload);
  }

  addComment(checkinId: string, comment: string) {
    return this.http.post<CheckinComment>(`${this.base}/${checkinId}/comments`, { comment });
  }

  getComments(checkinId: string) {
    return this.http.get<CheckinComment[]>(`${this.base}/${checkinId}/comments`);
  }
}