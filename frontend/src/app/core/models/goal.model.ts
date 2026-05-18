export type GoalStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'REWORK';

export type UomType =
  | 'NUMERIC_MIN'
  | 'NUMERIC_MAX'
  | 'PERCENTAGE_MIN'
  | 'PERCENTAGE_MAX'
  | 'TIMELINE'
  | 'ZERO_BASED';

export type GoalProgress = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED' | 'AT_RISK';

export interface Goal {
  id:             string;
  employeeId:     string;
  employeeName:   string;
  cycleId:        string;
  cycleName:      string;
  thrustArea:     string;
  title:          string;
  description?:   string;
  uomType:        UomType;
  target?:        number;
  targetDate?:    string;
  weightage:      number;
  status:         GoalStatus;
  locked:         boolean;
  isShared:       boolean;
  parentGoalId?:  string;
  rejectionNote?: string;
  createdAt:      string;
  updatedAt:      string;
}

export interface CreateGoalRequest {
  cycleId:      string;
  thrustArea:   string;
  title:        string;
  description?: string;
  uomType:      UomType;
  target?:      number;
  targetDate?:  string;
  weightage:    number;
}

export type UpdateGoalRequest = Partial<Omit<CreateGoalRequest, 'cycleId'>>;

/** Returned by GET /api/goals/summary */
export interface GoalSheetSummary {
  totalGoals:       number;
  totalWeightage:   number;
  approvedGoals:    number;
  pendingGoals:     number;
  draftGoals:       number;
  reworkGoals:      number;
  /** true when totalWeightage === 100 */
  weightageComplete: boolean;
  /** true when totalGoals >= 8 */
  maxGoalsReached:   boolean;
}