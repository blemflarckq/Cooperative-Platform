// src/lib/constants/navigation.ts

import {
  BadgeDollarSign,
  Banknote,
  BookOpenCheck,
  CalendarRange,
  FileText,
  //HandCoins,
  LayoutDashboard,
  Layers,
  ReceiptText,
  //ScrollText,
  Settings,
  Users,
  Scale,
} from "lucide-react";


export interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
  /**
   * community: visible in simple/default mode
   * professional: visible only in professional finance mode
   * both/undefined: visible in both modes
   */
  mode?: "community" | "professional" | "both";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const APP_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Community",
    items: [
      {
        label: "People",
        to: "/members",
        icon: Users,
        permissions: ["user:read"],
      },
      {
        label: "Group Funds",
        to: "/schemes",
        icon: Layers,
        permissions: ["scheme:read"],
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Money Received",
        to: "/contributions",
        icon: ReceiptText,
        permissions: ["contribution:read"],
      },
      {
        label: "Accounting Periods",
        to: "/accounting/periods",
        icon: CalendarRange,
        permissions: ["accounting_period:read"],
      },
    ],
  },
  {
    label: "Professional Finance",
    items: [
      {
        label: "Chart of Accounts",
        to: "/accounting/accounts",
        icon: BookOpenCheck,
        permissions: ["account:read"],
        mode: "professional",
      },
      {
        label: "Journal Entries",
        to: "/accounting/journal-entries",
        icon: FileText,
        permissions: ["journal_entry:read"],
        mode: "professional",
      },
      {
        label: "Accounting Settings",
        to: "/accounting/settings",
        icon: Settings,
        permissions: ["accounting_settings:read"],
        mode: "professional",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Savings Reports",
        to: "/reports/savings-statement",
        icon: BadgeDollarSign,
        permissions: ["savings_summary:read"],
      },
      {
        label: "Accounting Summary",
        to: "/reports/accounting",
        icon: Banknote,
        permissions: ["report:accounting_summary:read"],
      },
      {
        label: "Trial Balance",
        to: "/reports/trial-balance",
        icon: Scale,
        permissions: ["report:trial_balance:read"],
        mode: "professional",
      },
    ],
  },
];