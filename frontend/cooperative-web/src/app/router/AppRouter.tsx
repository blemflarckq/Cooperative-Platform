import { Routes, Route, Navigate } from "react-router";
import { AuthGuard } from "@/app/guards/AuthGuard";
import { MustChangePasswordGuard } from "@/app/guards/MustChangePasswordGuard";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AppShellLayout } from "@/app/layouts/AppShellLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { CreateTenantPage } from "@/features/auth/pages/CreateTenantPage";
import { SetupSchemePage } from "@/features/setup/pages/SetupSchemePage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { TenantUsersPage } from "@/features/tenant-users/pages/TenantUsersPage";
import { CreateTenantUserPage } from "@/features/tenant-users/pages/CreateTenantUserPage";
import { TenantUserDetailsPage } from "@/features/tenant-users/pages/TenantUserDetailsPage";
import { EditTenantUserPage } from "@/features/tenant-users/pages/EditTenantUserPage";
import { ManageTenantUserRolesPage } from "@/features/tenant-users/pages/ManageTenantUserRolesPage";
import { CyclesPage } from "@/features/cycles/pages/CyclesPage";
import { SubscriptionsPage } from "@/features/subscriptions/pages/SubscriptionsPage";
import { ContributionsPage } from "@/features/contributions/pages/ContributionsPage";
import { LoansPage } from "@/features/loans/pages/LoansPage";
import { RequestLoanPage } from "@/features/loans/pages/RequestLoanPage";
import { LoanDetailPage } from "@/features/loans/pages/LoanDetailPage";
import { RecordPaymentPage } from "@/features/payments/pages/RecordPaymentPage";
import { MyPaymentsPage } from "@/features/payments/pages/MyPaymentsPage";
import { AllocatePaymentPage } from "@/features/payments/pages/AllocatePaymentPage";
import { ApprovalsPage } from "@/features/approvals/pages/ApprovalsPage";
import { PayoutsPage } from "@/features/payouts/pages/PayoutsPage";
import { AuditPage } from "@/features/audit/pages/AuditPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { UnauthorizedPage } from "@/features/auth/pages/UnauthorizedPage";
import { AcceptInvitationPage } from "@/features/auth/pages/AcceptInvitationPage";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage";
import { ResetPasswordPlaceholderPage } from "@/features/auth/pages/ResetPasswordPlaceholderPage";
import { SchemesPage } from "@/features/schemes/pages/SchemesPage";
import { CreateSchemePage } from "@/features/schemes/pages/CreateSchemePage";
import { SchemeDetailsPage } from "@/features/schemes/pages/SchemeDetailsPage";
import { EditSchemePage } from "@/features/schemes/pages/EditSchemePage";
import { CreateCyclePage } from "@/features/cycles/pages/CreateCyclePage";
import { CycleDetailsPage } from "@/features/cycles/pages/CycleDetailsPage";
import { AddCycleParticipantPage } from "@/features/cycle-participants/pages/AddCycleParticipantPage";
import { CycleParticipantDetailsPage } from "@/features/cycle-participants/pages/CycleParticipantDetailsPage";
import { AccountsPage } from "@/features/accounting/pages/AccountsPage";
import { CreateAccountPage } from "@/features/accounting/pages/CreateAccountPage";
import { AccountingSettingsPage } from "@/features/accounting/pages/AccountingSettingsPage";
import { AccountDetailsPage } from "@/features/accounting/pages/AccountDetailsPage";
import { CreateContributionPage } from "@/features/contributions/pages/CreateContributionPage";
import { JournalEntriesPage } from "@/features/accounting/pages/JournalEntriesPage";
import { JournalEntryDetailsPage } from "@/features/accounting/pages/JournalEntryDetailsPage";
import { ManualJournalEntryPage } from "@/features/accounting/pages/ManualJournalEntryPage";
import { MemberSavingsStatementPage } from "@/features/reports/pages/MemberSavingsStatementPage";
import { AccountingPeriodsPage } from "@/features/accounting/pages/AccountingPeriodsPage";
import { CreateAccountingPeriodPage } from "@/features/accounting/pages/CreateAccountingPeriodPage";
import { AccountingSummaryPage } from "@/features/reports/pages/AccountingSummaryPage";
import { TrialBalancePage } from "@/features/reports/pages/TrialBalancePage";
import { AccountLedgerPage } from "@/features/reports/pages/AccountLedgerPage";
import { SavingsReportsPage } from "@/features/reports/pages/SavingsReportsPage";

/**
 * Route composition for the whole application.
 * We keep public auth routes separate from protected application routes.
 */

function RootRedirector() {
  // Tenant is resolved from the authenticated session now, not
  // remembered per-slug — there's just the one universal login.
  return <Navigate to="/login" replace />;
}

function AppIndexRedirect() {
  return <Navigate to="dashboard" replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-tenant" element={<CreateTenantPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPlaceholderPage />} />
      </Route>

      <Route element={<AuthGuard />}>
        <Route path="/app" element={<AppShellLayout />}>
          <Route path="setup/scheme" element={<SetupSchemePage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route element={<MustChangePasswordGuard />}>
            <Route index element={<AppIndexRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="members">
              <Route index element={<TenantUsersPage />} />
              <Route path="new" element={<CreateTenantUserPage />} />
              <Route path=":tenantUserId" element={<TenantUserDetailsPage />} />
              <Route path=":tenantUserId/edit" element={<EditTenantUserPage />} />
              <Route path=":tenantUserId/roles" element={<ManageTenantUserRolesPage />} />
            </Route>
            <Route path="schemes">
              <Route index element={<SchemesPage />} />
              <Route path="new" element={<CreateSchemePage />} />
              <Route path=":schemeId" element={<SchemeDetailsPage />} />
              <Route path=":schemeId/edit" element={<EditSchemePage />} />
              <Route path=":schemeId/approvals" element={<ApprovalsPage />} />
              <Route path=":schemeId/loans" element={<LoansPage />} />
              <Route path=":schemeId/loans/new" element={<RequestLoanPage />} />
              <Route
                path=":schemeId/cycles/new"
                element={<CreateCyclePage />}
              />
            </Route>
            <Route path="cycles">
              <Route path=":cycleId" element={<CycleDetailsPage />} />
              <Route
                path=":cycleId/participants/new"
                element={<AddCycleParticipantPage />}
              />
              <Route path=":cycleId/contributions/new" element={<CreateContributionPage />} />
            </Route>

            <Route path="cycle-participants">
              <Route path=":participantId" element={<CycleParticipantDetailsPage />} />
            </Route>

            <Route path="accounting">
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="accounts/new" element={<CreateAccountPage />} />
              <Route path="accounts/:accountId" element={<AccountDetailsPage />} />
              <Route path="periods" element={<AccountingPeriodsPage />} />
              <Route path="periods/new" element={<CreateAccountingPeriodPage />} />
              <Route path="settings" element={<AccountingSettingsPage />} />
              <Route path="journal-entries" element={<JournalEntriesPage />} />
              <Route
                path="journal-entries/:journalEntryId"
                element={<JournalEntryDetailsPage />}
              />
              <Route
                path="journal-entries/new"
                element={<ManualJournalEntryPage />}
              />
            </Route>
            <Route path="reports">
              <Route path="accounting" element={<AccountingSummaryPage />} />
              <Route path="trial-balance" element={<TrialBalancePage />} />
              <Route path="accounts/:accountId/ledger" element={<AccountLedgerPage />} />
              <Route path="savings-statement" element={<SavingsReportsPage />} />
              <Route
                path=":tenantUserId/savings-statement"
                element={<MemberSavingsStatementPage />}
              />
            </Route>

            <Route path="accept-invitation" element={<AcceptInvitationPage />} />
            <Route path="cycles" element={<CyclesPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="contributions" element={<ContributionsPage />} />
            <Route path="record-payment" element={<RecordPaymentPage />} />
            <Route path="payments" element={<MyPaymentsPage />} />
            <Route path="allocate-payment/:recordedPaymentId" element={<AllocatePaymentPage />} />
            <Route path="loans/:loanId" element={<LoanDetailPage />} />
            <Route path="payouts" element={<PayoutsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />
          </Route>
          <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="/" element={<RootRedirector />} />
      <Route path="*" element={<RootRedirector />} />
    </Routes>
  );
}