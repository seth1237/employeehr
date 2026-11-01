import { Branch } from "../models/Branch"
import { User } from "../models/User"

const ORG_ADMIN_ROLES = new Set(["super_admin", "company_admin", "admin", "hr"])

export type Actor = {
  userId: string
  org_id: string
  role: string
  name?: string
}

export type TransferScope = {
  canManageAll: boolean
  managedBranchIds: string[]
}

export function actorName(
  user: { firstName?: string; lastName?: string } | null | undefined,
  fallback?: string,
) {
  if (!user) return fallback || "User"
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || fallback || "User"
}

export async function getTransferScope(actor: Actor): Promise<TransferScope> {
  const canManageAll = ORG_ADMIN_ROLES.has(actor.role)
  const [managed, user] = await Promise.all([
    Branch.find({ org_id: actor.org_id, managerId: actor.userId, isActive: true })
      .select("_id")
      .lean(),
    User.findOne({ _id: actor.userId, org_id: actor.org_id }).select("branchId").lean(),
  ])
  const ids = new Set<string>(managed.map((branch) => String(branch._id)))
  if (user?.branchId) ids.add(String(user.branchId))
  return { canManageAll, managedBranchIds: [...ids] }
}

export function canManageBranch(scope: TransferScope, branchId: string) {
  return scope.canManageAll || scope.managedBranchIds.includes(String(branchId))
}

export function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status })
}
