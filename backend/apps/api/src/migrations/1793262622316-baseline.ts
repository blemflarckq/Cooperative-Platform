import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * BASELINE — the whole schema, in one migration.
 *
 * The migrations before this one could not build a database from scratch:
 * the project's early schema came from automatic schema sync, so one of
 * them altered a table no migration ever created. They were replaced by
 * this single migration, generated from the entities exactly the way
 * TypeORM's own generator does (entities compared against an empty database).
 *
 * It behaves differently depending on what it finds, and never guesses:
 *
 * - NO application tables  -> a new environment: create everything.
 * - ALL of them present    -> an existing database that already has this
 *                             schema: change nothing, just get recorded as
 *                             applied so it isn't considered pending.
 * - SOME but not all       -> stop with a clear error, touching nothing.
 *                             Half a schema means something unusual
 *                             happened, and creating or skipping over it
 *                             could do damage.
 *
 * Its timestamp is deliberately newer than every migration an existing
 * database has already run: TypeORM refuses a not-yet-run migration that is
 * older than one already recorded.
 *
 * Reference data (permissions) is NOT part of the schema — see
 * `npm run seed:permissions`.
 */
const EXPECTED_TABLES: string[] = [
  "outbox_events",
  "audit_log",
  "users",
  "permissions",
  "role_permissions",
  "roles",
  "tenant_user_roles",
  "tenant_users",
  "tenants",
  "cycle_participants",
  "operating_cycles",
  "cooperative_schemes",
  "scheme_role_assignments",
  "role_transition_petitions",
  "outbound_request_approvals",
  "outbound_requests",
  "approval_policies",
  "recorded_payments",
  "invite_links",
  "membership_enrollment_approvals",
  "membership_enrollment_requests",
  "loan_pledges",
  "loans",
  "loan_pledge_repayment_allocations",
  "loan_repayments",
  "loan_policies",
  "user_invitations",
  "accounts",
  "journal_entries",
  "journal_lines",
  "contributions",
  "accounting_settings",
  "accounting_sequences",
  "accounting_periods",
];

const STATEMENTS: string[] = [
  "CREATE TABLE \"outbox_events\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"aggregateType\" character varying NOT NULL, \"aggregateId\" character varying NOT NULL, \"eventType\" character varying NOT NULL, \"payload\" jsonb NOT NULL, \"headers\" jsonb, \"lastError\" text, \"occurredAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"publishedAt\" TIMESTAMP WITH TIME ZONE, \"attempts\" integer NOT NULL DEFAULT '0', CONSTRAINT \"PK_6689a16c00d09b8089f6237f1d2\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_ddfd44676b13a42810088c85d5\" ON \"outbox_events\" (\"eventType\") ",
  "CREATE INDEX \"IDX_4cbec8691b761d7d193798dd8f\" ON \"outbox_events\" (\"publishedAt\") ",
  "CREATE TABLE \"audit_log\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"actorUserId\" uuid, \"method\" character varying NOT NULL, \"path\" character varying NOT NULL, \"statusCode\" integer NOT NULL, \"occurredAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"metadata\" jsonb, CONSTRAINT \"PK_07fefa57f7f5ab8fc3f52b3ed0b\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_4167b21288ab6e16239cb1d501\" ON \"audit_log\" (\"tenantId\") ",
  "CREATE TABLE \"users\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"email\" character varying NOT NULL, \"firstName\" character varying NOT NULL, \"lastName\" character varying NOT NULL, \"mobile\" character varying, \"passwordHash\" character varying(255), \"mustChangePassword\" boolean NOT NULL DEFAULT false, \"passwordChangedAt\" TIMESTAMP WITH TIME ZONE, \"isActive\" boolean NOT NULL DEFAULT true, CONSTRAINT \"UQ_97672ac88f789774dd47f7c8be3\" UNIQUE (\"email\"), CONSTRAINT \"PK_a3ffb1c0c8416b9fc6f907b7433\" PRIMARY KEY (\"id\"))",
  "CREATE TABLE \"permissions\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"resource\" character varying(100) NOT NULL, \"action\" character varying(100) NOT NULL, \"code\" character varying NOT NULL, \"description\" character varying NOT NULL, CONSTRAINT \"UQ_8dad765629e83229da6feda1c1d\" UNIQUE (\"code\"), CONSTRAINT \"PK_920331560282b8bd21bb02290df\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_89456a09b598ce8915c702c528\" ON \"permissions\" (\"resource\") ",
  "CREATE UNIQUE INDEX \"uq_permissions_key\" ON \"permissions\" (\"code\") ",
  "CREATE TABLE \"role_permissions\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"roleId\" uuid NOT NULL, \"permissionId\" uuid NOT NULL, CONSTRAINT \"uq_role_permissions_role_permission\" UNIQUE (\"roleId\", \"permissionId\"), CONSTRAINT \"PK_84059017c90bfcb701b8fa42297\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_b4599f8b8f548d35850afa2d12\" ON \"role_permissions\" (\"roleId\") ",
  "CREATE INDEX \"IDX_06792d0c62ce6b0203c03643cd\" ON \"role_permissions\" (\"permissionId\") ",
  "CREATE TABLE \"roles\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"name\" character varying(200) NOT NULL, \"code\" character varying(200) NOT NULL, \"description\" text, \"isActive\" boolean NOT NULL DEFAULT true, CONSTRAINT \"uq_roles_tenant_code\" UNIQUE (\"tenantId\", \"code\"), CONSTRAINT \"uq_roles_tenant_name\" UNIQUE (\"tenantId\", \"name\"), CONSTRAINT \"PK_c1433d71a4838793a49dcad46ab\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_c954ae3b1156e075ccd4e9ce3e\" ON \"roles\" (\"tenantId\") ",
  "CREATE TABLE \"tenant_user_roles\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantUserId\" uuid NOT NULL, \"roleId\" uuid NOT NULL, CONSTRAINT \"PK_8ceda34ff03c0af7f74b842d299\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_240bfd7926f3c21961a35942e9\" ON \"tenant_user_roles\" (\"tenantUserId\", \"roleId\") ",
  "CREATE TABLE \"tenant_users\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"userId\" uuid NOT NULL, \"status\" character varying(50) NOT NULL DEFAULT 'active', \"isActive\" boolean NOT NULL DEFAULT true, \"activatedAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_8ce1bc9e3a5887c234900365447\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_8fa3e63dcfe2fe25531f8849e4\" ON \"tenant_users\" (\"tenantId\", \"userId\") ",
  "CREATE TABLE \"tenants\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"name\" character varying NOT NULL, \"slug\" character varying(120) NOT NULL, \"isActive\" boolean NOT NULL DEFAULT true, CONSTRAINT \"UQ_32731f181236a46182a38c992a8\" UNIQUE (\"name\"), CONSTRAINT \"PK_53be67a04681c66b87ee27c9321\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"uq_tenants_slug\" ON \"tenants\" (\"slug\") ",
  "CREATE TYPE \"public\".\"cycle_participants_status_enum\" AS ENUM('ACTIVE', 'SUSPENDED', 'EXITED', 'REMOVED')",
  "CREATE TABLE \"cycle_participants\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"cycleId\" uuid NOT NULL, \"tenantUserId\" uuid NOT NULL, \"status\" \"public\".\"cycle_participants_status_enum\" NOT NULL DEFAULT 'ACTIVE', \"joinedAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"exitedAt\" TIMESTAMP WITH TIME ZONE, \"notes\" text, CONSTRAINT \"PK_7de3fe1b9008aeaab8fc12e563d\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_a8ba13dc7cebf82fbde4445278\" ON \"cycle_participants\" (\"tenantId\", \"status\") ",
  "CREATE UNIQUE INDEX \"IDX_72fef9c06471c8d89f35d4e5fa\" ON \"cycle_participants\" (\"tenantId\", \"cycleId\", \"tenantUserId\") ",
  "CREATE TYPE \"public\".\"operating_cycles_status_enum\" AS ENUM('DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'CANCELLED')",
  "CREATE TABLE \"operating_cycles\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"name\" character varying(160) NOT NULL, \"code\" character varying(80) NOT NULL, \"description\" text, \"status\" \"public\".\"operating_cycles_status_enum\" NOT NULL DEFAULT 'DRAFT', \"startsOn\" date, \"endsOn\" date, \"targetAmount\" numeric(18,2), \"openedAt\" TIMESTAMP WITH TIME ZONE, \"closedAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_c3d34a7114ac43bee8a2d741c07\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_02ab5acf732e057fe74832327d\" ON \"operating_cycles\" (\"tenantId\", \"status\") ",
  "CREATE UNIQUE INDEX \"IDX_32e3c4172c49f8fb9167905eb8\" ON \"operating_cycles\" (\"tenantId\", \"schemeId\", \"code\") ",
  "CREATE TYPE \"public\".\"cooperative_schemes_status_enum\" AS ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')",
  "CREATE TYPE \"public\".\"cooperative_schemes_cyclemode_enum\" AS ENUM('FIXED_PERIOD', 'OPEN_ENDED', 'PROJECT_BASED')",
  "CREATE TYPE \"public\".\"cooperative_schemes_contributionmode_enum\" AS ENUM('MONTHLY_FIXED', 'EVENT_TRIGGERED', 'VOLUNTARY', 'PROJECT_TARGET')",
  "CREATE TYPE \"public\".\"cooperative_schemes_loanmode_enum\" AS ENUM('DISABLED', 'SELF_BACKED', 'PEER_FUNDED', 'SELF_AND_PEER_FUNDED')",
  "CREATE TYPE \"public\".\"cooperative_schemes_payoutmode_enum\" AS ENUM('END_OF_CYCLE', 'NO_PAYOUT', 'EVENT_BENEFICIARY', 'PROJECT_EXPENSE')",
  "CREATE TYPE \"public\".\"cooperative_schemes_visibilitymode_enum\" AS ENUM('FULL_TRANSPARENCY', 'RANKING')",
  "CREATE TABLE \"cooperative_schemes\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"name\" character varying(160) NOT NULL, \"code\" character varying(80) NOT NULL, \"description\" text, \"status\" \"public\".\"cooperative_schemes_status_enum\" NOT NULL DEFAULT 'DRAFT', \"cycleMode\" \"public\".\"cooperative_schemes_cyclemode_enum\" NOT NULL, \"contributionMode\" \"public\".\"cooperative_schemes_contributionmode_enum\" NOT NULL, \"loanMode\" \"public\".\"cooperative_schemes_loanmode_enum\" NOT NULL DEFAULT 'DISABLED', \"payoutMode\" \"public\".\"cooperative_schemes_payoutmode_enum\" NOT NULL, \"isActive\" boolean NOT NULL DEFAULT true, \"visibilityMode\" \"public\".\"cooperative_schemes_visibilitymode_enum\" NOT NULL DEFAULT 'FULL_TRANSPARENCY', \"activatedAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_ef1930440bb8fe29a2198c9cad7\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_f6f618267aa6536085552926f4\" ON \"cooperative_schemes\" (\"tenantId\", \"name\") ",
  "CREATE UNIQUE INDEX \"IDX_88528fc4cdce4e4c1050028b7a\" ON \"cooperative_schemes\" (\"tenantId\", \"code\") ",
  "CREATE TYPE \"public\".\"scheme_role_assignments_roletype_enum\" AS ENUM('TREASURER', 'COMMITTEE_MEMBER', 'AUDITOR')",
  "CREATE TABLE \"scheme_role_assignments\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"tenantUserId\" uuid NOT NULL, \"roleType\" \"public\".\"scheme_role_assignments_roletype_enum\" NOT NULL, \"startsAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"endsAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_39b26921bdd9707d5246c138783\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_83fc43e069a60f36f538f5d7af\" ON \"scheme_role_assignments\" (\"tenantId\", \"schemeId\", \"roleType\") ",
  "CREATE TYPE \"public\".\"role_transition_petitions_status_enum\" AS ENUM('OPEN', 'RESOLVED')",
  "CREATE TABLE \"role_transition_petitions\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"raisedByTenantUserId\" uuid NOT NULL, \"description\" text NOT NULL, \"status\" \"public\".\"role_transition_petitions_status_enum\" NOT NULL DEFAULT 'OPEN', \"resolvedByUserId\" uuid, \"resolutionNotes\" text, \"resolvedAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_c947de79966cd80da581e664073\" PRIMARY KEY (\"id\"))",
  "CREATE TYPE \"public\".\"outbound_request_approvals_decision_enum\" AS ENUM('APPROVED', 'REJECTED')",
  "CREATE TABLE \"outbound_request_approvals\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"outboundRequestId\" uuid NOT NULL, \"approverTenantUserId\" uuid NOT NULL, \"decision\" \"public\".\"outbound_request_approvals_decision_enum\" NOT NULL, \"comment\" text, \"decidedAt\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"PK_90322729946fb132e2624c5a09a\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_2f5310dc2307dafd886f513cbb\" ON \"outbound_request_approvals\" (\"outboundRequestId\", \"approverTenantUserId\") ",
  "CREATE TYPE \"public\".\"outbound_requests_requesttype_enum\" AS ENUM('LOAN_DISBURSEMENT', 'PROJECT_EXPENSE', 'GENERAL_WITHDRAWAL')",
  "CREATE TYPE \"public\".\"outbound_requests_status_enum\" AS ENUM('INITIATED', 'APPROVED', 'REJECTED', 'EXECUTED')",
  "CREATE TABLE \"outbound_requests\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"requestType\" \"public\".\"outbound_requests_requesttype_enum\" NOT NULL, \"amount\" numeric(18,2) NOT NULL, \"purpose\" text NOT NULL, \"status\" \"public\".\"outbound_requests_status_enum\" NOT NULL DEFAULT 'INITIATED', \"initiatedByTenantUserId\" uuid NOT NULL, \"sourceReference\" character varying(120), \"executedJournalEntryId\" uuid, \"executedAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_721144bca8180f4838cd8cefb9e\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_0847e446fa8b70078d36df9764\" ON \"outbound_requests\" (\"tenantId\", \"schemeId\", \"status\") ",
  "CREATE TYPE \"public\".\"approval_policies_eligibleroletypes_enum\" AS ENUM('TREASURER', 'COMMITTEE_MEMBER', 'AUDITOR')",
  "CREATE TABLE \"approval_policies\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"eligibleRoleTypes\" \"public\".\"approval_policies_eligibleroletypes_enum\" array NOT NULL, \"requiredApprovals\" integer NOT NULL DEFAULT '2', CONSTRAINT \"PK_09d33ba3a56c2f804ef511eb680\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_3636d854b301d88652614760eb\" ON \"approval_policies\" (\"tenantId\", \"schemeId\") ",
  "CREATE TYPE \"public\".\"recorded_payments_status_enum\" AS ENUM('UNALLOCATED', 'ALLOCATED')",
  "CREATE TABLE \"recorded_payments\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"tenantUserId\" uuid NOT NULL, \"amount\" numeric(18,2) NOT NULL, \"recordedByTenantUserId\" uuid NOT NULL, \"recordedAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"status\" \"public\".\"recorded_payments_status_enum\" NOT NULL DEFAULT 'UNALLOCATED', \"notes\" text, \"allocatedAt\" TIMESTAMP WITH TIME ZONE, \"allocatedByTenantUserId\" uuid, CONSTRAINT \"PK_0507e7902c1341a5795b50086f3\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_d6c7b01e63c8fa53149a8df9a1\" ON \"recorded_payments\" (\"tenantId\", \"tenantUserId\", \"status\") ",
  "CREATE TABLE \"invite_links\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"token\" character varying NOT NULL, \"generatedByTenantUserId\" uuid NOT NULL, \"expiresAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"consumedAt\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"UQ_invite_links_token\" UNIQUE (\"token\"), CONSTRAINT \"PK_df46bd981abebf8f78c5e334705\" PRIMARY KEY (\"id\"))",
  "CREATE TYPE \"public\".\"membership_enrollment_approvals_decision_enum\" AS ENUM('APPROVED', 'REJECTED')",
  "CREATE TABLE \"membership_enrollment_approvals\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"enrollmentRequestId\" uuid NOT NULL, \"approverTenantUserId\" uuid NOT NULL, \"decision\" \"public\".\"membership_enrollment_approvals_decision_enum\" NOT NULL, \"decidedAt\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"UQ_enrollment_approval_once\" UNIQUE (\"enrollmentRequestId\", \"approverTenantUserId\"), CONSTRAINT \"PK_6add66dd8ccfd197286b9912f9c\" PRIMARY KEY (\"id\"))",
  "CREATE TYPE \"public\".\"membership_enrollment_requests_status_enum\" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED')",
  "CREATE TABLE \"membership_enrollment_requests\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"inviteLinkId\" uuid NOT NULL, \"userId\" uuid NOT NULL, \"status\" \"public\".\"membership_enrollment_requests_status_enum\" NOT NULL DEFAULT 'PENDING_APPROVAL', \"expiresAt\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"PK_2584b78607683511ba64c6b763f\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_enrollment_tenant_status\" ON \"membership_enrollment_requests\" (\"tenantId\", \"status\") ",
  "CREATE TABLE \"loan_pledges\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"loanId\" uuid NOT NULL, \"pledgingTenantUserId\" uuid NOT NULL, \"pledgedAmount\" numeric(18,2) NOT NULL, \"outstandingPrincipal\" numeric(18,2) NOT NULL, \"pledgedAt\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"PK_90ceff2f7cbecebe3e9edf5139f\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_761ef4805d7188a6afa2f69f08\" ON \"loan_pledges\" (\"loanId\", \"pledgingTenantUserId\") ",
  "CREATE TYPE \"public\".\"loans_atcapbehavior_enum\" AS ENUM('CONTINUE_AT_CAP', 'FLAG_AND_BLOCK')",
  "CREATE TYPE \"public\".\"loans_rateschedulemode_enum\" AS ENUM('RAMP', 'PERIODS')",
  "CREATE TYPE \"public\".\"loans_status_enum\" AS ENUM('PENDING_PLEDGES', 'PENDING_APPROVAL', 'ACTIVE', 'AT_RISK', 'REPAID')",
  "CREATE TABLE \"loans\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"cycleId\" uuid NOT NULL, \"borrowerTenantUserId\" uuid NOT NULL, \"principalAmount\" numeric(18,2) NOT NULL, \"selfFundedPrincipal\" numeric(18,2) NOT NULL DEFAULT 0.00, \"selfFundedOutstandingPrincipal\" numeric(18,2) NOT NULL DEFAULT 0.00, \"selfFundedMonthlyRate\" numeric(5,2) NOT NULL, \"peerFundedPrincipal\" numeric(18,2) NOT NULL DEFAULT 0.00, \"peerFundedOutstandingPrincipal\" numeric(18,2) NOT NULL DEFAULT 0.00, \"currentPeerMonthlyRate\" numeric(5,2) NOT NULL, \"peerMonthlyRateIncrement\" numeric(5,2) NOT NULL, \"peerCapRate\" numeric(5,2) NOT NULL, \"atCapBehavior\" \"public\".\"loans_atcapbehavior_enum\" NOT NULL, \"rateScheduleMode\" \"public\".\"loans_rateschedulemode_enum\" NOT NULL DEFAULT 'RAMP', \"initialPeriodMonths\" integer, \"laterPeriodMonths\" integer, \"peerInitialMonthlyRate\" numeric(5,2), \"peerLaterMonthlyRate\" numeric(5,2), \"disbursedAt\" TIMESTAMP WITH TIME ZONE, \"peerRateLastEscalatedAt\" TIMESTAMP WITH TIME ZONE, \"status\" \"public\".\"loans_status_enum\" NOT NULL DEFAULT 'PENDING_PLEDGES', \"isAtRiskFlagged\" boolean NOT NULL DEFAULT false, \"flaggedAtRiskAt\" TIMESTAMP WITH TIME ZONE, \"outboundRequestId\" uuid, CONSTRAINT \"PK_5c6942c1e13e4de135c5203ee61\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_712940276c0bb823d27fc30183\" ON \"loans\" (\"tenantId\", \"schemeId\", \"status\") ",
  "CREATE TABLE \"loan_pledge_repayment_allocations\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"loanRepaymentId\" uuid NOT NULL, \"loanPledgeId\" uuid NOT NULL, \"principalPortion\" numeric(18,2) NOT NULL, \"interestPortion\" numeric(18,2) NOT NULL, CONSTRAINT \"PK_968ecc13fe6ed64e433e0b431f2\" PRIMARY KEY (\"id\"))",
  "CREATE TABLE \"loan_repayments\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"loanId\" uuid NOT NULL, \"totalAmount\" numeric(18,2) NOT NULL, \"selfFundedPrincipalPortion\" numeric(18,2) NOT NULL, \"selfFundedInterestPortion\" numeric(18,2) NOT NULL, \"peerFundedPrincipalPortion\" numeric(18,2) NOT NULL, \"peerFundedInterestPortion\" numeric(18,2) NOT NULL, \"paidAt\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"PK_a37968e2dcfb72f910f5480cc16\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_94bd354e398a79df9dbc1e877a\" ON \"loan_repayments\" (\"tenantId\", \"loanId\") ",
  "CREATE TYPE \"public\".\"loan_policies_atcapbehavior_enum\" AS ENUM('CONTINUE_AT_CAP', 'FLAG_AND_BLOCK')",
  "CREATE TYPE \"public\".\"loan_policies_rateschedulemode_enum\" AS ENUM('RAMP', 'PERIODS')",
  "CREATE TABLE \"loan_policies\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"schemeId\" uuid NOT NULL, \"selfFundedMonthlyRate\" numeric(5,2) NOT NULL, \"peerBaseMonthlyRate\" numeric(5,2) NOT NULL, \"peerMonthlyRateIncrement\" numeric(5,2) NOT NULL, \"peerCapRate\" numeric(5,2) NOT NULL, \"atCapBehavior\" \"public\".\"loan_policies_atcapbehavior_enum\" NOT NULL, \"rateScheduleMode\" \"public\".\"loan_policies_rateschedulemode_enum\" NOT NULL DEFAULT 'RAMP', \"initialPeriodMonths\" integer, \"laterPeriodMonths\" integer, \"peerLaterMonthlyRate\" numeric(5,2), \"isReviewed\" boolean NOT NULL DEFAULT false, CONSTRAINT \"PK_5975c29c35eb5d7a560796ac7a0\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_df6b4ddb27e374401779063c25\" ON \"loan_policies\" (\"tenantId\", \"schemeId\") ",
  "CREATE TABLE \"user_invitations\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"tenantId\" uuid NOT NULL, \"userId\" uuid NOT NULL, \"tenantUserId\" uuid NOT NULL, \"tokenHash\" character varying(255) NOT NULL, \"email\" character varying(255) NOT NULL, \"status\" character varying(50) NOT NULL DEFAULT 'pending', \"expiresAt\" TIMESTAMP WITH TIME ZONE NOT NULL, \"acceptedAt\" TIMESTAMP WITH TIME ZONE, \"revokedAt\" TIMESTAMP WITH TIME ZONE, \"invitedByUserId\" uuid, \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_c8005acb91c3ce9a7ae581eca8f\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_a12cf2521e6d41039a91d5a492\" ON \"user_invitations\" (\"tenantId\") ",
  "CREATE INDEX \"IDX_4d2a7c49fad8d0160ec24dd11f\" ON \"user_invitations\" (\"userId\") ",
  "CREATE INDEX \"IDX_9298e529b9e20539f3c6592ea8\" ON \"user_invitations\" (\"tenantUserId\") ",
  "CREATE UNIQUE INDEX \"IDX_1bd83bea480593536e6549b666\" ON \"user_invitations\" (\"tokenHash\") ",
  "CREATE TYPE \"public\".\"accounts_type_enum\" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')",
  "CREATE TYPE \"public\".\"accounts_normalbalance_enum\" AS ENUM('DEBIT', 'CREDIT')",
  "CREATE TYPE \"public\".\"accounts_status_enum\" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED')",
  "CREATE TABLE \"accounts\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"code\" character varying(40) NOT NULL, \"name\" character varying(160) NOT NULL, \"description\" text, \"type\" \"public\".\"accounts_type_enum\" NOT NULL, \"normalBalance\" \"public\".\"accounts_normalbalance_enum\" NOT NULL, \"status\" \"public\".\"accounts_status_enum\" NOT NULL DEFAULT 'ACTIVE', \"isSystem\" boolean NOT NULL DEFAULT true, CONSTRAINT \"PK_5a7a02c20412299d198e097a8fe\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_d4f88fb4888956bdc38c9a91b2\" ON \"accounts\" (\"tenantId\", \"type\") ",
  "CREATE UNIQUE INDEX \"IDX_808b8395f489ab1025e65cb593\" ON \"accounts\" (\"tenantId\", \"code\") ",
  "CREATE TYPE \"public\".\"journal_entries_status_enum\" AS ENUM('DRAFT', 'POSTED', 'REVERSED')",
  "CREATE TYPE \"public\".\"journal_entries_sourcemodule_enum\" AS ENUM('MANUAL', 'CONTRIBUTIONS', 'LOANS', 'PAYOUTS', 'ADJUSTMENTS')",
  "CREATE TABLE \"journal_entries\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"entryNumber\" character varying(80) NOT NULL, \"transactionDate\" date NOT NULL, \"description\" text NOT NULL, \"status\" \"public\".\"journal_entries_status_enum\" NOT NULL DEFAULT 'DRAFT', \"sourceModule\" \"public\".\"journal_entries_sourcemodule_enum\" NOT NULL DEFAULT 'MANUAL', \"sourceReference\" character varying(120), \"postedByUserId\" uuid, \"postedAt\" TIMESTAMP WITH TIME ZONE, \"reversedEntryId\" uuid, \"reversedAt\" TIMESTAMP WITH TIME ZONE, \"reversedByUserId\" uuid, CONSTRAINT \"PK_a70368e64230434457c8d007ab3\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_aea0cb073b11d6fba7691848db\" ON \"journal_entries\" (\"tenantId\", \"transactionDate\") ",
  "CREATE INDEX \"IDX_4f83a0159732fd4dcaf4bcea8e\" ON \"journal_entries\" (\"tenantId\", \"status\") ",
  "CREATE UNIQUE INDEX \"IDX_d441c7cb21cd2fee164ccc59c9\" ON \"journal_entries\" (\"tenantId\", \"entryNumber\") ",
  "CREATE TYPE \"public\".\"journal_lines_linetype_enum\" AS ENUM('DEBIT', 'CREDIT')",
  "CREATE TABLE \"journal_lines\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"journalEntryId\" uuid NOT NULL, \"accountId\" uuid NOT NULL, \"lineType\" \"public\".\"journal_lines_linetype_enum\" NOT NULL, \"amount\" numeric(18,2) NOT NULL, \"memo\" text, CONSTRAINT \"PK_70cba2da4588cee8921f73ef136\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_4b0b0ca95c494255cd51e60de1\" ON \"journal_lines\" (\"tenantId\", \"accountId\") ",
  "CREATE INDEX \"IDX_a7bd962b4b4f05861559ba42a8\" ON \"journal_lines\" (\"tenantId\", \"journalEntryId\") ",
  "CREATE TYPE \"public\".\"contributions_source_enum\" AS ENUM('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER', 'LOAN_INTEREST_CREDIT')",
  "CREATE TYPE \"public\".\"contributions_status_enum\" AS ENUM('POSTED', 'REVERSED')",
  "CREATE TABLE \"contributions\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"cycleId\" uuid NOT NULL, \"tenantUserId\" uuid NOT NULL, \"reference\" character varying(100) NOT NULL, \"contributionDate\" date NOT NULL, \"amount\" numeric(18,2) NOT NULL, \"source\" \"public\".\"contributions_source_enum\" NOT NULL DEFAULT 'CASH', \"status\" \"public\".\"contributions_status_enum\" NOT NULL DEFAULT 'POSTED', \"journalEntryId\" uuid NOT NULL, \"notes\" text, \"reversedJournalEntryId\" uuid, \"reversedAt\" TIMESTAMP WITH TIME ZONE, \"reversedByUserId\" uuid, CONSTRAINT \"PK_ca2b4f39eb9e32a61278c711f79\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_9b1f6a4157c68ac1cfedb52715\" ON \"contributions\" (\"tenantId\", \"reference\") ",
  "CREATE INDEX \"IDX_227b6c29b453e9b8b6f1e8fd29\" ON \"contributions\" (\"tenantId\", \"status\") ",
  "CREATE INDEX \"IDX_7e01c45fa59d90fb83346077af\" ON \"contributions\" (\"tenantId\", \"tenantUserId\") ",
  "CREATE INDEX \"IDX_d87c3cf7aa4d481530dc1f4773\" ON \"contributions\" (\"tenantId\", \"cycleId\") ",
  "CREATE TABLE \"accounting_settings\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"cashAccountId\" uuid, \"memberSavingsLiabilityAccountId\" uuid, \"loanReceivableAccountId\" uuid, \"interestIncomeAccountId\" uuid, \"penaltyIncomeAccountId\" uuid, \"strictPeriodEnforcement\" boolean NOT NULL DEFAULT false, CONSTRAINT \"PK_25b7d2f4a7d4b10aa42422df298\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_553962c4f8576afb562f6e1796\" ON \"accounting_settings\" (\"tenantId\") ",
  "CREATE TABLE \"accounting_sequences\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"sequenceKey\" character varying(80) NOT NULL, \"currentValue\" integer NOT NULL DEFAULT '0', CONSTRAINT \"PK_5caca8451ba4f6f088cdbcf749b\" PRIMARY KEY (\"id\"))",
  "CREATE UNIQUE INDEX \"IDX_51b66725c59721dfca2e8b9747\" ON \"accounting_sequences\" (\"tenantId\", \"sequenceKey\") ",
  "CREATE TYPE \"public\".\"accounting_periods_status_enum\" AS ENUM('OPEN', 'CLOSED')",
  "CREATE TABLE \"accounting_periods\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"tenantId\" uuid NOT NULL, \"code\" character varying(40) NOT NULL, \"name\" character varying(120) NOT NULL, \"startsOn\" date NOT NULL, \"endsOn\" date NOT NULL, \"isClosed\" boolean NOT NULL DEFAULT false, \"status\" \"public\".\"accounting_periods_status_enum\" NOT NULL DEFAULT 'OPEN', \"closedAt\" TIMESTAMP WITH TIME ZONE, \"closedByUserId\" uuid, CONSTRAINT \"PK_a574217de733282cf1ea1c1970f\" PRIMARY KEY (\"id\"))",
  "CREATE INDEX \"IDX_88ff9e46e72899b6bf44a8db52\" ON \"accounting_periods\" (\"tenantId\", \"startsOn\", \"endsOn\") ",
  "CREATE UNIQUE INDEX \"IDX_0b297ba280d84ad92a15671bb3\" ON \"accounting_periods\" (\"tenantId\", \"code\") ",
  "ALTER TABLE \"role_permissions\" ADD CONSTRAINT \"FK_b4599f8b8f548d35850afa2d12c\" FOREIGN KEY (\"roleId\") REFERENCES \"roles\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"role_permissions\" ADD CONSTRAINT \"FK_06792d0c62ce6b0203c03643cdd\" FOREIGN KEY (\"permissionId\") REFERENCES \"permissions\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"roles\" ADD CONSTRAINT \"FK_c954ae3b1156e075ccd4e9ce3e6\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"tenant_user_roles\" ADD CONSTRAINT \"FK_664fae54f06a259adc5bef9d822\" FOREIGN KEY (\"tenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"tenant_user_roles\" ADD CONSTRAINT \"FK_f60d31b8e64604269a4035bd53c\" FOREIGN KEY (\"roleId\") REFERENCES \"roles\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"tenant_users\" ADD CONSTRAINT \"FK_b60b5094f416190c9b3103cba2a\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"tenant_users\" ADD CONSTRAINT \"FK_5c0a747551be06a29ac8196037e\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"cycle_participants\" ADD CONSTRAINT \"FK_4c52df00192cf9f4bcb34220b8e\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"cycle_participants\" ADD CONSTRAINT \"FK_fafdfe2346662eaa0375c8f3320\" FOREIGN KEY (\"cycleId\") REFERENCES \"operating_cycles\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"cycle_participants\" ADD CONSTRAINT \"FK_f48b89f37c7f03c2ab34a3b8035\" FOREIGN KEY (\"tenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"operating_cycles\" ADD CONSTRAINT \"FK_2210b6418b91fd16f7128101ae7\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"operating_cycles\" ADD CONSTRAINT \"FK_1966811b9729446de1aceca6613\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"cooperative_schemes\" ADD CONSTRAINT \"FK_fff2dad9e88adde973e7c170fe5\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"scheme_role_assignments\" ADD CONSTRAINT \"FK_64aba861d05b5c49357307225a7\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"scheme_role_assignments\" ADD CONSTRAINT \"FK_085e87b736c1dbdcd617c635a63\" FOREIGN KEY (\"tenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"role_transition_petitions\" ADD CONSTRAINT \"FK_13f4b1d39072e77cb250b26bfe0\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"role_transition_petitions\" ADD CONSTRAINT \"FK_dbe11498a488f1f0f14fe20e2a8\" FOREIGN KEY (\"raisedByTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"outbound_request_approvals\" ADD CONSTRAINT \"FK_bfb8f7fffc5d9a6b1f7edf7bb1c\" FOREIGN KEY (\"outboundRequestId\") REFERENCES \"outbound_requests\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"outbound_request_approvals\" ADD CONSTRAINT \"FK_b60b5fa3f5272e79024d065ffa7\" FOREIGN KEY (\"approverTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"outbound_requests\" ADD CONSTRAINT \"FK_96a3acb9d810c90024fdbd9514f\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"outbound_requests\" ADD CONSTRAINT \"FK_61c513b99a70fba6fc6c58979b3\" FOREIGN KEY (\"initiatedByTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"approval_policies\" ADD CONSTRAINT \"FK_768971b1d024937e6d5fc528fe3\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"recorded_payments\" ADD CONSTRAINT \"FK_c1f2429c9b0a57ee0a2cfaa00f3\" FOREIGN KEY (\"tenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"recorded_payments\" ADD CONSTRAINT \"FK_2ac94d9e6b7eb6c9716c42b78b1\" FOREIGN KEY (\"recordedByTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"invite_links\" ADD CONSTRAINT \"FK_invite_links_generated_by\" FOREIGN KEY (\"generatedByTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"membership_enrollment_approvals\" ADD CONSTRAINT \"FK_enrollment_approval_request\" FOREIGN KEY (\"enrollmentRequestId\") REFERENCES \"membership_enrollment_requests\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"membership_enrollment_approvals\" ADD CONSTRAINT \"FK_enrollment_approval_approver\" FOREIGN KEY (\"approverTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"membership_enrollment_requests\" ADD CONSTRAINT \"FK_enrollment_invite_link\" FOREIGN KEY (\"inviteLinkId\") REFERENCES \"invite_links\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"membership_enrollment_requests\" ADD CONSTRAINT \"FK_enrollment_user\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"loan_pledges\" ADD CONSTRAINT \"FK_8970853a4c598a99b4ce0f59547\" FOREIGN KEY (\"loanId\") REFERENCES \"loans\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"loan_pledges\" ADD CONSTRAINT \"FK_63c21b7c21a1c50a29a98f0cbe4\" FOREIGN KEY (\"pledgingTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"loans\" ADD CONSTRAINT \"FK_4c1d16e8a334a875bcb40064cff\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"loans\" ADD CONSTRAINT \"FK_84d6e6176d910444bd7fc192467\" FOREIGN KEY (\"cycleId\") REFERENCES \"operating_cycles\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"loans\" ADD CONSTRAINT \"FK_5e7f9b4bb394a37218ac6a421ec\" FOREIGN KEY (\"borrowerTenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"loans\" ADD CONSTRAINT \"FK_2786531a86688a74eaafe3c3a6a\" FOREIGN KEY (\"outboundRequestId\") REFERENCES \"outbound_requests\"(\"id\") ON DELETE SET NULL ON UPDATE NO ACTION",
  "ALTER TABLE \"loan_pledge_repayment_allocations\" ADD CONSTRAINT \"FK_ba80fb85eccf864ab960a63950e\" FOREIGN KEY (\"loanRepaymentId\") REFERENCES \"loan_repayments\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"loan_pledge_repayment_allocations\" ADD CONSTRAINT \"FK_88d165edc84c0b35e12ba170888\" FOREIGN KEY (\"loanPledgeId\") REFERENCES \"loan_pledges\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"loan_repayments\" ADD CONSTRAINT \"FK_a2f0da4f5cd58b196e6db2d58e3\" FOREIGN KEY (\"loanId\") REFERENCES \"loans\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"loan_policies\" ADD CONSTRAINT \"FK_d3e254cbcbb961ac2d81f70070c\" FOREIGN KEY (\"schemeId\") REFERENCES \"cooperative_schemes\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"user_invitations\" ADD CONSTRAINT \"FK_a12cf2521e6d41039a91d5a492d\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"user_invitations\" ADD CONSTRAINT \"FK_4d2a7c49fad8d0160ec24dd11fd\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"user_invitations\" ADD CONSTRAINT \"FK_9298e529b9e20539f3c6592ea87\" FOREIGN KEY (\"tenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
  "ALTER TABLE \"accounts\" ADD CONSTRAINT \"FK_400028436681d655ad3cd563540\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"journal_entries\" ADD CONSTRAINT \"FK_8ddb19c8d608eda820581b1df72\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"journal_lines\" ADD CONSTRAINT \"FK_aeb7d6e4b43fd0fe320c14b2b54\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"journal_lines\" ADD CONSTRAINT \"FK_3c913ef1f691ce5b2c490116309\" FOREIGN KEY (\"journalEntryId\") REFERENCES \"journal_entries\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"journal_lines\" ADD CONSTRAINT \"FK_d9eecc536593997a18359db2b47\" FOREIGN KEY (\"accountId\") REFERENCES \"accounts\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"contributions\" ADD CONSTRAINT \"FK_ae72500d25e55d7c1e099955ded\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"contributions\" ADD CONSTRAINT \"FK_54033da0e8339b59da96be62c7e\" FOREIGN KEY (\"cycleId\") REFERENCES \"operating_cycles\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"contributions\" ADD CONSTRAINT \"FK_fa300158eb1587e901fede8f284\" FOREIGN KEY (\"tenantUserId\") REFERENCES \"tenant_users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"contributions\" ADD CONSTRAINT \"FK_d0cf6866a3ce9dd128a9be11920\" FOREIGN KEY (\"journalEntryId\") REFERENCES \"journal_entries\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_settings\" ADD CONSTRAINT \"FK_553962c4f8576afb562f6e17961\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_settings\" ADD CONSTRAINT \"FK_401ff5e77fe88534d1e74fc8041\" FOREIGN KEY (\"cashAccountId\") REFERENCES \"accounts\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_settings\" ADD CONSTRAINT \"FK_8e00bb97b2bbb5a5f38917277fd\" FOREIGN KEY (\"memberSavingsLiabilityAccountId\") REFERENCES \"accounts\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_settings\" ADD CONSTRAINT \"FK_04aa1366debd3dcfd21e84ef18d\" FOREIGN KEY (\"loanReceivableAccountId\") REFERENCES \"accounts\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_settings\" ADD CONSTRAINT \"FK_dc0f8f3b67c3afc2cc3bbc55e60\" FOREIGN KEY (\"interestIncomeAccountId\") REFERENCES \"accounts\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_settings\" ADD CONSTRAINT \"FK_6f1a5d5a3f8be5b573e1bdf65dd\" FOREIGN KEY (\"penaltyIncomeAccountId\") REFERENCES \"accounts\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_sequences\" ADD CONSTRAINT \"FK_d791ef87cc1c1331953106c4b86\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION",
  "ALTER TABLE \"accounting_periods\" ADD CONSTRAINT \"FK_d2af12c04558f35a8dbb3de23ae\" FOREIGN KEY (\"tenantId\") REFERENCES \"tenants\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION"
];

export class Baseline1793262622316 implements MigrationInterface {
    name = 'Baseline1793262622316'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const rows: Array<{ table_name: string }> = await queryRunner.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`,
        );
        const present = new Set(rows.map((row) => row.table_name));
        const missing = EXPECTED_TABLES.filter((table) => !present.has(table));

        if (missing.length === EXPECTED_TABLES.length) {
            // A new, empty environment.
            await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
            for (const statement of STATEMENTS) {
                await queryRunner.query(statement);
            }
            return;
        }

        if (missing.length === 0) {
            console.log('Baseline: this database already has the full schema — recorded as applied, nothing changed.');
            return;
        }

        throw new Error(
            `Baseline refused to run: this database has some of the application's tables but not all of them ` +
            `(missing ${missing.length} of ${EXPECTED_TABLES.length}: ${missing.join(', ')}). ` +
            `Nothing was changed. Run \`npm run db:drift\` to see how it differs, and fix or restore it first.`,
        );
    }

    public async down(): Promise<void> {
        // Reverting a baseline would mean deleting every table in the
        // database. That is never what "revert the last migration" should do.
        throw new Error('The baseline migration cannot be reverted: it would delete the whole database.');
    }
}
