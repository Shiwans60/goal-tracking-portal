import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface QuarterStats {
  quarter:              string;
  totalGoals:           number;
  goalsCheckedIn:       number;
  goalsPending:         number;
  completionPct:        number;
  weightedProgressScore: number;
  onTrackCount:         number;
  completedCount:       number;
  atRiskCount:          number;
}

export interface EmployeeProgressSummary {
  employeeId:          string;
  cycleId:             string;
  totalApprovedGoals:  number;
  totalWeightage:      number;
  overallProgressScore: number;
  goalsWithCheckinQ1:  number;
  goalsWithCheckinQ2:  number;
  goalsWithCheckinQ3:  number;
  goalsWithCheckinQ4:  number;
  quarterStats:        QuarterStats[];
}

export interface MemberCompletionRow {
  employeeId:           string;
  employeeName:         string;
  department?:          string;
  approvedGoals:        number;
  checkinQ1:            number;
  checkinQ2:            number;
  checkinQ3:            number;
  checkinQ4:            number;
  q1CompletionPct:      number;
  weightedProgressScore: number;
}

export interface TeamCompletionOverview {
  managerId:       string;
  cycleId:         string;
  teamSize:        number;
  q1CompletionRate: number;
  memberRows:      MemberCompletionRow[];
}

export interface DeptCount {
  department: string;
  count:      number;
}

export interface OrgCompletionMetrics {
  cycleId:              string;
  totalEmployees:       number;
  totalGoals:           number;
  approvedGoals:        number;
  q1CheckedIn:          number;
  q2CheckedIn:          number;
  q3CheckedIn:          number;
  q4CheckedIn:          number;
  q1CompletionPct:      number;
  q2CompletionPct:      number;
  q3CompletionPct:      number;
  q4CompletionPct:      number;
  employeesByDepartment: DeptCount[];
}

export interface QoQDataPoint {
  quarter:       string;
  weightedScore: number;
  checkinCount:  number;
  onTrackCount:  number;
  atRiskCount:   number;
}

export interface QoQTrend {
  employeeId: string;
  cycleId:    string;
  dataPoints: QoQDataPoint[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/dashboard`;

  getMyProgressSummary(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<EmployeeProgressSummary>(`${this.base}/me`, { params });
  }

  getMyQoQTrend(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<QoQTrend>(`${this.base}/me/trend`, { params });
  }

  getTeamCompletionOverview(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<TeamCompletionOverview>(`${this.base}/team`, { params });
  }

  getOrgCompletionMetrics(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<OrgCompletionMetrics>(`${this.base}/org`, { params });
  }
}