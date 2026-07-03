export type CycleParticipantStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "EXITED"
  | "REMOVED";

export interface CycleParticipant {
  id: string;
  tenantId: string;
  cycleId: string;
  tenantUserId: string;
  status: CycleParticipantStatus;
  joinedAt?: string | null;
  exitedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  tenantUser?: {
    id: string;
    userId: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  } | null;
}

export interface BulkCreateCycleParticipantsRequest {
  tenantUserIds: string[];
}

export interface SkippedCycleParticipant {
  tenantUserId: string;
  reason: string;
}

export interface BulkCreateCycleParticipantsResponse {
  enrolledCount: number;
  skippedCount: number;
  enrolled: CycleParticipant[];
  skipped: {
    tenantUserId: string;
    reason: string;
  }[];
}

export interface CreateCycleParticipantRequest {
  tenantUserId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateCycleParticipantRequest {
  // keep empty for now until backend exposes editable fields
}