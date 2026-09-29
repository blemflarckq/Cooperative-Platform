import { BadRequestException } from '@nestjs/common';
import { ApprovalDecision } from '../../schemes/enums/governance.enums';
import { MembershipEnrollmentStatus } from '../enums/membership-enrollment.enums';
import {
  assertCanRecordEnrollmentApproval,
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
