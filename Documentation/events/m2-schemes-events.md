# M2 Schemes, Cycles & Participation Event Catalog

## Scheme Events

### scheme.created.v1
Emitted when a tenant creates a cooperative scheme.

Aggregate:
- aggregateType: cooperative_scheme
- aggregateId: schemeId

Payload:
- schemeId
- name
- code
- cycleMode
- contributionMode
- loanMode
- payoutMode
- status

### scheme.updated.v1
Emitted when a scheme configuration changes.

### scheme.activated.v1
Emitted when a scheme moves to ACTIVE.

### scheme.suspended.v1
Emitted when a scheme moves to SUSPENDED.

### scheme.archived.v1
Emitted when a scheme moves to ARCHIVED.

---

## Operating Cycle Events

### cycle.created.v1
Emitted when a cycle is created under an active scheme.

### cycle.updated.v1
Emitted when editable cycle metadata changes.

### cycle.opened.v1
Emitted when a cycle moves from DRAFT or PAUSED into OPEN.

### cycle.paused.v1
Emitted when an OPEN cycle is paused.

### cycle.closed.v1
Emitted when a cycle is closed.

### cycle.cancelled.v1
Emitted when a DRAFT cycle is cancelled.

---

## Cycle Participant Events

### cycle_participant.enrolled.v1
Emitted when a tenant user is enrolled into a cycle.

### cycle_participant.bulk_enrolled.v1
Emitted when multiple tenant users are enrolled in one operation.

### cycle_participant.updated.v1
Emitted when participant metadata changes.

### cycle_participant.suspended.v1
Emitted when a participant is suspended in a cycle.

### cycle_participant.reactivated.v1
Emitted when a suspended participant becomes active again.

### cycle_participant.exited.v1
Emitted when a participant exits the cycle.

### cycle_participant.removed.v1
Emitted when a participant is administratively removed from the cycle.