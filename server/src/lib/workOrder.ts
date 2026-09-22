import { MachineService } from "../models/MachineService";

export async function nextWoNumber(orgId: string) {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  const last = await MachineService.findOne({
    org_id: orgId,
    woNumber: { $regex: `^${prefix}` },
  })
    .sort({ woNumber: -1 })
    .select("woNumber")
    .lean();

  const current = last?.woNumber
    ? Number.parseInt(String(last.woNumber).slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export function deriveWorkOrderStatus(service: {
  status?: string | null;
  completedDate?: Date | string | null;
  startedAt?: Date | string | null;
  technicianId?: string | null;
}) {
  if (service.status) return service.status;
  if (service.completedDate) return "completed";
  if (service.startedAt) return "in_progress";
  if (service.technicianId) return "assigned";
  return "open";
}

export function isOpenWorkOrderStatus(status?: string | null) {
  return !["completed", "cancelled"].includes(String(status || ""));
}
