export const EMAIL_SENDER_KEYS = [
  "default",
  "hr",
  "stock",
  "technical_service",
  "sales",
  "recruitment",
] as const

export type EmailSenderKey = (typeof EMAIL_SENDER_KEYS)[number]

export type EmailSenderModule = {
  key: EmailSenderKey
  label: string
  hint: string
}

export const EMAIL_SENDER_MODULES: EmailSenderModule[] = [
  {
    key: "default",
    label: "Company default",
    hint: "Used when a module has no address of its own.",
  },
  {
    key: "hr",
    label: "People / HR",
    hint: "Leave, invitations, and meetings.",
  },
  {
    key: "stock",
    label: "Stock & invoices",
    hint: "Invoices, quotations, stock alerts, and client portal login.",
  },
  {
    key: "technical_service",
    label: "Technical service",
    hint: "Machine QR service and product-order requests.",
  },
  {
    key: "sales",
    label: "Sales & marketing",
    hint: "Campaign and test emails.",
  },
  {
    key: "recruitment",
    label: "Recruitment",
    hint: "Job applications and interview mail.",
  },
]

export type EmailSenderIdentity = {
  key: EmailSenderKey
  fromName: string
  fromEmail: string
}
