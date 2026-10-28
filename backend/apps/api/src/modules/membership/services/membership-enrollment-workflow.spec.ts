import { BadRequestException } from '@nestjs/common';
import { ApprovalDecision } from '../../schemes/enums/governance.enums';
import { MembershipEnrollmentStatus } from '../enums/membership-enrollment.enums';
import {
  assertCanRecordEnrollmentApproval,
  getEnrollmentLapse,
  resolveEnrollmentStatus,
  RecordEnrollmentApprovalInput,
  REQUIRED_ENROLLMENT_APPROVALS,
} from './membership-enrollment-workflow';

describe('assertCanRecordEnrollmentApproval', () => {
  const baseInput: RecordEnrollmentApprovalInput = {
    requestStatus: MembershipEnrollmentStatus.PENDING_APPROVAL,
    isEligibleApprover: true,
    existingApproverIds: [],
    approverTenantUserId: 'user-approver',
  };

  it('allows an eligible approver with no prior decision', () => {
    expect(() => assertCanRecordEnrollmentApproval(baseInput)).not.toThrow();
  });

  it('rejects a decision on an already-resolved enrollment', () => {
    expect(() =>
      assertCanRecordEnrollmentApproval({
        ...baseInput,
        requestStatus: MembershipEnrollmentStatus.APPROVED,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a decision on an expired enrollment', () => {
    expect(() =>
      assertCanRecordEnrollmentApproval({
        ...baseInput,
        requestStatus: MembershipEnrollmentStatus.EXPIRED,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a second decision from the same approver', () => {
    expect(() =>
      assertCanRecordEnrollmentApproval({
        ...baseInput,
        existingApproverIds: ['user-approver'],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects an approver who does not hold an eligible platform role', () => {
    expect(() =>
      assertCanRecordEnrollmentApproval({
        ...baseInput,
        isEligibleApprover: false,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('resolveEnrollmentStatus', () => {
  it('stays pending with zero decisions', () => {
    expect(
      resolveEnrollmentStatus({ decisions: [], requiredApprovals: REQUIRED_ENROLLMENT_APPROVALS }),
    ).toBe(MembershipEnrollmentStatus.PENDING_APPROVAL);
  });

  it('stays pending with one approval, short of the required two', () => {
    expect(
      resolveEnrollmentStatus({
        decisions: [ApprovalDecision.APPROVED],
        requiredApprovals: REQUIRED_ENROLLMENT_APPROVALS,
      }),
    ).toBe(MembershipEnrollmentStatus.PENDING_APPROVAL);
  });

  it('becomes approved once two approvals are recorded', () => {
    expect(
      resolveEnrollmentStatus({
        decisions: [ApprovalDecision.APPROVED, ApprovalDecision.APPROVED],
        requiredApprovals: REQUIRED_ENROLLMENT_APPROVALS,
      }),
    ).toBe(MembershipEnrollmentStatus.APPROVED);
  });

  it('a single rejection vetoes the enrollment even alongside an approval', () => {
    expect(
      resolveEnrollmentStatus({
        decisions: [ApprovalDecision.APPROVED, ApprovalDecision.REJECTED],
        requiredApprovals: REQUIRED_ENROLLMENT_APPROVALS,
      }),
    ).toBe(MembershipEnrollmentStatus.REJECTED);
  });
});

describe('getEnrollmentLapse', () => {
  const HOUR = 60 * 60 * 1000;
  const now = new Date('2026-10-10T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now.getTime() - h * HOUR);
  const hoursFromNow = (h: number) => new Date(now.getTime() + h * HOUR);

  it('is live while the invite window is open and nobody has approved', () => {
    expect(
      getEnrollmentLapse({ createdAt: hoursAgo(1), expiresAt: hoursFromNow(3), decisions: [], now }),
    ).toBe('none');
  });

  it('with no approvals, lapses the moment the invite window closes', () => {
    expect(
      getEnrollmentLapse({ createdAt: hoursAgo(5), expiresAt: hoursAgo(1), decisions: [], now }),
    ).toBe('no_approval_window_passed');
  });

  it('a rejection alone does not keep a lapsed enrollment alive', () => {
    expect(
      getEnrollmentLapse({
        createdAt: hoursAgo(5),
        expiresAt: hoursAgo(1),
        decisions: [ApprovalDecision.REJECTED],
        now,
      }),
    ).toBe('no_approval_window_passed');
  });

  it('one approval keeps it alive past the invite window, up to 2 days', () => {
    expect(
      getEnrollmentLapse({
        createdAt: hoursAgo(30),
        expiresAt: hoursAgo(26),
        decisions: [ApprovalDecision.APPROVED],
        now,
      }),
    ).toBe('none');
  });

  it('one approval but no second one after 2 days is overdue', () => {
    expect(
      getEnrollmentLapse({
        createdAt: hoursAgo(49),
        expiresAt: hoursAgo(45),
        decisions: [ApprovalDecision.APPROVED],
        now,
      }),
    ).toBe('second_approval_overdue');
  });

  it('honours a different policy — the limits are data, not constants', () => {
    const strict = { inviteLinkLifetimeMs: 4 * HOUR, partialApprovalLifetimeMs: 6 * HOUR };
    expect(
      getEnrollmentLapse({
        createdAt: hoursAgo(7),
        expiresAt: hoursAgo(3),
        decisions: [ApprovalDecision.APPROVED],
        now,
        policy: strict,
      }),
    ).toBe('second_approval_overdue');
  });
});
