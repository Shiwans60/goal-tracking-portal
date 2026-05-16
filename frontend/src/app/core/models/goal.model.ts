export type GoalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REWORK';
export type UomType = 'NUMERIC_MIN' | 'NUMERIC_MAX' | 'PERCENTAGE_MIN' | 'PERCENTAGE_MAX' | 'TIMELINE' | 'ZERO_BASED';
export type GoalProgress = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED' | 'AT_RISK';

export interface Goal {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  cycleName: string;
  thrustArea: string;
  title: string;
  description?: string;
  uomType: UomType;
  target?: number;
  targetDate?: string;
  weightage: number;
  status: GoalStatus;
  locked: boolean;
  isShared: boolean;
  parentGoalId?: string;
  rejectionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalRequest {
  cycleId: string;
  thrustArea: string;
  title: string;
  description?: string;
  uomType: UomType;
  target?: number;
  targetDate?: string;
  weightage: number;
}

export interface UpdateGoalRequest extends Partial<CreateGoalRequest> {}

export interface GoalSummary {
  totalGoals: number;
  totalWeightage: number;
  approvedGoals: number;
  pendingGoals: number;
}
