import { BadRequestException } from '@nestjs/common';
import {
  ApprovalDecision,
  OutboundRequestStatus,
  SchemeGovernanceRoleType,
} from '../enums/governance.enums';
import {
  assertCanRecordApproval,
  resolveOutboundRequestStatus,
  RecordApprovalInput,
} from './outbound-request-workflow';

const TREASURER = SchemeGovernanceRoleType.TREASURER;
const COMMITTEE = SchemeGovernanceRoleType.COMMITTEE_MEMBER;
const AUDITOR = SchemeGovernanceRoleType.AUDITOR;

describe('assertCanRecordApproval', () => {
  const baseInput: RecordApprovalInput = {
    requestStatus: OutboundRequestStatus.INITIATED,
    initiatorTenantUserId: 'user-initiator',
    approverTenantUserId: 'user-approver',
    approverCurrentRoleTypes: [COMMITTEE],
    eligibleRoleTypes: [TREASURER, COMMITTEE],
    existingApproverIds: [],
  };

  it('allows an eligible, independent approver to approve', () => {
    expect(() => assertCanRecordApproval(baseInput)).not.toThrow();
  });

  describe('the no-self-approval rule (this is the one that matters most)', () => {
    it('blocks the initiator from approving their own request', () => {
      expect(() =>
        assertCanRecordApproval({
          ...baseInput,
          approverTenantUserId: 'user-initiator',
          approverCurrentRoleTypes: [TREASURER],
        }),
      ).toThrow(/cannot also approve/);
    });

    it('blocks self-approval even when the initiator holds an eligible role', () => {
      // Being eligible in general doesn't override being the initiator —
      // this is the exact scenario that would silently defeat the
      // 2-approver control if it were allowed.
      expect(() =>
        assertCanRecordApproval({
          ...baseInput,
          initiatorTenantUserId: 'same-person',
          approverTenantUserId: 'same-person',
          approverCurrentRoleTypes: [TREASURER, COMMITTEE],
        }),
      ).toThrow(BadRequestException);
    });
  });

  it('blocks a second decision from the same approver', () => {
    expect(() =>
      assertCanRecordApproval({
        ...baseInput,
        existingApproverIds: ['user-approver'],
      }),
    ).toThrow(/already recorded a decision/);
  });

  it('blocks an approver who does not hold an eligible role', () => {
    expect(() =>
      assertCanRecordApproval({
        ...baseInput,
        approverCurrentRoleTypes: [AUDITOR],
        eligibleRoleTypes: [TREASURER, COMMITTEE],
      }),
    ).toThrow(/not currently hold a role eligible/);
  });

  it('blocks approval on a request that already resolved to APPROVED', () => {
    expect(() =>
      assertCanRecordApproval({
        ...baseInput,
        requestStatus: OutboundRequestStatus.APPROVED,
      }),
    ).toThrow(/no longer awaiting approval/);
  });

  it('blocks approval on a request that already resolved to REJECTED', () => {
    expect(() =>
      assertCanRecordApproval({
        ...baseInput,
        requestStatus: OutboundRequestStatus.REJECTED,
      }),
    ).toThrow(/no longer awaiting approval/);
  });

  it('blocks approval on a request that has already executed', () => {
    expect(() =>
      assertCanRecordApproval({
        ...baseInput,
        requestStatus: OutboundRequestStatus.EXECUTED,
      }),
    ).toThrow(/no longer awaiting approval/);
  });

  it('allows an approver holding any one of multiple eligible roles', () => {
    expect(() =>
      assertCanRecordApproval({
        ...baseInput,
        approverCurrentRoleTypes: [AUDITOR, TREASURER],
        eligibleRoleTypes: [TREASURER, COMMITTEE],
      }),
    ).not.toThrow();
  });
});

describe('resolveOutboundRequestStatus', () => {
  it('stays INITIATED with zero decisions', () => {
    expect(
      resolveOutboundRequestStatus({ decisions: [], requiredApprovals: 2 }),
    ).toBe(OutboundRequestStatus.INITIATED);
  });

  it('stays INITIATED with only one approval when two are required', () => {
    expect(
      resolveOutboundRequestStatus({
        decisions: [ApprovalDecision.APPROVED],
        requiredApprovals: 2,
      }),
    ).toBe(OutboundRequestStatus.INITIATED);
  });

  it('becomes APPROVED once the required number of approvals is reached', () => {
    expect(
      resolveOutboundRequestStatus({
        decisions: [ApprovalDecision.APPROVED, ApprovalDecision.APPROVED],
        requiredApprovals: 2,
      }),
    ).toBe(OutboundRequestStatus.APPROVED);
  });

  it('a single REJECTED decision rejects the request outright, even with an approval present', () => {
    expect(
      resolveOutboundRequestStatus({
        decisions: [ApprovalDecision.APPROVED, ApprovalDecision.REJECTED],
        requiredApprovals: 2,
      }),
    ).toBe(OutboundRequestStatus.REJECTED);
  });

  it('a rejection wins even if enough approvals also exist', () => {
    // Order shouldn't matter — a veto is a veto.
    expect(
      resolveOutboundRequestStatus({
        decisions: [
          ApprovalDecision.APPROVED,
          ApprovalDecision.APPROVED,
          ApprovalDecision.REJECTED,
        ],
        requiredApprovals: 2,
      }),
    ).toBe(OutboundRequestStatus.REJECTED);
  });

  it('respects a requiredApprovals value other than 2', () => {
    expect(
      resolveOutboundRequestStatus({
        decisions: [ApprovalDecision.APPROVED],
        requiredApprovals: 1,
      }),
    ).toBe(OutboundRequestStatus.APPROVED);
  });
});
