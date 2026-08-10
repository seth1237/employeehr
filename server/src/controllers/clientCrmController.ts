import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { StockClient, DEFAULT_CONTACT_ROLES } from "../models/StockClient"
import { StockClientGroup } from "../models/StockClientGroup"
import { InstalledMachine } from "../models/InstalledMachine"
import { Company } from "../models/Company"
import { isPlatformOwner } from "../utils/platformOwner"

function clientKey(name: string, number: string, location: string) {
  return `${String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}|${String(number || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}|${String(location || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`
}

function escapeRegex(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeContact(raw: any) {
  const role = String(raw?.role || "").trim()
  const name = String(raw?.name || "").trim()
  if (!role || !name) return null
  const phone = String(raw?.phone || "").trim()
  const email = String(raw?.email || "").trim()
  const notes = String(raw?.notes || "").trim()
  return {
    role,
    name,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(notes ? { notes } : {}),
    isActive: Boolean(raw?.isActive),
  }
}

function dedupeContacts(contacts: any[]) {
  const map = new Map<string, ReturnType<typeof normalizeContact>>()
  for (const raw of contacts || []) {
    const contact = normalizeContact(raw)
    if (!contact) continue
    const key = `${contact.role.toLowerCase()}|${contact.name.toLowerCase()}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, contact)
      continue
    }
    map.set(key, {
      role: contact.role,
      name: contact.name,
      ...(contact.phone || existing.phone ? { phone: contact.phone || existing.phone } : {}),
      ...(contact.email || existing.email ? { email: contact.email || existing.email } : {}),
      ...(contact.notes || existing.notes ? { notes: contact.notes || existing.notes } : {}),
      isActive: Boolean(contact.isActive || existing.isActive),
    })
  }
  return Array.from(map.values())
}

async function findClientProfile(
  org_id: string,
  sourceName: string,
  sourceNumber: string,
  sourceLocation: string,
) {
  const exact = await StockClient.findOne({
    org_id,
    sourceName,
    sourceNumber,
    sourceLocation,
  })
  if (exact) return exact

  return StockClient.findOne({
    org_id,
    sourceName: new RegExp(`^${escapeRegex(sourceName)}$`, "i"),
    sourceNumber: new RegExp(`^${escapeRegex(sourceNumber)}$`, "i"),
    sourceLocation: new RegExp(`^${escapeRegex(sourceLocation)}$`, "i"),
  })
}

export class ClientCrmController {
  static async listContactRoles(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const [clients, company] = await Promise.all([
        StockClient.find({ org_id }).select("contacts.role").lean(),
        Company.findById(org_id).select("crmSettings.removedContactRoles").lean(),
      ])
      const removed = new Set(
        (
          Array.isArray((company as any)?.crmSettings?.removedContactRoles)
            ? (company as any).crmSettings.removedContactRoles
            : []
        )
          .map((role: string) => String(role || "").trim().toLowerCase())
          .filter(Boolean),
      )
      const fromContacts = clients.flatMap((client) =>
        (client.contacts || [])
          .map((contact: any) => String(contact?.role || "").trim())
          .filter(Boolean),
      )
      const roles = Array.from(
        new Set([...DEFAULT_CONTACT_ROLES, ...fromContacts]),
      )
        .filter((role) => !removed.has(role.toLowerCase()))
        .sort((a, b) => a.localeCompare(b))

      return res.status(200).json({ success: true, data: roles })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list contact roles",
      })
    }
  }

  static async renameContactRole(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" })
      }

      const fromRole = String(req.body?.fromRole || "").trim()
      const toRole = String(req.body?.toRole || "").trim()
      if (!fromRole || !toRole) {
        return res.status(400).json({
          success: false,
          message: "fromRole and toRole are required",
        })
      }
      if (fromRole.toLowerCase() === toRole.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "Choose a different corrected role name",
        })
      }

      const clients = await StockClient.find({ org_id }).select(
        "contacts contactPerson email updatedBy",
      )
      let updatedClients = 0
      let updatedContacts = 0

      for (const client of clients) {
        const hadRole = (client.contacts || []).some(
          (contact: any) =>
            String(contact.role || "")
              .trim()
              .toLowerCase() === fromRole.toLowerCase(),
        )
        if (!hadRole) continue

        const remapped = (client.contacts || []).map((contact: any) => {
          const role = String(contact.role || "").trim()
          const nextRole =
            role.toLowerCase() === fromRole.toLowerCase() ? toRole : role
          if (role.toLowerCase() === fromRole.toLowerCase()) {
            updatedContacts += 1
          }
          return {
            role: nextRole,
            name: String(contact.name || "").trim(),
            phone: contact.phone ? String(contact.phone) : undefined,
            email: contact.email ? String(contact.email) : undefined,
            notes: contact.notes ? String(contact.notes) : undefined,
            isActive: Boolean(contact.isActive),
          }
        })
        const deduped = dedupeContacts(remapped).filter(Boolean)
        client.set("contacts", deduped)
        client.markModified("contacts")

        const actives = deduped.filter((contact) => contact?.isActive)
        const primary = actives[0] || deduped[0]
        if (primary?.name) {
          client.contactPerson =
            actives
              .map((contact) => contact?.name)
              .filter(Boolean)
              .join("; ") || primary.name
        }
        if (primary?.email) client.email = primary.email
        client.updatedBy = String(actorId)
        await client.save()
        updatedClients += 1
      }

      let machinesUpdated = 0
      try {
        const machineUpdate = await InstalledMachine.updateMany(
          {
            org_id,
            attendantRole: new RegExp(`^${escapeRegex(fromRole)}$`, "i"),
          },
          { $set: { attendantRole: toRole } },
        )
        machinesUpdated = Number((machineUpdate as any)?.modifiedCount || 0)
      } catch (machineError) {
        console.error("Failed to update machine attendant roles", machineError)
      }

      // Persist removal so the old role never reappears in dropdowns.
      // Do $pull and $addToSet in separate updates — same-path conflict otherwise.
      try {
        await Company.findByIdAndUpdate(org_id, {
          $pull: { "crmSettings.removedContactRoles": toRole },
        })
        await Company.findByIdAndUpdate(org_id, {
          $addToSet: { "crmSettings.removedContactRoles": fromRole },
        })
      } catch (companyError) {
        console.error("Failed to persist removed contact role", companyError)
      }

      // Safety check: old role must no longer exist on any contact.
      const leftover = await StockClient.countDocuments({
        org_id,
        "contacts.role": new RegExp(`^${escapeRegex(fromRole)}$`, "i"),
      })
      if (leftover > 0) {
        return res.status(500).json({
          success: false,
          message: `Merge incomplete: ${leftover} client(s) still have role "${fromRole}"`,
        })
      }

      return res.status(200).json({
        success: true,
        message: `Merged ${updatedContacts} contact${updatedContacts === 1 ? "" : "s"} from "${fromRole}" into "${toRole}" across ${updatedClients} client${updatedClients === 1 ? "" : "s"}. Role "${fromRole}" was removed.`,
        data: {
          updatedClients,
          updatedContacts,
          fromRole,
          toRole,
          machinesUpdated,
          removed: true,
        },
      })
    } catch (error: any) {
      console.error("renameContactRole failed", error)
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to rename contact role",
      })
    }
  }

  static async upsertClientContacts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const {
        sourceName,
        sourceNumber,
        sourceLocation,
        legalName,
        contacts,
      } = req.body || {}

      const name = String(sourceName || "").trim()
      const number = String(sourceNumber || "").trim()
      const location = String(sourceLocation || "").trim()

      if (!name || !number || !location) {
        return res.status(400).json({
          success: false,
          message: "sourceName, sourceNumber and sourceLocation are required",
        })
      }

      const normalized = (
        Array.isArray(contacts) ? contacts.map(normalizeContact) : []
      ).filter(Boolean) as Array<{
        role: string
        name: string
        phone?: string
        email?: string
        notes?: string
        isActive: boolean
      }>

      if (normalized.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Add at least one contact with a role and name before saving",
        })
      }

      // Deduplicate by role+name; keep last occurrence
      const contactMap = new Map<string, (typeof normalized)[number]>()
      for (const contact of normalized) {
        contactMap.set(
          `${contact.role.toLowerCase()}|${contact.name.toLowerCase()}`,
          contact,
        )
      }
      const uniqueContacts = Array.from(contactMap.values())
      // Multiple contacts may be active — do not force a single active person
      const actives = uniqueContacts.filter((c) => c.isActive)
      const primary = actives[0] || uniqueContacts[0]

      let profile = await findClientProfile(org_id, name, number, location)
      if (profile) {
        profile.legalName = String(legalName || name).trim()
        profile.contacts = uniqueContacts as any
        profile.contactPerson = actives.map((c) => c.name).join("; ") || primary?.name
        if (primary?.email) profile.email = primary.email
        profile.updatedBy = String(actorId)
        await profile.save()
      } else {
        profile = await StockClient.create({
          org_id,
          sourceName: name,
          sourceNumber: number,
          sourceLocation: location,
          legalName: String(legalName || name).trim(),
          contacts: uniqueContacts,
          contactPerson: actives.map((c) => c.name).join("; ") || primary?.name,
          email: primary?.email,
          hasKraDetails: false,
          groupIds: [],
          createdBy: String(actorId),
          updatedBy: String(actorId),
        })
      }

      return res.status(200).json({
        success: true,
        data: profile,
        message: `Saved ${uniqueContacts.length} contact${uniqueContacts.length === 1 ? "" : "s"}`,
      })
    } catch (error: any) {
      console.error("upsertClientContacts failed:", error)
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save contacts",
      })
    }
  }

  static async listGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const groups = await StockClientGroup.find({ org_id })
        .sort({ name: 1 })
        .lean()

      return res.status(200).json({ success: true, data: groups })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list groups",
      })
    }
  }

  static async createGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const name = String(req.body?.name || "").trim()
      const description = String(req.body?.description || "").trim()
      if (!name) {
        return res.status(400).json({ success: false, message: "Group name is required" })
      }

      const existing = await StockClientGroup.findOne({ org_id, name }).lean()
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "A group with this name already exists",
        })
      }

      const group = await StockClientGroup.create({
        org_id,
        name,
        description: description || undefined,
        memberKeys: Array.isArray(req.body?.memberKeys)
          ? req.body.memberKeys.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean)
          : [],
        createdBy: String(actorId),
        updatedBy: String(actorId),
      })

      return res.status(201).json({ success: true, data: group })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create group",
      })
    }
  }

  static async updateGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const groupId = String(req.params.groupId || "").trim()
      if (!groupId) {
        return res.status(400).json({ success: false, message: "Group id required" })
      }

      const updates: Record<string, unknown> = { updatedBy: String(actorId) }
      if (req.body?.name !== undefined) updates.name = String(req.body.name).trim()
      if (req.body?.description !== undefined) {
        updates.description = String(req.body.description).trim()
      }
      if (Array.isArray(req.body?.memberKeys)) {
        updates.memberKeys = req.body.memberKeys
          .map((k: string) => String(k).trim().toLowerCase())
          .filter(Boolean)
      }

      const group = await StockClientGroup.findOneAndUpdate(
        { _id: groupId, org_id },
        { $set: updates },
        { new: true },
      )

      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" })
      }

      return res.status(200).json({ success: true, data: group })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update group",
      })
    }
  }

  static async addMembersToGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const groupId = String(req.params.groupId || "").trim()
      const keys = Array.isArray(req.body?.memberKeys)
        ? req.body.memberKeys.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean)
        : []

      if (!groupId || keys.length === 0) {
        return res.status(400).json({
          success: false,
          message: "groupId and memberKeys are required",
        })
      }

      const group = await StockClientGroup.findOneAndUpdate(
        { _id: groupId, org_id },
        {
          $addToSet: { memberKeys: { $each: keys } },
          $set: { updatedBy: String(actorId) },
        },
        { new: true },
      )

      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" })
      }

      const profiles = await StockClient.find({ org_id }).select(
        "sourceName sourceNumber sourceLocation groupIds",
      )
      for (const profile of profiles) {
        const key = clientKey(
          profile.sourceName,
          profile.sourceNumber,
          profile.sourceLocation,
        )
        if (!keys.includes(key)) continue
        if ((profile.groupIds || []).includes(String(group._id))) continue
        profile.groupIds = [...(profile.groupIds || []), String(group._id)]
        await profile.save()
      }

      return res.status(200).json({ success: true, data: group })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add members",
      })
    }
  }

  static async removeMemberFromGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const groupId = String(req.params.groupId || "").trim()
      const memberKey = String(req.body?.memberKey || "").trim().toLowerCase()
      if (!groupId || !memberKey) {
        return res.status(400).json({
          success: false,
          message: "groupId and memberKey are required",
        })
      }

      const group = await StockClientGroup.findOneAndUpdate(
        { _id: groupId, org_id },
        {
          $pull: { memberKeys: memberKey },
          $set: { updatedBy: String(actorId) },
        },
        { new: true },
      )

      if (!group) {
        return res.status(404).json({ success: false, message: "Group not found" })
      }

      const [name, number, location] = memberKey.split("|")
      await StockClient.updateOne(
        {
          org_id,
          sourceName: new RegExp(`^${escapeRegex(name)}$`, "i"),
          sourceNumber: new RegExp(`^${escapeRegex(number)}$`, "i"),
          sourceLocation: new RegExp(`^${escapeRegex(location)}$`, "i"),
        },
        { $pull: { groupIds: groupId } },
      )

      return res.status(200).json({ success: true, data: group })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to remove member",
      })
    }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const groupId = String(req.params.groupId || "").trim()
      const deleted = await StockClientGroup.findOneAndDelete({
        _id: groupId,
        org_id,
      })
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Group not found" })
      }

      await StockClient.updateMany(
        { org_id, groupIds: groupId },
        { $pull: { groupIds: groupId } },
      )

      return res.status(200).json({ success: true, message: "Group deleted" })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete group",
      })
    }
  }

  static async mergeGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const groupIds = Array.isArray(req.body?.groupIds)
        ? Array.from(
            new Set(
              req.body.groupIds.map((id: unknown) => String(id || "").trim()).filter(Boolean),
            ),
          )
        : []
      const mergedName = String(req.body?.name || "").trim()

      if (groupIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Select at least two groups to merge",
        })
      }
      if (!mergedName) {
        return res.status(400).json({
          success: false,
          message: "Merged group name is required",
        })
      }

      const groups = await StockClientGroup.find({
        org_id,
        _id: { $in: groupIds },
      }).lean()

      if (groups.length < 2) {
        return res.status(404).json({
          success: false,
          message: "One or more selected groups were not found",
        })
      }

      const nameConflict = await StockClientGroup.findOne({
        org_id,
        name: mergedName,
        _id: { $nin: groupIds },
      }).lean()
      if (nameConflict) {
        return res.status(409).json({
          success: false,
          message: `Another group already uses the name "${mergedName}"`,
        })
      }

      const survivorId = String(groups[0]._id)
      const mergedMemberKeys = Array.from(
        new Set(
          groups.flatMap((group) =>
            (group.memberKeys || []).map((key) => String(key).trim().toLowerCase()),
          ),
        ),
      ).filter(Boolean)

      const mergedDescriptions = groups
        .map((group) => String(group.description || "").trim())
        .filter(Boolean)

      const survivor = await StockClientGroup.findOneAndUpdate(
        { _id: survivorId, org_id },
        {
          $set: {
            name: mergedName,
            memberKeys: mergedMemberKeys,
            description:
              mergedDescriptions.length > 0
                ? mergedDescriptions.join(" · ")
                : undefined,
            updatedBy: String(actorId),
          },
        },
        { new: true },
      )

      if (!survivor) {
        return res.status(404).json({ success: false, message: "Group not found" })
      }

      const deleteIds = groupIds.filter((id) => id !== survivorId)
      if (deleteIds.length > 0) {
        await StockClientGroup.deleteMany({
          org_id,
          _id: { $in: deleteIds },
        })
      }

      await StockClient.updateMany(
        { org_id, groupIds: { $in: groupIds } },
        { $pull: { groupIds: { $in: deleteIds } } },
      )
      await StockClient.updateMany(
        { org_id, groupIds: { $in: groupIds } },
        { $addToSet: { groupIds: survivorId } },
      )

      return res.status(200).json({
        success: true,
        message: `Merged ${groups.length} groups into "${mergedName}"`,
        data: survivor,
        meta: { deletedGroupIds: deleteIds },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to merge groups",
      })
    }
  }

  static async updateSavedClient(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const originalName = String(req.body?.originalSourceName || "").trim()
      const originalNumber = String(req.body?.originalSourceNumber || "").trim()
      const originalLocation = String(
        req.body?.originalSourceLocation || "",
      ).trim()
      const sourceName = String(req.body?.sourceName || "").trim()
      const sourceNumber = String(req.body?.sourceNumber || "").trim()
      const sourceLocation = String(req.body?.sourceLocation || "").trim()
      const legalName = String(
        req.body?.legalName || sourceName || "",
      ).trim()
      const contactPerson = String(req.body?.contactPerson || "").trim()
      const email = String(req.body?.email || "").trim()

      if (
        !originalName ||
        !originalNumber ||
        !originalLocation ||
        !sourceName ||
        !sourceNumber ||
        !sourceLocation
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Original and new client name, number, and location are required",
        })
      }

      const profile = await findClientProfile(
        org_id,
        originalName,
        originalNumber,
        originalLocation,
      )
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Client not found. Save the client first, then edit.",
        })
      }

      const oldKey = clientKey(
        profile.sourceName,
        profile.sourceNumber,
        profile.sourceLocation,
      )
      const newKey = clientKey(sourceName, sourceNumber, sourceLocation)
      const identityChanged = oldKey !== newKey

      if (identityChanged) {
        const clash = await findClientProfile(
          org_id,
          sourceName,
          sourceNumber,
          sourceLocation,
        )
        if (clash && String(clash._id) !== String(profile._id)) {
          return res.status(409).json({
            success: false,
            message:
              "Another client already uses that name, number, and location",
          })
        }
      }

      profile.sourceName = sourceName
      profile.sourceNumber = sourceNumber
      profile.sourceLocation = sourceLocation
      profile.legalName = legalName || sourceName
      if (contactPerson) profile.contactPerson = contactPerson
      if (email) profile.email = email
      profile.updatedBy = String(actorId)
      await profile.save()

      if (identityChanged) {
        const groups = await StockClientGroup.find({
          org_id,
          memberKeys: oldKey,
        })
        for (const group of groups) {
          group.memberKeys = Array.from(
            new Set(
              (group.memberKeys || [])
                .map((key) => (key === oldKey ? newKey : key))
                .filter(Boolean),
            ),
          )
          group.updatedBy = String(actorId)
          await group.save()
        }
      }

      return res.status(200).json({
        success: true,
        data: profile,
        key: newKey,
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update client",
      })
    }
  }

  static async deleteSavedClient(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const sourceName = String(
        req.body?.sourceName || req.query?.sourceName || "",
      ).trim()
      const sourceNumber = String(
        req.body?.sourceNumber || req.query?.sourceNumber || "",
      ).trim()
      const sourceLocation = String(
        req.body?.sourceLocation || req.query?.sourceLocation || "",
      ).trim()

      if (!sourceName || !sourceNumber || !sourceLocation) {
        return res.status(400).json({
          success: false,
          message: "sourceName, sourceNumber and sourceLocation are required",
        })
      }

      const profile = await findClientProfile(
        org_id,
        sourceName,
        sourceNumber,
        sourceLocation,
      )
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Saved client profile not found",
        })
      }

      const key = clientKey(
        profile.sourceName,
        profile.sourceNumber,
        profile.sourceLocation,
      )
      await StockClient.deleteOne({ _id: profile._id, org_id })
      await StockClientGroup.updateMany(
        { org_id, memberKeys: key },
        {
          $pull: { memberKeys: key },
          $set: { updatedBy: String(actorId) },
        },
      )

      return res.status(200).json({
        success: true,
        message: "Client deleted",
        key,
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete client",
      })
    }
  }

  /**
   * One-time / maintenance: wipe all saved CRM clients for this org.
   * Restricted to platform owner / super_admin / company_admin.
   */
  static async deleteAllSavedClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      const role = String(req.user?.role || "")
      const email = String(req.user?.email || "")

      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const allowed =
        role === "company_admin" ||
        role === "super_admin" ||
        isPlatformOwner(email, role)

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Only the company owner or super admin can delete all clients",
        })
      }

      const confirm = String(req.body?.confirm || "").trim()
      if (confirm !== "DELETE ALL CLIENTS") {
        return res.status(400).json({
          success: false,
          message: 'Type DELETE ALL CLIENTS to confirm',
        })
      }

      const deleteResult = await StockClient.deleteMany({ org_id })
      const groupsCleared = await StockClientGroup.updateMany(
        { org_id },
        {
          $set: {
            memberKeys: [],
            updatedBy: String(actorId),
          },
        },
      )

      return res.status(200).json({
        success: true,
        message: `Deleted ${deleteResult.deletedCount || 0} clients and cleared group memberships`,
        data: {
          deletedCount: Number(deleteResult.deletedCount || 0),
          groupsCleared: Number(groupsCleared.modifiedCount || 0),
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete all clients",
      })
    }
  }
}
