import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { StockClient, DEFAULT_CONTACT_ROLES } from "../models/StockClient"
import { StockClientGroup } from "../models/StockClientGroup"

function clientKey(name: string, number: string, location: string) {
  return `${String(name || "").trim().toLowerCase()}|${String(number || "").trim().toLowerCase()}|${String(location || "").trim().toLowerCase()}`
}

function normalizeContact(raw: any) {
  const role = String(raw?.role || "").trim()
  const name = String(raw?.name || "").trim()
  if (!role || !name) return null
  return {
    role,
    name,
    phone: raw?.phone ? String(raw.phone).trim() : undefined,
    email: raw?.email ? String(raw.email).trim() : undefined,
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
  }
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

      if (!sourceName || !sourceNumber || !sourceLocation) {
        return res.status(400).json({
          success: false,
          message: "sourceName, sourceNumber and sourceLocation are required",
        })
      }

      const normalized = Array.isArray(contacts)
        ? contacts.map(normalizeContact).filter(Boolean)
        : []

      const primary = normalized[0] as
        | { name?: string; phone?: string; email?: string }
        | undefined

      const profile = await StockClient.findOneAndUpdate(
        {
          org_id,
          sourceName: String(sourceName).trim(),
          sourceNumber: String(sourceNumber).trim(),
          sourceLocation: String(sourceLocation).trim(),
        },
        {
          $set: {
            legalName: String(legalName || sourceName).trim(),
            contacts: normalized,
            contactPerson: primary?.name,
            email: primary?.email,
            updatedBy: String(actorId),
          },
          $setOnInsert: {
            org_id,
            sourceName: String(sourceName).trim(),
            sourceNumber: String(sourceNumber).trim(),
            sourceLocation: String(sourceLocation).trim(),
            hasKraDetails: false,
            groupIds: [],
            createdBy: String(actorId),
          },
        },
        { upsert: true, new: true },
      )

      return res.status(200).json({ success: true, data: profile })
    } catch (error: any) {
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

function escapeRegex(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
