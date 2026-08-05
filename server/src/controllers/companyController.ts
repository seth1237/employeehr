import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { Company } from "../models/Company";
import { User } from "../models/User";
import { Department } from "../models/Department";
import { Branch } from "../models/Branch";
import AuditLog from "../models/AuditLog";

const ADMIN_SECTION_OPTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
];

const PERMISSION_OPTIONS = [
  "users:read",
  "users:write",
  "users:delete",
  "payroll:read",
  "payroll:write",
  "stock:read",
  "stock:write",
  "stock:approve",
  "accounts:read",
  "accounts:write",
  "reports:read",
  "reports:approve",
  "settings:read",
  "settings:write",
];

const DEFAULT_PERMISSION_MATRIX: Record<string, string[]> = {
  company_admin: PERMISSION_OPTIONS,
  admin: PERMISSION_OPTIONS.filter(
    (permission) => permission !== "settings:write",
  ),
  hr: [
    "users:read",
    "users:write",
    "payroll:read",
    "reports:read",
    "settings:read",
  ],
  manager: ["users:read", "reports:read", "stock:read"],
  employee: ["reports:read"],
};

const sanitizeList = (value: unknown, allowed: string[]): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = Array.from(
    new Set(value.filter((item): item is string => typeof item === "string")),
  );
  return unique.filter((item) => allowed.includes(item));
};

const normalizeSettingsMap = (value: unknown, allowed: string[]) => {
  const entries: Array<[string, unknown]> =
    value instanceof Map
      ? Array.from(value.entries())
      : Object.entries(value || {});

  return Object.fromEntries(
    entries
      .filter(([key]) => typeof key === "string" && key.length > 0)
      .map(([key, list]) => [key, sanitizeList(list, allowed)]),
  );
};

const buildRoleSectionDefaults = (raw: any) => ({
  company_admin: ADMIN_SECTION_OPTIONS,
  admin:
    sanitizeList(raw?.admin, ADMIN_SECTION_OPTIONS).length > 0
      ? sanitizeList(raw.admin, ADMIN_SECTION_OPTIONS)
      : ADMIN_SECTION_OPTIONS,
  hr: sanitizeList(raw?.hr, ADMIN_SECTION_OPTIONS),
  manager: sanitizeList(raw?.manager, ADMIN_SECTION_OPTIONS),
  employee: sanitizeList(raw?.employee, ADMIN_SECTION_OPTIONS),
});

const buildPermissionDefaults = (raw: any) => ({
  company_admin: PERMISSION_OPTIONS,
  admin:
    sanitizeList(raw?.admin, PERMISSION_OPTIONS).length > 0
      ? sanitizeList(raw.admin, PERMISSION_OPTIONS)
      : DEFAULT_PERMISSION_MATRIX.admin,
  hr:
    sanitizeList(raw?.hr, PERMISSION_OPTIONS).length > 0
      ? sanitizeList(raw.hr, PERMISSION_OPTIONS)
      : DEFAULT_PERMISSION_MATRIX.hr,
  manager:
    sanitizeList(raw?.manager, PERMISSION_OPTIONS).length > 0
      ? sanitizeList(raw.manager, PERMISSION_OPTIONS)
      : DEFAULT_PERMISSION_MATRIX.manager,
  employee:
    sanitizeList(raw?.employee, PERMISSION_OPTIONS).length > 0
      ? sanitizeList(raw.employee, PERMISSION_OPTIONS)
      : DEFAULT_PERMISSION_MATRIX.employee,
});

const logPermissionChange = async (
  req: AuthenticatedRequest,
  changes: Record<string, any>,
) => {
  if (!req.org_id || !req.user?.userId) return;

  try {
    await AuditLog.create({
      org_id: req.org_id,
      userId: req.user.userId,
      action: "UPDATE_PERMISSION_SETTINGS",
      resource: "Company.pageAccessSettings",
      resourceId: req.org_id,
      changes,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      status: "success",
      details:
        "Permission, role, user, department, or branch access settings changed",
    });
  } catch (error) {
    console.error("Failed to write permission audit log:", error);
  }
};

const DEFAULT_DISPATCH_SMS_TEMPLATE = [
  "Hello {{clientName}}, your package for invoice {{invoiceNumber}} (DN {{deliveryNoteNumber}}) has been dispatched.",
  "Courier: {{courierName}} ({{courierContactNumber}}).",
  "For inquiries, call office: {{officeContactNumber}}.",
  "Thank you.",
].join(" ");

const DEFAULT_DELIVERY_SMS_TEMPLATE = [
  "Hello {{clientName}}, thank you for confirming delivery of invoice {{invoiceNumber}} (DN {{deliveryNoteNumber}}).",
  "We appreciate your business and hope everything arrived in good condition.",
  "For any support, call {{officeContactNumber}}.",
].join(" ");

const DEFAULT_INVOICE_TERMS = [
  "Payment is due within 7 days from the invoice date.",
  "All items remain the property of the company until fully paid.",
  "Goods once sold are subject to the company return policy.",
].join(" ");

const normalizePaymentChannel = (value: any) => ({
  paymentType: String(value?.paymentType || "bank").trim(),
  mpesaMode: String(value?.mpesaMode || "").trim(),
  channelName: String(value?.channelName || value?.name || "").trim(),
  bankName: String(value?.bankName || "").trim(),
  accountName: String(value?.accountName || "").trim(),
  accountNumber: String(value?.accountNumber || "").trim(),
  paybillNumber: String(value?.paybillNumber || "").trim(),
  tillNumber: String(value?.tillNumber || "").trim(),
  branch: String(value?.branch || "").trim(),
  notes: String(value?.notes || "").trim(),
});

const DISPATCH_SMS_ALLOWED_PLACEHOLDERS = [
  "{{clientName}}",
  "{{invoiceNumber}}",
  "{{deliveryNoteNumber}}",
  "{{courierName}}",
  "{{courierContactNumber}}",
  "{{officeContactNumber}}",
];

const DELIVERY_SMS_ALLOWED_PLACEHOLDERS = [
  ...DISPATCH_SMS_ALLOWED_PLACEHOLDERS,
  "{{arrivalTime}}",
  "{{deliveryCondition}}",
  "{{deliveryNote}}",
];

const buildBaseUrl = (req: AuthenticatedRequest) => {
  const forwardedProtoRaw = String(
    req.headers["x-forwarded-proto"] || "",
  ).trim();
  const forwardedProto = (
    forwardedProtoRaw.split(",")[0] ||
    req.protocol ||
    ""
  ).trim();
  const forwardedHostRaw = String(req.headers["x-forwarded-host"] || "").trim();
  const host = (
    forwardedHostRaw.split(",")[0] ||
    req.headers.host ||
    ""
  ).trim();

  if (process.env.API_URL) return process.env.API_URL;

  if (host) return `${forwardedProto}://${host}`;

  return process.env.NODE_ENV === "production"
    ? "https://backend.codewithseth.co.ke"
    : "http://localhost:5010";
};

export class CompanyController {
  static async getInvoiceSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }

      const company = await Company.findById(req.org_id).select(
        "email phone city state country logo invoiceSettings",
      );
      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      return res.json({
        success: true,
        data: {
          invoiceEmail: String(
            company.invoiceSettings?.invoiceEmail || company.email || "",
          ).trim(),
          contactPhone: String(
            company.invoiceSettings?.contactPhone || company.phone || "",
          ).trim(),
          officeLocation: String(
            company.invoiceSettings?.officeLocation ||
              [company.city, company.state, company.country]
                .filter(Boolean)
                .join(", ") ||
              "",
          ).trim(),
          secondLocation: String(
            company.invoiceSettings?.secondLocation || "",
          ).trim(),
          useBothLocations: company.invoiceSettings?.useBothLocations ?? false,
          contactEmail: String(
            company.invoiceSettings?.contactEmail ||
              company.invoiceSettings?.invoiceEmail ||
              company.email ||
              "",
          ).trim(),
          website: String(
            company.invoiceSettings?.website || company.website || "",
          ).trim(),
          vatNumber: String(company.invoiceSettings?.vatNumber || "").trim(),
          pinNumber: String(company.invoiceSettings?.pinNumber || "").trim(),
          termsAndConditions: String(
            company.invoiceSettings?.termsAndConditions ||
              DEFAULT_INVOICE_TERMS,
          ).trim(),
          includeQuotationReference:
            company.invoiceSettings?.includeQuotationReference ?? true,
          includeDeliveryNoteNumber:
            company.invoiceSettings?.includeDeliveryNoteNumber ?? true,
          includePreparedBy: company.invoiceSettings?.includePreparedBy ?? true,
          includeVat: company.invoiceSettings?.includeVat ?? false,
          includePaymentChannels:
            company.invoiceSettings?.includePaymentChannels ?? true,
          paymentChannels: Array.isArray(
            company.invoiceSettings?.paymentChannels,
          )
            ? company.invoiceSettings.paymentChannels.map(
                normalizePaymentChannel,
              )
            : [],
          logoUrl: company.logo || "",
          defaultTermsAndConditions: DEFAULT_INVOICE_TERMS,
        },
      });
    } catch (error) {
      console.error("Error fetching invoice settings:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch invoice settings" });
    }
  }

  static async updateInvoiceSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }

      const invoiceEmail = String(req.body?.invoiceEmail || "").trim();
      const contactPhone = String(req.body?.contactPhone || "").trim();
      const officeLocation = String(req.body?.officeLocation || "").trim();
      const secondLocation = String(req.body?.secondLocation || "").trim();
      const useBothLocations = Boolean(req.body?.useBothLocations);
      const contactEmail = String(req.body?.contactEmail || "").trim();
      const website = String(req.body?.website || "").trim();
      const vatNumber = String(req.body?.vatNumber || "").trim();
      const pinNumber = String(req.body?.pinNumber || "").trim();
      const termsAndConditions = String(
        req.body?.termsAndConditions || "",
      ).trim();
      const includeQuotationReference = Boolean(
        req.body?.includeQuotationReference,
      );
      const includeDeliveryNoteNumber = Boolean(
        req.body?.includeDeliveryNoteNumber,
      );
      const includePreparedBy = Boolean(req.body?.includePreparedBy);
      const includeVat = Boolean(req.body?.includeVat);
      const includePaymentChannels = Boolean(req.body?.includePaymentChannels);
      const paymentChannels = Array.isArray(req.body?.paymentChannels)
        ? req.body.paymentChannels
            .map(normalizePaymentChannel)
            .filter(
              (channel: any) =>
                channel.channelName ||
                channel.bankName ||
                channel.accountNumber ||
                channel.branch ||
                channel.notes,
            )
        : [];

      if (!invoiceEmail) {
        return res
          .status(400)
          .json({ success: false, message: "invoiceEmail is required" });
      }

      if (!termsAndConditions) {
        return res
          .status(400)
          .json({ success: false, message: "termsAndConditions is required" });
      }

      if (termsAndConditions.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "termsAndConditions is too long (max 2000 characters)",
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        {
          $set: {
            "invoiceSettings.invoiceEmail": invoiceEmail,
            "invoiceSettings.contactPhone": contactPhone,
            "invoiceSettings.officeLocation": officeLocation,
            "invoiceSettings.secondLocation": secondLocation,
            "invoiceSettings.useBothLocations": useBothLocations,
            "invoiceSettings.contactEmail": contactEmail || invoiceEmail,
            "invoiceSettings.website": website,
            "invoiceSettings.vatNumber": vatNumber,
            "invoiceSettings.pinNumber": pinNumber,
            "invoiceSettings.termsAndConditions": termsAndConditions,
            "invoiceSettings.includeQuotationReference":
              includeQuotationReference,
            "invoiceSettings.includeDeliveryNoteNumber":
              includeDeliveryNoteNumber,
            "invoiceSettings.includePreparedBy": includePreparedBy,
            "invoiceSettings.includeVat": includeVat,
            "invoiceSettings.includePaymentChannels": includePaymentChannels,
            "invoiceSettings.paymentChannels": paymentChannels,
          },
        },
        { new: true },
      ).select("email phone city state country logo invoiceSettings");

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      return res.json({
        success: true,
        message: "Invoice settings updated successfully",
        data: {
          invoiceEmail: String(
            company.invoiceSettings?.invoiceEmail || company.email || "",
          ).trim(),
          contactPhone: String(
            company.invoiceSettings?.contactPhone || company.phone || "",
          ).trim(),
          officeLocation: String(
            company.invoiceSettings?.officeLocation ||
              [company.city, company.state, company.country]
                .filter(Boolean)
                .join(", ") ||
              "",
          ).trim(),
          secondLocation: String(
            company.invoiceSettings?.secondLocation || "",
          ).trim(),
          useBothLocations: company.invoiceSettings?.useBothLocations ?? false,
          contactEmail: String(
            company.invoiceSettings?.contactEmail ||
              company.invoiceSettings?.invoiceEmail ||
              company.email ||
              "",
          ).trim(),
          termsAndConditions: String(
            company.invoiceSettings?.termsAndConditions ||
              DEFAULT_INVOICE_TERMS,
          ).trim(),
          includeQuotationReference:
            company.invoiceSettings?.includeQuotationReference ?? true,
          includeDeliveryNoteNumber:
            company.invoiceSettings?.includeDeliveryNoteNumber ?? true,
          includePreparedBy: company.invoiceSettings?.includePreparedBy ?? true,
          includeVat: company.invoiceSettings?.includeVat ?? false,
          includePaymentChannels:
            company.invoiceSettings?.includePaymentChannels ?? true,
          paymentChannels: Array.isArray(
            company.invoiceSettings?.paymentChannels,
          )
            ? company.invoiceSettings.paymentChannels.map(
                normalizePaymentChannel,
              )
            : [],
          logoUrl: company.logo || "",
          defaultTermsAndConditions: DEFAULT_INVOICE_TERMS,
        },
      });
    } catch (error) {
      console.error("Error updating invoice settings:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update invoice settings" });
    }
  }

  static async getDispatchSmsSettings(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }

      const company = await Company.findById(req.org_id).select(
        "name phone dispatchSmsSettings",
      );
      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      const officePhone = String(
        company.dispatchSmsSettings?.officePhone || company.phone || "",
      ).trim();
      const messageTemplate = String(
        company.dispatchSmsSettings?.messageTemplate ||
          DEFAULT_DISPATCH_SMS_TEMPLATE,
      ).trim();
      const deliveryMessageTemplate = String(
        company.dispatchSmsSettings?.deliveryMessageTemplate ||
          DEFAULT_DELIVERY_SMS_TEMPLATE,
      ).trim();
      const smsSenderName = String(
        company.dispatchSmsSettings?.smsSenderName ||
          company.name ||
          "YourCompany",
      ).trim();

      return res.json({
        success: true,
        data: {
          officePhone,
          messageTemplate,
          deliveryMessageTemplate,
          smsSenderName,
          placeholders: DISPATCH_SMS_ALLOWED_PLACEHOLDERS,
          deliveryPlaceholders: DELIVERY_SMS_ALLOWED_PLACEHOLDERS,
          defaultTemplate: DEFAULT_DISPATCH_SMS_TEMPLATE,
          defaultDeliveryTemplate: DEFAULT_DELIVERY_SMS_TEMPLATE,
        },
      });
    } catch (error) {
      console.error("Error fetching dispatch SMS settings:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch dispatch SMS settings",
      });
    }
  }

  static async updateDispatchSmsSettings(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }

      const officePhone = String(req.body?.officePhone || "").trim();
      const messageTemplate = String(req.body?.messageTemplate || "").trim();
      const deliveryMessageTemplate = String(
        req.body?.deliveryMessageTemplate || DEFAULT_DELIVERY_SMS_TEMPLATE,
      ).trim();
      const smsSenderName = String(
        req.body?.smsSenderName || "YourCompany",
      ).trim();

      if (!officePhone) {
        return res
          .status(400)
          .json({ success: false, message: "officePhone is required" });
      }

      if (!messageTemplate) {
        return res
          .status(400)
          .json({ success: false, message: "messageTemplate is required" });
      }

      if (!deliveryMessageTemplate) {
        return res.status(400).json({
          success: false,
          message: "deliveryMessageTemplate is required",
        });
      }

      if (!smsSenderName) {
        return res
          .status(400)
          .json({ success: false, message: "smsSenderName is required" });
      }

      if (messageTemplate.length > 800) {
        return res.status(400).json({
          success: false,
          message: "messageTemplate is too long (max 800 characters)",
        });
      }

      if (deliveryMessageTemplate.length > 800) {
        return res.status(400).json({
          success: false,
          message: "deliveryMessageTemplate is too long (max 800 characters)",
        });
      }

      if (smsSenderName.length > 50) {
        return res.status(400).json({
          success: false,
          message: "smsSenderName is too long (max 50 characters)",
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        {
          $set: {
            "dispatchSmsSettings.officePhone": officePhone,
            "dispatchSmsSettings.messageTemplate": messageTemplate,
            "dispatchSmsSettings.deliveryMessageTemplate":
              deliveryMessageTemplate,
            "dispatchSmsSettings.smsSenderName": smsSenderName,
          },
        },
        { new: true },
      ).select("name phone dispatchSmsSettings");

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      return res.json({
        success: true,
        message: "Dispatch SMS settings updated successfully",
        data: {
          officePhone: String(
            company.dispatchSmsSettings?.officePhone || company.phone || "",
          ).trim(),
          messageTemplate: String(
            company.dispatchSmsSettings?.messageTemplate ||
              DEFAULT_DISPATCH_SMS_TEMPLATE,
          ).trim(),
          deliveryMessageTemplate: String(
            company.dispatchSmsSettings?.deliveryMessageTemplate ||
              DEFAULT_DELIVERY_SMS_TEMPLATE,
          ).trim(),
          smsSenderName: String(
            company.dispatchSmsSettings?.smsSenderName ||
              company.name ||
              "YourCompany",
          ).trim(),
          placeholders: DISPATCH_SMS_ALLOWED_PLACEHOLDERS,
          deliveryPlaceholders: DELIVERY_SMS_ALLOWED_PLACEHOLDERS,
          defaultTemplate: DEFAULT_DISPATCH_SMS_TEMPLATE,
          defaultDeliveryTemplate: DEFAULT_DELIVERY_SMS_TEMPLATE,
        },
      });
    } catch (error) {
      console.error("Error updating dispatch SMS settings:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update dispatch SMS settings",
      });
    }
  }

  static async getPageAccessSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }

      const company = await Company.findById(req.org_id).select(
        "pageAccessSettings",
      );
      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      const settings = company.pageAccessSettings as any;
      const roleSections = buildRoleSectionDefaults(
        settings?.adminSectionsByRole,
      );
      const userSections = normalizeSettingsMap(
        settings?.adminSectionsByUser,
        ADMIN_SECTION_OPTIONS,
      );
      const departmentSections = normalizeSettingsMap(
        settings?.adminSectionsByDepartment,
        ADMIN_SECTION_OPTIONS,
      );
      const branchSections = normalizeSettingsMap(
        settings?.adminSectionsByBranch,
        ADMIN_SECTION_OPTIONS,
      );
      const permissionMatrixByRole = buildPermissionDefaults(
        settings?.permissionMatrixByRole,
      );
      const permissionMatrixByUser = normalizeSettingsMap(
        settings?.permissionMatrixByUser,
        PERMISSION_OPTIONS,
      );

      const user = req.user?.userId
        ? await User.findOne({ _id: req.user.userId, org_id: req.org_id })
            .select("department role")
            .lean()
        : null;

      const matchingDepartment = user?.department
        ? await Department.findOne({
            org_id: req.org_id,
            name: {
              $regex: new RegExp(
                `^${String(user.department).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          })
            .select("_id name")
            .lean()
        : null;

      const managedBranches = req.user?.userId
        ? await Branch.find({
            org_id: req.org_id,
            managerId: req.user.userId,
            isActive: true,
          })
            .select("_id name code")
            .lean()
        : [];

      const rawRole = String(req.user?.role || user?.role || "employee");
      const role =
        rawRole in roleSections
          ? (rawRole as keyof typeof roleSections)
          : "employee";
      const directUserSections = req.user?.userId
        ? userSections[req.user.userId] || []
        : [];
      const currentDepartmentSections = matchingDepartment?._id
        ? departmentSections[String(matchingDepartment._id)] || []
        : [];
      const currentBranchSections = managedBranches.flatMap(
        (branch: any) => branchSections[String(branch._id)] || [],
      );

      const effectiveSections = Array.from(
        new Set([
          ...(roleSections[role] || []),
          ...directUserSections,
          ...currentDepartmentSections,
          ...currentBranchSections,
        ]),
      );

      const effectivePermissions = Array.from(
        new Set([
          ...(permissionMatrixByRole[role] || []),
          ...(req.user?.userId
            ? permissionMatrixByUser[req.user.userId] || []
            : []),
        ]),
      );

      return res.json({
        success: true,
        data: {
          adminSectionsByRole: roleSections,
          adminSectionsByUser: userSections,
          adminSectionsByDepartment: departmentSections,
          adminSectionsByBranch: branchSections,
          permissionMatrixByRole,
          permissionMatrixByUser,
          effectiveSections,
          effectivePermissions,
          currentDepartment: matchingDepartment || null,
          managedBranches,
          availableSections: ADMIN_SECTION_OPTIONS,
          availablePermissions: PERMISSION_OPTIONS,
        },
      });
    } catch (error) {
      console.error("Error fetching page access settings:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch page access settings" });
    }
  }

  static async getStockSettings(req: AuthenticatedRequest, res: Response) {
      try {
        if (!req.org_id) {
          return res.status(400).json({ success: false, message: "Organization context required" });
        }

        const company = await Company.findById(req.org_id).select("stockSettings").lean();
        if (!company) return res.status(404).json({ success: false, message: "Company not found" });

        return res.json({ success: true, data: { stockSettings: company.stockSettings || {} } });
      } catch (error) {
        console.error("Error fetching stock settings:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stock settings" });
      }
    }

    static async updateStockSettings(req: AuthenticatedRequest, res: Response) {
      try {
        if (!req.org_id) {
          return res.status(400).json({ success: false, message: "Organization context required" });
        }

        const bypass = Boolean(req.body?.bypassWebsiteQuotationApproval);

        const company = await Company.findByIdAndUpdate(
          req.org_id,
          { $set: { "stockSettings.bypassWebsiteQuotationApproval": bypass } },
          { new: true },
        ).select("stockSettings");

        if (!company) return res.status(404).json({ success: false, message: "Company not found" });

        return res.json({ success: true, message: "Stock settings updated", data: { stockSettings: company.stockSettings } });
      } catch (error) {
        console.error("Error updating stock settings:", error);
        return res.status(500).json({ success: false, message: "Failed to update stock settings" });
      }
    }

  static async updatePageAccessSettings(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }

      const previous = await Company.findById(req.org_id)
        .select("pageAccessSettings")
        .lean();
      const payload = req.body?.adminSectionsByRole || {};
      const userPayload = req.body?.adminSectionsByUser || {};
      const departmentPayload = req.body?.adminSectionsByDepartment || {};
      const branchPayload = req.body?.adminSectionsByBranch || {};
      const permissionsPayload = req.body?.permissionMatrixByRole || {};
      const userPermissionsPayload = req.body?.permissionMatrixByUser || {};

      const adminSections = sanitizeList(payload.admin, ADMIN_SECTION_OPTIONS);
      const nextSettings = {
        company_admin: ADMIN_SECTION_OPTIONS,
        admin: adminSections.length > 0 ? adminSections : ADMIN_SECTION_OPTIONS,
        hr: sanitizeList(payload.hr, ADMIN_SECTION_OPTIONS),
        manager: sanitizeList(payload.manager, ADMIN_SECTION_OPTIONS),
        employee: sanitizeList(payload.employee, ADMIN_SECTION_OPTIONS),
      };

      const nextUserSettings = normalizeSettingsMap(
        userPayload,
        ADMIN_SECTION_OPTIONS,
      );
      const nextDepartmentSettings = normalizeSettingsMap(
        departmentPayload,
        ADMIN_SECTION_OPTIONS,
      );
      const nextBranchSettings = normalizeSettingsMap(
        branchPayload,
        ADMIN_SECTION_OPTIONS,
      );
      const nextPermissionMatrix = buildPermissionDefaults(permissionsPayload);
      const nextUserPermissionSettings = normalizeSettingsMap(
        userPermissionsPayload,
        PERMISSION_OPTIONS,
      );

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        {
          $set: {
            pageAccessSettings: {
              adminSectionsByRole: nextSettings,
              adminSectionsByUser: nextUserSettings,
              adminSectionsByDepartment: nextDepartmentSettings,
              adminSectionsByBranch: nextBranchSettings,
              permissionMatrixByRole: nextPermissionMatrix,
              permissionMatrixByUser: nextUserPermissionSettings,
            },
          },
        },
        { new: true },
      ).select("pageAccessSettings");

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      await logPermissionChange(req, {
        before: previous?.pageAccessSettings || null,
        after: {
          adminSectionsByRole: nextSettings,
          adminSectionsByUser: nextUserSettings,
          adminSectionsByDepartment: nextDepartmentSettings,
          adminSectionsByBranch: nextBranchSettings,
          permissionMatrixByRole: nextPermissionMatrix,
          permissionMatrixByUser: nextUserPermissionSettings,
        },
      });

      return res.json({
        success: true,
        message: "Page access settings updated successfully",
        data: {
          adminSectionsByRole: nextSettings,
          adminSectionsByUser: nextUserSettings,
          adminSectionsByDepartment: nextDepartmentSettings,
          adminSectionsByBranch: nextBranchSettings,
          permissionMatrixByRole: nextPermissionMatrix,
          permissionMatrixByUser: nextUserPermissionSettings,
          availableSections: ADMIN_SECTION_OPTIONS,
          availablePermissions: PERMISSION_OPTIONS,
        },
      });
    } catch (error) {
      console.error("Error updating page access settings:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update page access settings",
      });
    }
  }

  static async getBranding(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }
      const company = await Company.findById(req.org_id).select(
        "logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle glassEnabled glassOpacity glassBlur glassTint buttonShadow hoverAnimation buttonGradient glowEffect transparency rippleEffect animationSpeed cardStyle sidebarStyle borderStyle cornerStyle pageBackground iconStyle buttonSize buttonPadding navigationAnimation themePreset name slug email phone website city state country",
      );
      if (!company)
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });

      // Build full logo URL if it's a file path
      const baseUrl = buildBaseUrl(req);
      const logoUrl =
        company.logo && !company.logo.startsWith("http")
          ? `${baseUrl}/uploads/logos/${company.logo}`
          : company.logo;

      return res.json({
        success: true,
        data: { ...company.toObject(), logo: logoUrl },
      });
    } catch (error) {
      console.error("Error fetching branding:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch branding" });
    }
  }

  static async updateBranding(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res
          .status(400)
          .json({ success: false, message: "Organization context required" });
      }
      const {
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        borderRadius,
        fontFamily,
        buttonStyle,
        logoUrl,
        logo,
        // Advanced branding
        glassEnabled,
        glassOpacity,
        glassBlur,
        glassTint,
        buttonShadow,
        hoverAnimation,
        buttonGradient,
        glowEffect,
        transparency,
        rippleEffect,
        animationSpeed,
        cardStyle,
        sidebarStyle,
        borderStyle,
        cornerStyle,
        pageBackground,
        iconStyle,
        buttonSize,
        buttonPadding,
        navigationAnimation,
        themePreset,
      } = req.body;
      const updateFields: any = {};

      // Core colors
      if (primaryColor !== undefined) updateFields.primaryColor = primaryColor;
      if (secondaryColor !== undefined)
        updateFields.secondaryColor = secondaryColor;
      if (accentColor !== undefined) updateFields.accentColor = accentColor;
      if (backgroundColor !== undefined)
        updateFields.backgroundColor = backgroundColor;
      if (textColor !== undefined) updateFields.textColor = textColor;
      if (borderRadius !== undefined) updateFields.borderRadius = borderRadius;
      if (fontFamily !== undefined) updateFields.fontFamily = fontFamily;
      if (buttonStyle !== undefined) updateFields.buttonStyle = buttonStyle;

      // Advanced branding
      if (glassEnabled !== undefined) updateFields.glassEnabled = glassEnabled;
      if (glassOpacity !== undefined)
        updateFields.glassOpacity = Math.max(0, Math.min(100, glassOpacity));
      if (glassBlur !== undefined)
        updateFields.glassBlur = Math.max(0, Math.min(40, glassBlur));
      if (glassTint !== undefined) updateFields.glassTint = glassTint;
      if (buttonShadow !== undefined) updateFields.buttonShadow = buttonShadow;
      if (hoverAnimation !== undefined)
        updateFields.hoverAnimation = hoverAnimation;
      if (buttonGradient !== undefined)
        updateFields.buttonGradient = buttonGradient;
      if (glowEffect !== undefined) updateFields.glowEffect = glowEffect;
      if (transparency !== undefined)
        updateFields.transparency = Math.max(0, Math.min(40, transparency));
      if (rippleEffect !== undefined) updateFields.rippleEffect = rippleEffect;
      if (animationSpeed !== undefined)
        updateFields.animationSpeed = animationSpeed;
      if (cardStyle !== undefined) updateFields.cardStyle = cardStyle;
      if (sidebarStyle !== undefined) updateFields.sidebarStyle = sidebarStyle;
      if (borderStyle !== undefined) updateFields.borderStyle = borderStyle;
      if (cornerStyle !== undefined) updateFields.cornerStyle = cornerStyle;
      if (pageBackground !== undefined)
        updateFields.pageBackground = pageBackground;
      if (iconStyle !== undefined) updateFields.iconStyle = iconStyle;
      if (buttonSize !== undefined) updateFields.buttonSize = buttonSize;
      if (buttonPadding !== undefined)
        updateFields.buttonPadding = buttonPadding;
      if (navigationAnimation !== undefined)
        updateFields.navigationAnimation = navigationAnimation;
      if (themePreset !== undefined) updateFields.themePreset = themePreset;

      // Handle logo upload or URL (accept both logoUrl and logo fields)
      if (req.file) {
        // Save only filename, not full path
        updateFields.logo = req.file.filename;
      } else if (logoUrl !== undefined || logo !== undefined) {
        // Save external URL directly
        updateFields.logo = logoUrl ?? logo;
      }

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        { $set: updateFields },
        { new: true, runValidators: true },
      ).select(
        "logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle glassEnabled glassOpacity glassBlur glassTint buttonShadow hoverAnimation buttonGradient glowEffect transparency rippleEffect animationSpeed cardStyle sidebarStyle borderStyle cornerStyle pageBackground iconStyle buttonSize buttonPadding navigationAnimation themePreset name slug email phone website city state country",
      );

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      // Build full logo URL for response
      const baseUrl = buildBaseUrl(req);
      const logoResponseUrl =
        company.logo && !company.logo.startsWith("http")
          ? `${baseUrl}/uploads/logos/${company.logo}`
          : company.logo;

      const responseData = { ...company.toObject(), logo: logoResponseUrl };
      return res.json({ success: true, data: responseData });
    } catch (error) {
      console.error("Error updating branding:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update branding" });
    }
  }
}
