import mongoose, { Schema } from "mongoose"
import type { IOnboardingTask } from "./OnboardingChecklist"
import { DEFAULT_ONBOARDING_TASKS } from "./OnboardingChecklist"

export interface IOnboardingField {
  field_id: string
  label: string
  type: "text" | "textarea" | "email" | "phone" | "number" | "date" | "select" | "file" | "checkbox"
  required: boolean
  placeholder?: string
  options?: string[]
  mapsTo?: string
}

export interface IOnboardingSection {
  section_id: string
  title: string
  description?: string
  fields: IOnboardingField[]
}

export interface IOnboardingTemplate {
  _id?: string
  org_id: string
  name: string
  isDefault: boolean
  sections: IOnboardingSection[]
  tasks: Array<Pick<IOnboardingTask, "title" | "assigneeRole" | "dueOffsetDays">>
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

const fieldSchema = new Schema<IOnboardingField>(
  {
    field_id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "textarea", "email", "phone", "number", "date", "select", "file", "checkbox"],
      default: "text",
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    options: [{ type: String }],
    mapsTo: { type: String },
  },
  { _id: false },
)

const sectionSchema = new Schema<IOnboardingSection>(
  {
    section_id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    fields: { type: [fieldSchema], default: [] },
  },
  { _id: false },
)

const templateSchema = new Schema<IOnboardingTemplate>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
    sections: { type: [sectionSchema], default: [] },
    tasks: {
      type: [
        {
          title: { type: String, required: true },
          assigneeRole: {
            type: String,
            enum: ["hr", "manager", "it", "employee", "other"],
            default: "hr",
          },
          dueOffsetDays: { type: Number, default: 7 },
        },
      ],
      default: [],
    },
    createdBy: { type: String },
  },
  { timestamps: true },
)

templateSchema.index({ org_id: 1, isDefault: 1 })

export const OnboardingTemplate = mongoose.model<IOnboardingTemplate>(
  "OnboardingTemplate",
  templateSchema,
)

export const DEFAULT_ONBOARDING_SECTIONS: IOnboardingSection[] = [
  {
    section_id: "personal",
    title: "Personal",
    description: "Identity used on the employee record once onboarding is complete.",
    fields: [
      { field_id: "firstName", label: "First name", type: "text", required: true, mapsTo: "firstName" },
      { field_id: "lastName", label: "Last name", type: "text", required: true, mapsTo: "lastName" },
      { field_id: "email", label: "Work email", type: "email", required: true, mapsTo: "email" },
      { field_id: "phone", label: "Phone", type: "phone", required: false, mapsTo: "phone" },
    ],
  },
  {
    section_id: "statutory",
    title: "Statutory",
    fields: [
      { field_id: "national_id", label: "National ID", type: "text", required: false, mapsTo: "national_id" },
      { field_id: "kra_pin", label: "KRA PIN", type: "text", required: false, mapsTo: "kra_pin" },
      { field_id: "nssf_number", label: "NSSF number", type: "text", required: false, mapsTo: "nssf_number" },
      { field_id: "sha_id", label: "SHA ID", type: "text", required: false, mapsTo: "sha_id" },
    ],
  },
  {
    section_id: "role",
    title: "Role",
    fields: [
      { field_id: "department", label: "Department", type: "text", required: false, mapsTo: "department" },
      { field_id: "position", label: "Position", type: "text", required: false, mapsTo: "position" },
      { field_id: "dateOfJoining", label: "Start date", type: "date", required: false, mapsTo: "dateOfJoining" },
      {
        field_id: "employmentType",
        label: "Employment type",
        type: "select",
        required: false,
        options: ["permanent", "contract", "intern", "casual", "consultant"],
        mapsTo: "employmentType",
      },
      { field_id: "salary", label: "Salary", type: "number", required: false, mapsTo: "salary" },
    ],
  },
  {
    section_id: "bank",
    title: "Bank",
    fields: [
      { field_id: "bank_account_name", label: "Account name", type: "text", required: false, mapsTo: "bankDetails.accountName" },
      { field_id: "bank_account_number", label: "Account number", type: "text", required: false, mapsTo: "bankDetails.accountNumber" },
      { field_id: "bank_name", label: "Bank", type: "text", required: false, mapsTo: "bankDetails.bankName" },
      { field_id: "bank_branch", label: "Branch", type: "text", required: false, mapsTo: "bankDetails.bankBranch" },
    ],
  },
]

export function cloneDefaultTemplateParts() {
  return {
    sections: JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_SECTIONS)) as IOnboardingSection[],
    tasks: DEFAULT_ONBOARDING_TASKS.map((task) => ({ ...task })),
  }
}
