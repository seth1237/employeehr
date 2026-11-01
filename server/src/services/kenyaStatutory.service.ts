/**
 * Kenya statutory payroll deductions (PAYE, SHIF, NSSF, Housing Levy).
 * Rates follow the 2024/2025 Finance Act bands used from 2026.
 */

export type StatutoryLine = { name: string; amount: number; code: string }

export type StatutoryResult = {
  gross: number
  paye: number
  shif: number
  nssf: number
  housingLevy: number
  personalRelief: number
  totalStatutory: number
  items: StatutoryLine[]
}

const PAYE_BANDS = [
  { upTo: 24_000, rate: 0.1 },
  { upTo: 32_333, rate: 0.25 },
  { upTo: 500_000, rate: 0.3 },
  { upTo: 800_000, rate: 0.325 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.35 },
]

const PERSONAL_RELIEF = 2_400
const SHIF_RATE = 0.0275
const HOUSING_LEVY_RATE = 0.015
const NSSF_RATE = 0.06
const NSSF_UPPER_LIMIT = 72_000

export function roundKes(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function computeNssf(gross: number): number {
  const pensionable = Math.max(0, Math.min(gross, NSSF_UPPER_LIMIT))
  return roundKes(pensionable * NSSF_RATE)
}

export function computePayeGrossTax(taxablePay: number): number {
  let remaining = Math.max(0, taxablePay)
  let previousLimit = 0
  let tax = 0

  for (const band of PAYE_BANDS) {
    const slice = Math.min(remaining, band.upTo - previousLimit)
    if (slice <= 0) break
    tax += slice * band.rate
    remaining -= slice
    previousLimit = band.upTo
  }

  return roundKes(tax)
}

export function computeKenyaStatutory(
  grossPay: number,
  overrides: Record<string, unknown> = {},
): StatutoryResult {
  const gross = roundKes(Math.max(0, Number(grossPay) || 0))
  const nssf = overrideOr(overrides, ["nssf", "NSSF"], computeNssf(gross))
  const shif = overrideOr(overrides, ["shif", "sha", "nhif", "SHIF", "SHA", "NHIF"], roundKes(gross * SHIF_RATE))
  const housingLevy = overrideOr(
    overrides,
    ["housing", "housing_levy", "Housing Levy"],
    roundKes(gross * HOUSING_LEVY_RATE),
  )

  const taxablePay = Math.max(0, gross - nssf)
  const rawPaye = computePayeGrossTax(taxablePay)
  const paye = overrideOr(overrides, ["paye", "PAYE"], Math.max(0, roundKes(rawPaye - PERSONAL_RELIEF)))

  const items: StatutoryLine[] = [
    { code: "paye", name: "PAYE", amount: paye },
    { code: "shif", name: "SHIF", amount: shif },
    { code: "nssf", name: "NSSF", amount: nssf },
    { code: "housing", name: "Housing Levy", amount: housingLevy },
  ]

  return {
    gross,
    paye,
    shif,
    nssf,
    housingLevy,
    personalRelief: PERSONAL_RELIEF,
    totalStatutory: roundKes(items.reduce((sum, item) => sum + item.amount, 0)),
    items,
  }
}

function overrideOr(overrides: Record<string, unknown>, keys: string[], computed: number): number {
  for (const key of keys) {
    const raw = overrides[key]
    if (raw === undefined || raw === null || raw === "") continue
    const value = Number(raw)
    if (Number.isFinite(value) && value >= 0) return roundKes(value)
  }
  return computed
}
