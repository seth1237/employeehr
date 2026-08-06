import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { StockClient, DEFAULT_CONTACT_ROLES } from "../models/StockClient"
import { StockClientGroup } from "../models/StockClientGroup"

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
  static async listContactRoles(_req: AuthenticatedRequest, res: Response) {
    return res.status(200).json({
      success: true,
      data: [...DEFAULT_CONTACT_ROLES],
    })
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
}
