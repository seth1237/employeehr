export type DeductionType = "percentage" | "fixed" | "progressive"

export type DeductionRule = {
  id: string
  name: string
  type: DeductionType
  value: number
  enabled: boolean
  note?: string
}

export type DeductionItem = { name: string; amount: number }

export type PayeBandSlice = {
  from: number
  to: number | null
  rate: number
  taxable: number
  tax: number
}

export function statutoryKey(name: string) {
  const normalized = String(name || "").trim().toLowerCase()
  if (normalized === "paye" || normalized === "tax") return "paye"
  if (normalized === "shif" || normalized === "sha" || normalized === "nhif") return "shif"
  if (normalized === "nssf") return "nssf"
  if (normalized.includes("housing") && normalized.includes("levy")) return "housing"
  if (normalized === "helb") return "helb"
  if (normalized === "advance") return "advance"
  if (normalized === "savings" || normalized === "saving") return "savings"
  return normalized.replace(/\s+/g, "_")
}

export function statutoryDisplayName(name: string) {
  const key = statutoryKey(name)
  if (key === "paye") return "PAYE"
  if (key === "shif") return "SHIF"
  if (key === "nssf") return "NSSF"
  if (key === "housing") return "Housing Levy"
  if (key === "helb") return "HELB"
  if (key === "advance") return "Advance"
  if (key === "savings") return "Savings"
  return String(name || "").trim()
}

export function isStatutoryDeduction(name: string) {
  return ["paye", "shif", "nssf", "housing"].includes(statutoryKey(name))
}

export function getDeductionAmountByAliases(payroll: any, names: string[]) {
  const wanted = new Set(names.map(statutoryKey))
  return (payroll?.deduction_items || []).reduce((sum: number, item: any) => {
    return wanted.has(statutoryKey(item.name)) ? sum + Number(item.amount || 0) : sum
  }, 0)
}

export function mergeDeductionItems(items: DeductionItem[]): DeductionItem[] {
  const merged = new Map<string, DeductionItem>()
  for (const item of items) {
    const key = statutoryKey(item.name) || item.name
    const name = statutoryDisplayName(item.name) || item.name
    const current = merged.get(key)
    merged.set(key, {
      name,
      amount: roundCurrency(Number(current?.amount || 0) + Number(item.amount || 0)),
    })
  }
  return [...merged.values()]
}

/** Monthly PAYE bands (Finance Act 2023 / current KRA rates). */
export const PAYE_BANDS = [
  { upTo: 24000, rate: 10 },
  { upTo: 32333, rate: 25 },
  { upTo: 500000, rate: 30 },
  { upTo: 800000, rate: 32.5 },
  { upTo: Number.POSITIVE_INFINITY, rate: 35 },
]

export const PERSONAL_RELIEF = 2400
export const NSSF_CAP = 72000
export const NSSF_RATE = 6
export const SHIF_RATE = 2.75
export const HOUSING_LEVY_RATE = 1.5

export const ALLOWANCE_PRESETS = [
  "Housing",
  "Transport",
  "Leave",
  "Overtime",
  "Acting",
  "Commission",
]

export const DEDUCTION_PRESETS = ["Advance", "Savings", "SACCO", "Welfare", "Loan"]

export const DEFAULT_DEDUCTION_RULES: DeductionRule[] = [
  { id: "paye", name: "PAYE", type: "progressive", value: 0, enabled: true, note: "Banded 10%–35% after NSSF and housing levy; KES 2,400 relief" },
  { id: "sha", name: "SHIF", type: "percentage", value: SHIF_RATE, enabled: true, note: "2.75% of gross" },
  { id: "nssf", name: "NSSF", type: "percentage", value: NSSF_RATE, enabled: true, note: "6% of pensionable pay, capped at KES 72,000" },
  { id: "housing", name: "Housing Levy", type: "percentage", value: HOUSING_LEVY_RATE, enabled: true, note: "1.5% of gross" },
]

export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100

export function computeNssf(gross: number) {
  return roundCurrency(Math.min(Math.max(0, gross), NSSF_CAP) * (NSSF_RATE / 100))
}

export function payeBreakdown(taxablePay: number): {
  bands: PayeBandSlice[]
  grossTax: number
  relief: number
  paye: number
  taxablePay: number
} {
  let remaining = Math.max(0, taxablePay)
  let previousLimit = 0
  const bands: PayeBandSlice[] = []

  for (const band of PAYE_BANDS) {
    const slice = Math.min(remaining, band.upTo - previousLimit)
    if (slice > 0) {
      bands.push({
        from: previousLimit,
        to: Number.isFinite(band.upTo) ? band.upTo : null,
        rate: band.rate,
        taxable: roundCurrency(slice),
        tax: roundCurrency(slice * (band.rate / 100)),
      })
    }
    remaining -= slice
    previousLimit = band.upTo
    if (remaining <= 0) break
  }

  const grossTax = roundCurrency(bands.reduce((sum, band) => sum + band.tax, 0))
  return {
    bands,
    grossTax,
    relief: PERSONAL_RELIEF,
    paye: roundCurrency(Math.max(0, grossTax - PERSONAL_RELIEF)),
    taxablePay: roundCurrency(Math.max(0, taxablePay)),
  }
}

export const computePaye = (taxablePay: number) => payeBreakdown(taxablePay).paye

export const getRuleAmount = (rule: DeductionRule, gross: number) => {
  if (!rule.enabled) return 0
  const nssf = computeNssf(gross)
  const housing = roundCurrency(gross * (HOUSING_LEVY_RATE / 100))
  if (rule.type === "progressive") return computePaye(Math.max(0, gross - nssf - housing))
  if (rule.id === "nssf") return nssf
  if (rule.type === "percentage") return gross * (rule.value / 100)
  return rule.value
}

function overrideAmount(overrides: Record<string, string | number>, keys: string[], computed: number) {
  for (const key of keys) {
    const raw = overrides[key]
    if (raw === undefined || raw === null || raw === "") continue
    const value = Number(raw)
    if (Number.isFinite(value) && value >= 0) return roundCurrency(value)
  }
  return computed
}

export type PayrollCalculationInput = {
  salaryInput: number
  salaryMode: "gross" | "net"
  bonusAmount?: number
  otherBonusItems?: DeductionItem[]
  otherDeductionItems?: DeductionItem[]
  calculatorRules?: DeductionRule[]
  standardDeductionOverrides?: Record<string, string | number>
  deductHelb?: boolean
  helbAmount?: number
  deductionsDisabled?: boolean
}

export type PayrollCalculationResult = {
  basic: number
  allowances: number
  gross: number
  net: number
  totalDeductions: number
  items: DeductionItem[]
  paye: ReturnType<typeof payeBreakdown>
  nssf: number
  shif: number
  housing: number
  taxablePay: number
}

function statutoryItems(
  gross: number,
  overrides: Record<string, string | number>,
  disabled: boolean,
) {
  if (disabled) return { items: [] as DeductionItem[], nssf: 0, shif: 0, housing: 0, paye: payeBreakdown(0), taxablePay: 0 }

  const nssf = overrideAmount(overrides, ["nssf"], computeNssf(gross))
  const shif = overrideAmount(overrides, ["sha", "shif"], roundCurrency(gross * (SHIF_RATE / 100)))
  const housing = overrideAmount(overrides, ["housing"], roundCurrency(gross * (HOUSING_LEVY_RATE / 100)))
  const taxablePay = Math.max(0, gross - nssf - housing)
  const breakdown = payeBreakdown(taxablePay)
  const paye = overrideAmount(overrides, ["paye"], breakdown.paye)

  return {
    items: [
      { name: "PAYE", amount: paye },
      { name: "SHIF", amount: shif },
      { name: "NSSF", amount: nssf },
      { name: "Housing Levy", amount: housing },
    ],
    nssf,
    shif,
    housing,
    paye: { ...breakdown, paye },
    taxablePay,
  }
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    salaryInput,
    salaryMode,
    bonusAmount = 0,
    otherBonusItems = [],
    otherDeductionItems = [],
    standardDeductionOverrides = {},
    deductHelb = false,
    helbAmount = 0,
    deductionsDisabled = false,
  } = input

  const allowanceTotal = roundCurrency(
    Number(bonusAmount || 0) +
      otherBonusItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  )

  const extraDeductions = () => {
    const custom = otherDeductionItems
      .filter((item) => !isStatutoryDeduction(item.name))
      .map((item) => ({
        name: statutoryDisplayName(item.name) || item.name,
        amount: roundCurrency(Number(item.amount || 0)),
      }))
    const helb =
      deductHelb && helbAmount
        ? [{ name: "HELB", amount: roundCurrency(Number(helbAmount)) }]
        : []
    return mergeDeductionItems([...helb, ...custom])
  }

  const computeFromBasic = (basic: number): PayrollCalculationResult => {
    const gross = roundCurrency(Math.max(0, basic) + allowanceTotal)
    const statutory = statutoryItems(gross, standardDeductionOverrides, deductionsDisabled)
    const extras = extraDeductions()
    const items = mergeDeductionItems([...statutory.items, ...extras])
    const totalDeductions = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0))
    return {
      basic: roundCurrency(Math.max(0, basic)),
      allowances: allowanceTotal,
      gross,
      net: roundCurrency(gross - totalDeductions),
      totalDeductions,
      items,
      paye: statutory.paye,
      nssf: statutory.nssf,
      shif: statutory.shif,
      housing: statutory.housing,
      taxablePay: statutory.taxablePay,
    }
  }

  const empty = computeFromBasic(0)
  if (!salaryInput && !allowanceTotal) return empty

  if (salaryMode === "gross") {
    return computeFromBasic(salaryInput)
  }

  const targetNet = salaryInput
  let low = 0
  let high = Math.max(targetNet * 2, 50000)

  while (computeFromBasic(high).net < targetNet && high < targetNet * 20 + 100000) {
    high *= 2
  }

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    if (computeFromBasic(mid).net > targetNet) high = mid
    else low = mid
  }

  return computeFromBasic(high)
}
