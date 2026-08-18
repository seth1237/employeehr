import { StockClient } from "../models/StockClient"
import { StockClientGroup } from "../models/StockClientGroup"

export function buildClientMemberKey(name: string, number: string, location: string) {
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

export type SaveStockClientInput = {
  org_id: string
  actorId: string
  sourceName: string
  sourceNumber: string
  sourceLocation: string
  legalName?: string
  contactPerson?: string
  contactPersonRole?: string
  kraPin?: string
  email?: string
  branchId?: string
}

export async function createOrUpdateStockClient(input: SaveStockClientInput) {
  const sourceName = String(input.sourceName || "").trim()
  const sourceNumber = String(input.sourceNumber || "").trim()
  const sourceLocation = String(input.sourceLocation || "").trim()
  if (!sourceName || !sourceNumber || !sourceLocation) {
    throw Object.assign(new Error("Client name, phone number, and county are required"), {
      status: 400,
    })
  }

  const resolvedLegalName = String(input.legalName || sourceName).trim()
  const contactName = input.contactPerson ? String(input.contactPerson).trim() : ""
  const contactRole = input.contactPersonRole ? String(input.contactPersonRole).trim() : ""
  const initialContacts =
    contactName && contactRole
      ? [
          {
            role: contactRole,
            name: contactName,
            phone: sourceNumber || undefined,
            isActive: true,
          },
        ]
      : contactName
        ? [
            {
              role: "Contact",
              name: contactName,
              phone: sourceNumber || undefined,
              isActive: true,
            },
          ]
        : []

  const profile = await StockClient.findOneAndUpdate(
    {
      org_id: input.org_id,
      sourceName,
      sourceNumber,
      sourceLocation,
    },
    {
      $set: {
        legalName: resolvedLegalName,
        contactPerson: contactName || undefined,
        kraPin: input.kraPin ? String(input.kraPin).trim().toUpperCase() : undefined,
        email: input.email ? String(input.email).trim() : undefined,
        branchId: input.branchId ? String(input.branchId).trim() : undefined,
        hasKraDetails: Boolean(input.kraPin),
        updatedBy: String(input.actorId),
      },
      $setOnInsert: {
        org_id: input.org_id,
        sourceName,
        sourceNumber,
        sourceLocation,
        createdBy: String(input.actorId),
        contacts: initialContacts,
      },
    },
    { upsert: true, new: true },
  )

  if (
    profile &&
    initialContacts.length > 0 &&
    (!Array.isArray(profile.contacts) || profile.contacts.length === 0)
  ) {
    profile.contacts = initialContacts as any
    await profile.save()
  }

  if (sourceLocation && profile) {
    const memberKey = buildClientMemberKey(sourceName, sourceNumber, sourceLocation)
    let countyGroup = await StockClientGroup.findOne({
      org_id: input.org_id,
      name: sourceLocation,
    })
    if (!countyGroup) {
      countyGroup = await StockClientGroup.create({
        org_id: input.org_id,
        name: sourceLocation,
        description: "County group",
        memberKeys: [memberKey],
        createdBy: String(input.actorId),
        updatedBy: String(input.actorId),
      })
    } else {
      await StockClientGroup.updateOne(
        { _id: countyGroup._id, org_id: input.org_id },
        {
          $addToSet: { memberKeys: memberKey },
          $set: { updatedBy: String(input.actorId) },
        },
      )
    }
    const groupId = String(countyGroup._id)
    if (!(profile.groupIds || []).map(String).includes(groupId)) {
      profile.groupIds = [...(profile.groupIds || []), groupId]
      profile.updatedBy = String(input.actorId)
      await profile.save()
    }
  }

  return profile
}
