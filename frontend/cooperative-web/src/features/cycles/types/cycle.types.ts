export type CycleStatus =
  | "DRAFT"
  | "OPEN"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED";

export interface OperatingCycle {
  id: string;
  tenantId: string;
  schemeId: string;

  name: string;
  code: string;

  status: CycleStatus;

  startsOn?: string | null;
  endsOn?: string | null;

  targetAmount?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateCycleRequest {
  name: string;
  code?: string;
  startsOn?: string;
  endsOn?: string;
  targetAmount?: number;
}

export type UpdateCycleRequest = Partial<CreateCycleRequest>