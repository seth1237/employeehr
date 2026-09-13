import type { IconKind } from "@/components/home/landing-icons";

export const WORKFLOWS: Array<{
  name: string;
  apps: IconKind[];
}> = [
  {
    name: "Stock Reorder",
    apps: ["inventory", "warehouse", "procurement", "inventory", "warehouse"],
  },
  {
    name: "Run Payroll",
    apps: ["payroll", "crm", "payroll", "projects", "payroll"],
  },
  {
    name: "Work Order Release",
    apps: ["manufacturing", "projects", "manufacturing", "shipping", "manufacturing"],
  },
];

export const INPUT_TILES: IconKind[] = [
  "inventory",
  "payroll",
  "manufacturing",
  "warehouse",
];

export const BRANCH_TILES: IconKind[] = ["crm", "shipping"];
