import mongoose, { Schema, type Document } from "mongoose";
import type { ICompany } from "../types/interfaces";

const DEFAULT_ADMIN_SECTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
];

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true }, // Unique company identifier for login URLs
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    website: { type: String },
    industry: { type: String, required: true },
    employeeCount: { type: Number, required: true },
    logo: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    countryCode: { type: String }, // ISO 2-letter code for Holiday API (e.g., US, KE)
    primaryColor: { type: String, default: "#2563eb" }, // Company branding
    secondaryColor: { type: String, default: "#059669" },
    accentColor: { type: String, default: "#f59e0b" },
    backgroundColor: { type: String, default: "#ffffff" },
    textColor: { type: String, default: "#1f2937" },
    borderRadius: { type: String, default: "0.5rem" },
    fontFamily: { type: String, default: "system-ui" },
    buttonStyle: {
      type: String,
      enum: ["rounded", "sharp", "pill"],
      default: "rounded",
    },
    // Advanced Branding Features
    glassEnabled: { type: Boolean, default: true },
    glassOpacity: { type: Number, default: 15 }, // 0-100
    glassBlur: { type: Number, default: 18 }, // 0-40px
    glassTint: {
      type: String,
      enum: ["white", "primary", "custom"],
      default: "white",
    },
    buttonShadow: {
      type: String,
      enum: ["none", "small", "medium", "large", "floating"],
      default: "medium",
    },
    hoverAnimation: {
      type: String,
      enum: ["lift", "glow", "scale", "pulse", "rotate", "none"],
      default: "lift",
    },
    buttonGradient: { type: Boolean, default: true },
    glowEffect: {
      type: String,
      enum: ["off", "soft", "medium", "strong", "neon"],
      default: "soft",
    },
    transparency: { type: Number, default: 0 }, // 0-40
    rippleEffect: { type: Boolean, default: true },
    animationSpeed: {
      type: String,
      enum: ["fast", "normal", "slow"],
      default: "normal",
    },
    cardStyle: {
      type: String,
      enum: ["flat", "glass", "floating", "outlined", "shadow", "elevated"],
      default: "glass",
    },
    sidebarStyle: {
      type: String,
      enum: ["solid", "glass", "floating", "collapsed", "rounded", "gradient"],
      default: "glass",
    },
    borderStyle: {
      type: String,
      enum: ["solid", "gradient", "glass", "outlined", "dashed"],
      default: "solid",
    },
    cornerStyle: {
      type: String,
      enum: ["sharp", "rounded", "soft", "pill", "squircle"],
      default: "rounded",
    },
    pageBackground: {
      type: String,
      enum: [
        "solid",
        "gradient",
        "glass",
        "pattern",
        "mesh",
        "image",
        "animated",
      ],
      default: "gradient",
    },
    iconStyle: {
      type: String,
      enum: [
        "text-only",
        "icon-left",
        "icon-right",
        "icon-only",
        "rounded-icon",
      ],
      default: "icon-left",
    },
    buttonSize: {
      type: String,
      enum: ["xs", "small", "medium", "large", "xl"],
      default: "medium",
    },
    buttonPadding: {
      type: String,
      enum: ["compact", "comfortable", "spacious"],
      default: "comfortable",
    },
    navigationAnimation: {
      type: String,
      enum: ["fade", "slide", "scale", "none"],
      default: "slide",
    },
    themePreset: {
      type: String,
      enum: [
        "default",
        "corporate",
        "healthcare",
        "finance",
        "dark-glass",
        "ocean",
        "emerald",
        "royal-blue",
        "minimal",
        "apple",
        "stripe",
        "vercel",
        "linear",
      ],
      default: "corporate",
    },
    subscription: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
      default: "starter",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "inactive"],
      default: "active",
    },
    emailConfig: {
      enabled: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      fromName: { type: String },
      fromEmail: { type: String },
      smtp: {
        host: { type: String },
        port: { type: Number },
        secure: { type: Boolean, default: false },
        username: { type: String },
        password: { type: String }, // Should be encrypted
      },
    },
    invoiceSettings: {
      invoiceEmail: { type: String },
      contactPhone: { type: String },
      officeLocation: { type: String },
      secondLocation: { type: String },
      useBothLocations: { type: Boolean, default: false },
      contactEmail: { type: String },
      website: { type: String },
      vatNumber: { type: String },
      pinNumber: { type: String },
      termsAndConditions: { type: String },
      includeQuotationReference: { type: Boolean, default: true },
      includeDeliveryNoteNumber: { type: Boolean, default: true },
      includePreparedBy: { type: Boolean, default: true },
      includeVat: { type: Boolean, default: true },
      includePaymentChannels: { type: Boolean, default: true },
      paymentChannels: {
        type: [
          {
            paymentType: { type: String, default: "bank" },
            mpesaMode: { type: String },
            channelName: { type: String },
            bankName: { type: String },
            accountName: { type: String },
            accountNumber: { type: String },
            paybillNumber: { type: String },
            tillNumber: { type: String },
            branch: { type: String },
            notes: { type: String },
          },
        ],
        default: [],
      },
    },
    dispatchSmsSettings: {
      officePhone: { type: String },
      messageTemplate: { type: String },
      deliveryMessageTemplate: { type: String },
      smsSenderName: { type: String },
    },
    stockSettings: {
      bypassWebsiteQuotationApproval: { type: Boolean, default: false },
    },
    setupProgress: {
      completed: { type: Boolean, default: false },
      currentStep: { type: String, default: "companyInfo" },
      steps: {
        companyInfo: { type: Boolean, default: false },
        branding: { type: Boolean, default: false },
        emailConfig: { type: Boolean, default: false },
        employees: { type: Boolean, default: false },
        kpis: { type: Boolean, default: false },
      },
    },
    pageAccessSettings: {
      adminSectionsByRole: {
        company_admin: { type: [String], default: DEFAULT_ADMIN_SECTIONS },
        admin: { type: [String], default: DEFAULT_ADMIN_SECTIONS },
        hr: { type: [String], default: DEFAULT_ADMIN_SECTIONS },
        manager: { type: [String], default: [] },
        employee: { type: [String], default: [] },
      },
      adminSectionsByUser: {
        type: Map,
        of: [String],
        default: {},
      },
      adminSectionsByDepartment: {
        type: Map,
        of: [String],
        default: {},
      },
      adminSectionsByBranch: {
        type: Map,
        of: [String],
        default: {},
      },
      permissionMatrixByRole: {
        type: Map,
        of: [String],
        default: {},
      },
      permissionMatrixByUser: {
        type: Map,
        of: [String],
        default: {},
      },
    },
    enabledPages: {
      type: [String],
      default: [
        "dashboard",
        "attendance",
        "leave",
        "performance",
        "kpis",
        "feedback",
        "meetings",
        "stock",
        "payroll",
        "recruitment",
        "communications",
        "reports",
      ],
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    frozenReason: {
      type: String,
      default: null,
    },
    frozenAt: {
      type: Date,
      default: null,
    },
    frozenBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export const Company = mongoose.model<ICompany>("Company", companySchema);
