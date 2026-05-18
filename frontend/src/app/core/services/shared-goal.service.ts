import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UomType } from '../models/goal.model';

export interface SharedGoalResponse {
  id:                   string;
  parentGoalId:         string;
  parentGoalTitle:      string;
  thrustArea:           string;
  uomType:              UomType;
  target?:              number;
  targetDate?:          string;
  recipientId:          string;
  recipientName:        string;
  recipientGoalId?:     string;
  recipientWeightage:   number;
  assignedById?:        string;
  assignedByName?:      string;
  cycleId:              string;
  cycleName:            string;
  recipientGoalStatus?: string;
  recipientGoalLocked?: boolean;
  createdAt:            string;
  updatedAt:            string;
}

export interface CreateSharedGoalRequest {
  cycleId:          string;
  thrustArea:       string;
  title:            string;
  description?:     string;
  uomType:          UomType;
  target?:          number;
  targetDate?:      string;
  defaultWeightage: number;
  recipientIds:     string[];
}

export interface CreateSharedGoalResponse {
  parentGoalId:    string;
  parentGoalTitle: string;
  recipientCount:  number;
  assignments:     SharedGoalResponse[];
}

export interface UpdateRecipientWeightageRequest {
  weightage: number;
}

@Injectable({ providedIn: 'root' })
export class SharedGoalService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/shared-goals`;

  /** Employee: my received shared goals */
  getMySharedGoals(cycleId?: string) {
    let params = new HttpParams();
    if (cycleId) params = params.set('cycleId', cycleId);
    return this.http.get<SharedGoalResponse[]>(`${this.base}/mine`, { params });
  }

  /** Manager/Admin: all shared goals in a cycle */
  getSharedGoalsByCycle(cycleId: string) {
    return this.http.get<SharedGoalResponse[]>(`${this.base}/cycle/${cycleId}`);
  }

  /** Manager/Admin: assignments for a specific parent goal */
  getAssignmentsByParentGoal(parentGoalId: string) {
    return this.http.get<SharedGoalResponse[]>(`${this.base}/parent/${parentGoalId}`);
  }

  /** Manager/Admin: create & assign */
  createAndAssign(payload: CreateSharedGoalRequest) {
    return this.http.post<CreateSharedGoalResponse>(this.base, payload);
  }

  /** Employee: update own weightage */
  updateWeightage(sharedGoalId: string, weightage: number) {
    return this.http.patch<SharedGoalResponse>(
      `${this.base}/${sharedGoalId}/weightage`,
      { weightage } satisfies UpdateRecipientWeightageRequest,
    );
  }

  /** Manager/Admin: remove assignment */
  removeAssignment(sharedGoalId: string) {
    return this.http.delete<void>(`${this.base}/${sharedGoalId}`);
  }
}