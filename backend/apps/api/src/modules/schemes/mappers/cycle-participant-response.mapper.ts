import { CycleParticipant } from "../entities/cycle-participant.entity";

export class CycleParticipantResponseMapper {
  static toResponse(participant: CycleParticipant) {
    const tenantUser = participant.tenantUser;
    const user = tenantUser?.user;

    return {
      id: participant.id,
      tenantId: participant.tenantId,
      cycleId: participant.cycleId,
      tenantUserId: participant.tenantUserId,
      status: participant.status,
      joinedAt: participant.joinedAt,
      exitedAt: participant.exitedAt,
      notes: participant.notes,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
      cycle: participant.cycle
        ? {
            id: participant.cycle.id,
            name: participant.cycle.name,
            code: participant.cycle.code,
            status: participant.cycle.status,
            schemeId: participant.cycle.schemeId,
          }
        : undefined,
      tenantUser: tenantUser
        ? {
            id: tenantUser.id,
            status: tenantUser.status,
            isActive: tenantUser.isActive,
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                }
              : undefined,
          }
        : undefined,
    };
  }

  static toList(participants: CycleParticipant[]) {
    return participants.map((participant) => this.toResponse(participant));
  }

  static toBulkResponse(input: {
    enrolled: CycleParticipant[];
    skipped: { tenantUserId: string; reason: string }[];
  }) {
    return {
      enrolledCount: input.enrolled.length,
      skippedCount: input.skipped.length,
      enrolled: this.toList(input.enrolled),
      skipped: input.skipped,
    };
  }
}