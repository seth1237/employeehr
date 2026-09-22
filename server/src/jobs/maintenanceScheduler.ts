import cron from "node-cron";
import { MaintenancePlan } from "../models/MaintenancePlan";
import { MachineService } from "../models/MachineService";
import { InstalledMachine } from "../models/InstalledMachine";
import { nextWoNumber } from "../lib/workOrder";

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export async function generateDueMaintenanceWorkOrders() {
  const dueBefore = daysFromNow(0);
  const plans = await MaintenancePlan.find({
    active: true,
    nextDueAt: { $lte: daysFromNow(7) },
  }).lean();

  let created = 0;
  for (const plan of plans) {
    const lead = Number(plan.leadTimeDays || 7);
    const horizon = daysFromNow(lead);
    if (plan.nextDueAt && new Date(plan.nextDueAt) > horizon) continue;

    const openExisting = await MachineService.findOne({
      org_id: plan.org_id,
      machineId: plan.assetId,
      planId: String(plan._id),
      status: { $nin: ["completed", "cancelled"] },
    }).lean();
    if (openExisting) continue;

    const asset = await InstalledMachine.findOne({
      _id: plan.assetId,
      org_id: plan.org_id,
    })
      .select("productName")
      .lean();
    if (!asset) continue;

    const woNumber = await nextWoNumber(plan.org_id);
    await MachineService.create({
      org_id: plan.org_id,
      machineId: plan.assetId,
      woNumber,
      type: plan.type === "calibration" ? "calibration" : "preventive",
      status: "open",
      priority: "medium",
      serviceType: plan.name,
      scheduledDate: plan.nextDueAt || dueBefore,
      planId: String(plan._id),
      notes: plan.notes || "",
      checklist: (plan.defaultChecklist || []).map((row) => ({
        item: row.item,
        done: false,
      })),
    });
    created += 1;
  }
  return created;
}

export function startMaintenanceScheduler() {
  cron.schedule("15 6 * * *", async () => {
    try {
      const created = await generateDueMaintenanceWorkOrders();
      if (created) {
        console.log(`[Engineering] Opened ${created} PM work orders`);
      }
    } catch (error) {
      console.error("[Engineering] Maintenance scheduler failed", error);
    }
  });
}
