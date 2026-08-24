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

export const PAYE_BANDS = [
  { upTo: 24000, rate: 10 },
  { upTo: 32333, rate: 25 },
  { upTo: Number.POSITIVE_INFINITY, rate: 30 },
]

export const DEFAULT_DEDUCTION_RULES: DeductionRule[] = [
  { id: "paye", name: "PAYE", type: "progressive", value: 0, enabled: true, note: "10% – 30% progressive" },
  { id: "sha", name: "SHA", type: "percentage", value: 2.75, enabled: true, note: "~2.75%" },
  { id: "nssf", name: "NSSF", type: "percentage", value: 3, enabled: true, note: "~3% employee" },
  { id: "housing", name: "Housing Levy", type: "percentage", value: 1.5, enabled: true, note: "1.5% employee" },
]

export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100

export const computePaye = (gross: number) => {
  let remaining = gross
  let previousLimit = 0
  let total = 0

  for (const band of PAYE_BANDS) {
    const taxable = Math.min(remaining, band.upTo - previousLimit)
    if (taxable <= 0) break
    total += taxable * (band.rate / 100)
    remaining -= taxable
    previousLimit = band.upTo
  }

  return total
}

export const getRuleAmount = (rule: DeductionRule, gross: number) => {
  if (!rule.enabled) return 0
  if (rule.type === "progressive") return computePaye(gross)
  if (rule.type === "percentage") return gross * (rule.value / 100)
  return rule.value
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
  gross: number
  net: number
  totalDeductions: number
  items: DeductionItem[]
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    salaryInput,
    salaryMode,
    bonusAmount = 0,
    otherBonusItems = [],
    otherDeductionItems = [],
    calculatorRules = DEFAULT_DEDUCTION_RULES,
    standardDeductionOverrides = {},
    deductHelb = false,
    helbAmount = 0,
    deductionsDisabled = false,
  } = input

  const otherBonusTotal = roundCurrency(
    otherBonusItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  )

  const buildItems = (gross: number) => {
    const customOtherItems = otherDeductionItems.map((item) => ({
      name: item.name,
      amount: roundCurrency(Number(item.amount || 0)),
    }))

    if (deductionsDisabled) {
      return customOtherItems
    }

    const standardItems = calculatorRules
      .filter((rule) => rule.enabled)
      .map((rule) => ({
        name: rule.name,
        amount: roundCurrency(
          standardDeductionOverrides[rule.id] !== undefined &&
            standardDeductionOverrides[rule.id] !== ""
            ? Number(standardDeductionOverrides[rule.id])
            : getRuleAmount(rule, gross),
        ),
      }))

    const helbItems =
      deductHelb && helbAmount
        ? [{ name: "HELB", amount: roundCurrency(Number(helbAmount)) }]
        : []

    return [...standardItems, ...helbItems, ...customOtherItems]
  }

  const computeFromGross = (gross: number) => {
    const items = buildItems(gross)
    const totalDeductions = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0))
    const net = roundCurrency(gross + bonusAmount + otherBonusTotal - totalDeductions)
    return { gross: roundCurrency(gross), net, totalDeductions, items }
  }

  if (!salaryInput) {
    return { gross: 0, net: 0, totalDeductions: 0, items: [] }
  }

  if (salaryMode === "gross") {
    return computeFromGross(salaryInput)
  }

  const targetNet = salaryInput
  let low = 0
  let high = Math.max(targetNet * 2, 50000)

  while (computeFromGross(high).net < targetNet && high < targetNet * 20 + 100000) {
    high *= 2
  }

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    const midNet = computeFromGross(mid).net
    if (midNet > targetNet) high = mid
    else low = mid
  }

  return computeFromGross(high)
}
