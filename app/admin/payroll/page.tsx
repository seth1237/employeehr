"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Calculator, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { TableSkeleton } from "@/components/admin/ui/page-states"

type SalaryMode = "gross" | "net"
type DeductionType = "percentage" | "fixed"

type DeductionRule = {
    id: string
    name: string
    type: DeductionType | "progressive"
    value: number
    enabled: boolean
    note?: string
}

type DeductionItem = { name: string; amount: number }
type PayrollEmployeeDetails = {
    shaId: string
    kraPin: string
    nationalId: string
    bankName: string
    bankBranch: string
    accountNumber: string
    nssf: string
}

const PAYE_BANDS = [
    { upTo: 24000, rate: 10 },
    { upTo: 32333, rate: 25 },
    { upTo: Number.POSITIVE_INFINITY, rate: 30 },
]

const DEFAULT_DEDUCTION_RULES: DeductionRule[] = [
    { id: "paye", name: "PAYE", type: "progressive", value: 0, enabled: true, note: "10% – 30% progressive" },
    { id: "sha", name: "SHA", type: "percentage", value: 2.75, enabled: true, note: "~2.75%" },
    { id: "nssf", name: "NSSF", type: "percentage", value: 3, enabled: true, note: "~3% employee (6% total)" },
    { id: "housing", name: "Housing Levy", type: "percentage", value: 1.5, enabled: true, note: "1.5% employee" },
]

const SAVED_DEDUCTIONS_KEY = "elevate_payroll_saved_deductions"
const HELB_DEDUCTION_KEY = "elevate_payroll_helb_enabled"

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

const loadSavedDeductions = (): DeductionRule[] => {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(SAVED_DEDUCTIONS_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const computePaye = (gross: number) => {
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

const getRuleAmount = (rule: DeductionRule, gross: number) => {
    if (!rule.enabled) return 0
    if (rule.type === "progressive") return computePaye(gross)
    if (rule.type === "percentage") return gross * (rule.value / 100)
    return rule.value
}

const getPreviousMonthKey = (month: string) => {
    const [yearPart, monthPart] = month.split("-")
    const year = Number(yearPart)
    const monthIndex = Number(monthPart)

    if (!year || !monthIndex) return month

    const date = new Date(year, monthIndex - 1, 1)
    date.setMonth(date.getMonth() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export default function AdminPayrollPage() {
    const { toast } = useToast()
    const [payrolls, setPayrolls] = useState<any[]>([])
    const [previousMonthPayrolls, setPreviousMonthPayrolls] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    // Generate Form State
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [genEmployeeId, setGenEmployeeId] = useState("")
    const [genSalary, setGenSalary] = useState("")
    const [genBonus, setGenBonus] = useState("0")
    const [genDeductionItems, setGenDeductionItems] = useState<{ name: string, amount: number }[]>([])
    const [batchPayrollOpen, setBatchPayrollOpen] = useState(false)
    const [maintainSalaries, setMaintainSalaries] = useState(true)
    const [showSalaryExceptions, setShowSalaryExceptions] = useState(false)
    const [salaryExceptions, setSalaryExceptions] = useState<Record<string, boolean>>({})
    const [salaryExceptionValues, setSalaryExceptionValues] = useState<Record<string, string>>({})
    const [batchGenerating, setBatchGenerating] = useState(false)

    const [deductHelb, setDeductHelb] = useState(false)
    const [helbAmount, setHelbAmount] = useState("")
    const [otherDeductionItems, setOtherDeductionItems] = useState<DeductionItem[]>([])
    const [newOtherDeductionName, setNewOtherDeductionName] = useState("")
    const [newOtherDeductionAmount, setNewOtherDeductionAmount] = useState("")
    const [otherBonusItems, setOtherBonusItems] = useState<DeductionItem[]>([])
    const [newOtherBonusName, setNewOtherBonusName] = useState("")
    const [newOtherBonusAmount, setNewOtherBonusAmount] = useState("")
    const [standardDeductionOverrides, setStandardDeductionOverrides] = useState<Record<string, string>>({})

    const [employeeDetails, setEmployeeDetails] = useState<PayrollEmployeeDetails>({
        shaId: "",
        kraPin: "",
        nationalId: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        nssf: "",
    })

    // Salary calculator state
    const [salaryMode, setSalaryMode] = useState<SalaryMode>("gross")
    const [salaryInput, setSalaryInput] = useState("")
    const [customRules, setCustomRules] = useState<DeductionRule[]>([])
    const [savedRules, setSavedRules] = useState<DeductionRule[]>([])
    const [customRuleName, setCustomRuleName] = useState("")
    const [customRuleType, setCustomRuleType] = useState<DeductionType>("percentage")
    const [customRuleValue, setCustomRuleValue] = useState("")

    const [generating, setGenerating] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)

    // Employee Details Editor State
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
    const [editingDetails, setEditingDetails] = useState<PayrollEmployeeDetails>({
        shaId: "",
        kraPin: "",
        nationalId: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        nssf: "",
    })
    const [savingDetails, setSavingDetails] = useState(false)

    const selectedEmployee = useMemo(
        () => employees.find((e) => e._id === genEmployeeId) || null,
        [employees, genEmployeeId]
    )

    const editingEmployee = useMemo(
        () => employees.find((e) => e._id === editingEmployeeId) || null,
        [employees, editingEmployeeId]
    )

    const fetchData = async (opts?: { silent?: boolean } | boolean) => {
        const silent = startDataLoad(opts, setLoading)
        try {
            const previousMonth = getPreviousMonthKey(selectedMonth)
            const [payrollRes, previousPayrollRes, usersRes] = await Promise.all([
                api.payroll.getAll(selectedMonth),
                api.payroll.getAll(previousMonth),
                api.users.getAll()
            ])

            if (payrollRes.success) setPayrolls(payrollRes.data || [])
            if (previousPayrollRes.success) setPreviousMonthPayrolls(previousPayrollRes.data || [])
            if (usersRes?.success && Array.isArray(usersRes.data)) {
                setEmployees(usersRes.data.filter((u: any) => u.role !== 'company_admin'))
            }
        } catch (error) {
            console.error("Failed to fetch payroll data", error)
        } finally {
            finishDataLoad(silent, setLoading)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedMonth])

    useEffect(() => {
        setSavedRules(loadSavedDeductions())
    }, [])

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedHelb = localStorage.getItem(HELB_DEDUCTION_KEY)
            setDeductHelb(storedHelb === "true")
        }
    }, [])

    // Auto-fill salary when employee selected (only if not editing or salary empty)
    useEffect(() => {
        if (!selectedEmployee) return

        const salary = selectedEmployee.salary ? selectedEmployee.salary.toString() : ""

        if (genEmployeeId && !editId && salary) {
            setGenSalary(salary)
            setSalaryMode("gross")
            setSalaryInput(salary)
        }

        setEmployeeDetails({
            shaId: selectedEmployee.sha_id || selectedEmployee.shaId || "",
            kraPin: selectedEmployee.kra_pin || selectedEmployee.kraPin || "",
            nationalId: selectedEmployee.national_id || selectedEmployee.nationalId || "",
            bankName: selectedEmployee.bankDetails?.bankName || selectedEmployee.bank_name || "",
            bankBranch: selectedEmployee.bankDetails?.bankBranch || selectedEmployee.bank_branch || "",
            accountNumber: selectedEmployee.bankDetails?.accountNumber || selectedEmployee.bank_account_number || "",
            nssf: selectedEmployee.nssf_number || selectedEmployee.nssf || "",
        })

        if (!salary && !editId) {
            setGenSalary("")
        }

        // Fetch last payslip to pre-fill deductions
        const fetchLastPayslip = async () => {
            if (editId) return // Don't override when editing existing
            try {
                const res = await api.payroll.getMyPayslips()
                if (res.success && res.data && res.data.length > 0) {
                    const lastSlip = res.data[0]
                    // Pre-fill overrides for standard deductions if they were overridden
                    if (lastSlip.standard_deduction_overrides) {
                        setStandardDeductionOverrides(lastSlip.standard_deduction_overrides)
                    }
                    // Pre-fill other items
                    setOtherDeductionItems(lastSlip.deduction_items.filter((item: any) => 
                        !DEFAULT_DEDUCTION_RULES.some(r => r.name === item.name)
                    ))
                    setOtherBonusItems(lastSlip.other_bonus_items || [])
                }
            } catch (error) {
                console.error("Failed to fetch last payslip:", error)
            }
        }
        fetchLastPayslip()
    }, [genEmployeeId, employees, selectedEmployee, editId])

    const calculatorRules = useMemo(() => [...DEFAULT_DEDUCTION_RULES, ...customRules], [customRules])

    const standardDeductionRules = useMemo(() => {
        return calculatorRules.filter((rule) => rule.enabled && rule.type === "progressive" || rule.type === "percentage" || rule.type === "fixed")
    }, [calculatorRules])

    const calculatorResult = useMemo(() => {
        const inputAmount = Number(salaryInput || 0)
        const bonusAmount = Number(genBonus || 0)
        const otherBonusTotal = roundCurrency(otherBonusItems.reduce((sum, item) => sum + Number(item.amount || 0), 0))

        const buildItems = (gross: number) => {
            const standardItems = calculatorRules
                .filter((rule) => rule.enabled)
                .map((rule) => ({
                    name: rule.name,
                    amount: roundCurrency(
                        standardDeductionOverrides[rule.id] !== undefined && standardDeductionOverrides[rule.id] !== ""
                            ? Number(standardDeductionOverrides[rule.id])
                            : getRuleAmount(rule, gross)
                    ),
                }))

            const helbItems = deductHelb && helbAmount
                ? [{ name: "HELB", amount: roundCurrency(Number(helbAmount)) }]
                : []

            const customOtherItems = otherDeductionItems.map((item) => ({
                name: item.name,
                amount: roundCurrency(Number(item.amount || 0)),
            }))

            return [...standardItems, ...helbItems, ...customOtherItems]
        }

        const computeFromGross = (gross: number) => {
            const items = buildItems(gross)
            const totalDeductions = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0))
            const net = roundCurrency(gross + bonusAmount + otherBonusTotal - totalDeductions)
            return { gross: roundCurrency(gross), net, totalDeductions, items }
        }

        if (!inputAmount) {
            return { gross: 0, net: 0, totalDeductions: 0, items: [] as DeductionItem[] }
        }

        if (salaryMode === "gross") {
            return computeFromGross(inputAmount)
        }

        const targetNet = inputAmount
        let low = 0
        let high = Math.max(targetNet * 2, 50000)

        while (computeFromGross(high).net < targetNet && high < targetNet * 20 + 100000) {
            high *= 2
        }

        for (let i = 0; i < 50; i++) {
            const mid = (low + high) / 2
            const midNet = computeFromGross(mid).net
            if (midNet > targetNet) {
                high = mid
            } else {
                low = mid
            }
        }

        return computeFromGross(high)
    }, [salaryInput, salaryMode, genBonus, calculatorRules, deductHelb, helbAmount, otherDeductionItems, otherBonusItems, standardDeductionOverrides])

    const applyCalculatorToPayrollForm = () => {
        if (!salaryInput) return
        setGenSalary(calculatorResult.gross > 0 ? calculatorResult.gross.toString() : salaryInput)
        setGenDeductionItems(calculatorResult.items)
    }

    const addCustomRule = () => {
        if (!customRuleName.trim() || !customRuleValue) return
        const nextRule: DeductionRule = {
            id: `${customRuleName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            name: customRuleName.trim(),
            type: customRuleType,
            value: Number(customRuleValue),
            enabled: true,
        }
        setCustomRules((prev) => [...prev, nextRule])
        setCustomRuleName("")
        setCustomRuleValue("")
    }

    const saveCurrentRuleSet = () => {
        if (typeof window === "undefined") return
        const customPayload = customRules.map((rule) => ({ ...rule, enabled: true }))
        const merged = [...savedRules, ...customPayload]
        localStorage.setItem(SAVED_DEDUCTIONS_KEY, JSON.stringify(merged))
        setSavedRules(merged)
        toast({ description: "Deduction set saved for reuse" })
    }

    const toggleHelb = () => {
        const next = !deductHelb
        setDeductHelb(next)
        if (typeof window !== "undefined") {
            localStorage.setItem(HELB_DEDUCTION_KEY, String(next))
        }
    }

    const addOtherDeduction = () => {
        if (!newOtherDeductionName.trim() || !newOtherDeductionAmount) return
        setOtherDeductionItems((prev) => [
            ...prev,
            { name: newOtherDeductionName.trim(), amount: Number(newOtherDeductionAmount) },
        ])
        setNewOtherDeductionName("")
        setNewOtherDeductionAmount("")
    }

    const addOtherBonus = () => {
        if (!newOtherBonusName.trim() || !newOtherBonusAmount) return
        setOtherBonusItems((prev) => [
            ...prev,
            { name: newOtherBonusName.trim(), amount: Number(newOtherBonusAmount) },
        ])
        setNewOtherBonusName("")
        setNewOtherBonusAmount("")
    }

    const removeOtherBonus = (index: number) => {
        setOtherBonusItems((prev) => prev.filter((_, idx) => idx !== index))
    }

    const removeOtherDeduction = (index: number) => {
        setOtherDeductionItems((prev) => prev.filter((_, idx) => idx !== index))
    }

    const addSavedRule = (rule: DeductionRule) => {
        setCustomRules((prev) => [...prev, { ...rule, id: `${rule.id}-${Date.now()}`, enabled: true }])
    }

    const openEdit = (payroll: any) => {
        setEditId(payroll._id)
        setGenEmployeeId(payroll.user_id)
        setGenSalary(payroll.base_salary.toString())
        setSalaryInput(payroll.base_salary.toString())
        setSalaryMode("gross")
        setGenBonus(payroll.bonus.toString())
        setOtherDeductionItems(payroll.deduction_items || [])
        setOtherBonusItems(payroll.other_bonus_items || [])
        setSidebarOpen(true)
    }

    const resetForm = (open: boolean) => {
        setSidebarOpen(open)
        if (!open) {
            setEditId(null)
            setGenEmployeeId("")
            setGenSalary("")
            setSalaryInput("")
            setGenBonus("0")
            setGenDeductionItems([])
            setOtherDeductionItems([])
            setNewOtherDeductionName("")
            setNewOtherDeductionAmount("")
            setOtherBonusItems([])
            setNewOtherBonusName("")
            setNewOtherBonusAmount("")
            setStandardDeductionOverrides({})
            setEmployeeDetails({
                shaId: "",
                kraPin: "",
                nationalId: "",
                bankName: "",
                bankBranch: "",
                accountNumber: "",
                nssf: "",
            })
        }
    }

    const saveEmployeeDetails = async () => {
        try {
            if (!genEmployeeId) return

            const updatePayload: Partial<any> = {
                sha_id: employeeDetails.shaId,
                kra_pin: employeeDetails.kraPin,
                national_id: employeeDetails.nationalId,
                nssf_number: employeeDetails.nssf,
                bankDetails: {
                    bankName: employeeDetails.bankName,
                    bankBranch: employeeDetails.bankBranch,
                    accountNumber: employeeDetails.accountNumber,
                },
            }

            await api.users.update(genEmployeeId, updatePayload)
        } catch (error) {
            console.error("Failed to save employee details:", error)
            // Continue anyway - don't block payroll generation
        }
    }

    const handleGenerate = async () => {
        try {
            if (!genEmployeeId) {
                toast({ variant: "destructive", description: "Please select an employee" })
                return
            }

            if (!calculatorResult.gross) {
                toast({ variant: "destructive", description: "Enter a gross or net salary to calculate the payroll" })
                return
            }

            setGenerating(true)

                    // Save employee details first
            await saveEmployeeDetails()

            const payload = {
                user_id: genEmployeeId,
                month: selectedMonth,
                base_salary: Number(calculatorResult.gross || genSalary || 0),
                bonus: otherBonusItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
                other_bonus_items: otherBonusItems,
                deduction_items: calculatorResult.items,
                standard_deduction_overrides: standardDeductionOverrides,
            }

            if (editId) {
                await api.payroll.update(editId, payload)
                toast({ description: "Payroll updated successfully" })
            } else {
                await api.payroll.generate(payload)
                toast({ description: "Payroll generated successfully" })
            }

            resetForm(false)
            fetchData(true)
        } catch (error: any) {
            if (error.message?.includes("already exists")) {
                toast({
                    variant: "destructive",
                    title: "Duplicate",
                    description: error.message
                })
            } else {
                toast({ variant: "destructive", description: error.message || "Operation failed" })
            }
        } finally {
            setGenerating(false)
        }
    }

    const handleSaveEmployeeDetails = async () => {
        try {
            if (!editingEmployeeId) return

            setSavingDetails(true)
            const updatePayload: Partial<any> = {
                sha_id: editingDetails.shaId,
                kra_pin: editingDetails.kraPin,
                national_id: editingDetails.nationalId,
                nssf_number: editingDetails.nssf,
                bankDetails: {
                    bankName: editingDetails.bankName,
                    bankBranch: editingDetails.bankBranch,
                    accountNumber: editingDetails.accountNumber,
                },
            }

            await api.users.update(editingEmployeeId, updatePayload)
            toast({ description: "Employee details saved successfully" })
            setEditingEmployeeId(null)
            fetchData(true)
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message || "Failed to save details" })
        } finally {
            setSavingDetails(false)
        }
    }

    const openEmployeeEditor = (employeeId: string) => {
        setEditingEmployeeId(employeeId)
        const emp = employees.find(e => e._id === employeeId)
        if (emp) {
            setEditingDetails({
                shaId: emp.sha_id || emp.shaId || "",
                kraPin: emp.kra_pin || emp.kraPin || "",
                nationalId: emp.national_id || emp.nationalId || "",
                bankName: emp.bankDetails?.bankName || emp.bank_name || "",
                bankBranch: emp.bankDetails?.bankBranch || emp.bank_branch || "",
                accountNumber: emp.bankDetails?.accountNumber || emp.bank_account_number || "",
                nssf: emp.nssf_number || emp.nssf || "",
            })
        }
    }


    const getSalaryBaselineForEmployee = (employeeId: string) => {
        const previousPayroll = previousMonthPayrolls.find((payroll) => payroll.user_id === employeeId)
        if (previousPayroll?.base_salary) {
            return Number(previousPayroll.base_salary)
        }

        const employee = employees.find((emp) => emp._id === employeeId)
        return Number(employee?.salary || 0)
    }

    const toggleSalaryException = (employeeId: string, checked: boolean) => {
        setSalaryExceptions((prev) => ({ ...prev, [employeeId]: checked }))
        if (!checked) {
            setSalaryExceptionValues((prev) => {
                const next = { ...prev }
                delete next[employeeId]
                return next
            })
        } else {
            const currentBase = getSalaryBaselineForEmployee(employeeId)
            setSalaryExceptionValues((prev) => ({
                ...prev,
                [employeeId]: currentBase ? String(currentBase) : "",
            }))
        }
    }

    const handleGenerateNextMonthPayrolls = async () => {
        try {
            setBatchGenerating(true)

            const targetMonth = selectedMonth
            const existingByUser = new Map(payrolls.map((payroll) => [String(payroll.user_id), payroll]))
            const skipped: string[] = []
            const processed: string[] = []

            for (const employee of employees) {
                const employeeId = employee._id
                const baseSalary = salaryExceptions[employeeId]
                    ? Number(salaryExceptionValues[employeeId] || 0)
                    : (maintainSalaries ? getSalaryBaselineForEmployee(employeeId) : Number(employee.salary || 0))

                if (!baseSalary) {
                    skipped.push(`${employee.firstName} ${employee.lastName}`)
                    continue
                }

                const payload = {
                    user_id: employeeId,
                    month: targetMonth,
                    base_salary: baseSalary,
                    bonus: 0,
                    deduction_items: [],
                    other_bonus_items: [],
                    standard_deduction_overrides: {},
                }

                const existingPayroll = existingByUser.get(String(employeeId))

                if (existingPayroll?._id) {
                    await api.payroll.update(existingPayroll._id, payload)
                } else {
                    await api.payroll.generate(payload)
                }

                processed.push(`${employee.firstName} ${employee.lastName}`)
            }

            toast({
                title: "Payroll maintenance complete",
                description: `${processed.length} employees processed${skipped.length ? `, ${skipped.length} skipped` : ""}.`,
            })

            if (skipped.length > 0) {
                console.log("Employees skipped because no salary was available:", skipped)
            }

            setBatchPayrollOpen(false)
            fetchData(true)
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message || "Failed to generate payrolls" })
        } finally {
            setBatchGenerating(false)
        }
    }
    const launchEmployeeDetails = () => {
        const targetEmployeeId = genEmployeeId || editingEmployeeId || employees[0]?._id

        if (!targetEmployeeId) {
            toast({
                title: "No employee selected",
                description: "Choose an employee before opening details.",
                variant: "destructive",
            })
            return
        }

        openEmployeeEditor(targetEmployeeId)
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Payroll Management</h1>
                    <p className="text-muted-foreground">Generate and view monthly payrolls.</p>
                </div>
                <div className="flex gap-4">
                    <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-40"
                    />

                    <Button variant="outline" className="gap-2" onClick={launchEmployeeDetails}>
                        <Calculator className="w-4 h-4" /> Employee Details
                    </Button>

                    <Dialog open={batchPayrollOpen} onOpenChange={setBatchPayrollOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" /> Next Month Salaries
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Next Month Salary Maintenance</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                <div className="rounded-lg border bg-slate-50 p-4 flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">Maintain salaries for all employees</p>
                                        <p className="text-xs text-muted-foreground">
                                            The system will reuse the previous month salary for each employee by default.
                                        </p>
                                    </div>
                                    <Checkbox checked={maintainSalaries} onCheckedChange={(value) => setMaintainSalaries(Boolean(value))} />
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold">Salary exceptions</p>
                                        <p className="text-xs text-muted-foreground">
                                            Select employees that should not keep the same salary and edit them below.
                                        </p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => setShowSalaryExceptions((prev) => !prev)}>
                                        {showSalaryExceptions ? "Hide selection" : "Select employees to not maintain"}
                                    </Button>
                                </div>

                                {showSalaryExceptions && (
                                    <div className="space-y-3 rounded-lg border bg-white p-4 max-h-[380px] overflow-y-auto">
                                        {employees.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No employees available.</p>
                                        ) : (
                                            employees.map((employee) => {
                                                const isSelected = Boolean(salaryExceptions[employee._id])
                                                const baseline = getSalaryBaselineForEmployee(employee._id)

                                                return (
                                                    <div key={employee._id} className="rounded-lg border bg-slate-50 p-3">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Baseline salary: KES {baseline.toLocaleString() || "0"}
                                                                </p>
                                                            </div>
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={(value) => toggleSalaryException(employee._id, Boolean(value))}
                                                            />
                                                        </div>

                                                        {isSelected && (
                                                            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px] md:items-center">
                                                                <p className="text-xs text-muted-foreground">
                                                                    Edit the salary that will be used for the next month.
                                                                </p>
                                                                <Input
                                                                    type="number"
                                                                    value={salaryExceptionValues[employee._id] || ""}
                                                                    onChange={(e) => setSalaryExceptionValues((prev) => ({
                                                                        ...prev,
                                                                        [employee._id]: e.target.value,
                                                                    }))}
                                                                    placeholder="New salary"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4">
                                    <div>
                                        <p className="font-semibold">Ready to generate next month payrolls</p>
                                        <p className="text-xs text-muted-foreground">
                                            Salaries will be carried over unless you selected an exception.
                                        </p>
                                    </div>
                                    <Button onClick={handleGenerateNextMonthPayrolls} disabled={batchGenerating || employees.length === 0}>
                                        {batchGenerating && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                                        Generate Next Month Payrolls
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={sidebarOpen} onOpenChange={resetForm}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={() => resetForm(true)}>
                                <Plus className="w-4 h-4" /> Generate Payslip
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editId ? "Edit Payslip" : "Generate Payslip"} for {selectedMonth}</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-8 py-4">
                                {/* Top Settings: Employee & Salary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Select Employee</Label>
                                        <Select value={genEmployeeId} onValueChange={setGenEmployeeId}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Choose an employee..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(emp => (
                                                    <SelectItem key={emp._id} value={emp._id}>
                                                        {emp.firstName} {emp.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold">{salaryMode === "gross" ? "Gross Salary" : "Net Salary"}</Label>
                                            <div className="flex gap-2">
                                                <Button type="button" size="sm" variant={salaryMode === "gross" ? "default" : "outline"} onClick={() => setSalaryMode("gross")} className="h-6 text-[10px] px-2 h-auto py-0.5">Gross</Button>
                                                <Button type="button" size="sm" variant={salaryMode === "net" ? "default" : "outline"} onClick={() => setSalaryMode("net")} className="h-6 text-[10px] px-2 h-auto py-0.5">Net</Button>
                                            </div>
                                        </div>
                                        <Input
                                            type="number"
                                            value={salaryInput}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                setSalaryInput(value)
                                                setGenSalary(value)
                                            }}
                                            placeholder={salaryMode === "gross" ? "Enter gross salary" : "Enter net salary"}
                                            className="h-10"
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Standard Deductions</h3>
                                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                                        {DEFAULT_DEDUCTION_RULES.map((rule) => {
                                            const calculatedAmount = getRuleAmount(rule, Number(calculatorResult.gross || 0))
                                            const currentOverride = standardDeductionOverrides[rule.id]
                                            
                                            return (
                                                <div key={rule.id} className="space-y-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-xs">{rule.name}</Label>
                                                    </div>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            value={currentOverride !== undefined ? currentOverride : roundCurrency(calculatedAmount)}
                                                            onChange={(e) => setStandardDeductionOverrides(prev => ({
                                                                ...prev,
                                                                [rule.id]: e.target.value
                                                            }))}
                                                            className="h-9 pr-7 text-sm"
                                                        />
                                                        {currentOverride !== undefined && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className="absolute right-0 top-0 h-9 w-7 p-0 text-muted-foreground hover:text-red-500"
                                                                onClick={() => setStandardDeductionOverrides(prev => {
                                                                    const next = { ...prev }
                                                                    delete next[rule.id]
                                                                    return next
                                                                })}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {currentOverride !== undefined && (
                                                        <p className="text-[10px] text-amber-600">Default: KES {roundCurrency(calculatedAmount).toLocaleString()}</p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
                                    {/* Bonuses */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Other Bonuses</h3>
                                        <div className="space-y-2">
                                            {otherBonusItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm py-2 border-b">
                                                    <span>{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-green-600">+KES {item.amount.toLocaleString()}</span>
                                                        <Button size="sm" variant="ghost" onClick={() => removeOtherBonus(idx)} className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500">
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Input
                                                    value={newOtherBonusName}
                                                    onChange={(e) => setNewOtherBonusName(e.target.value)}
                                                    placeholder="Bonus name"
                                                    className="h-9 text-sm flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    value={newOtherBonusAmount}
                                                    onChange={(e) => setNewOtherBonusAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    className="h-9 text-sm w-24"
                                                />
                                                <Button size="sm" type="button" onClick={addOtherBonus} disabled={!newOtherBonusName || !newOtherBonusAmount} className="h-9">Add</Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Other Deductions</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm py-2 border-b">
                                                <span>HELB Deduction</span>
                                                <div className="flex items-center gap-2">
                                                    {deductHelb && (
                                                        <Input
                                                            type="number"
                                                            value={helbAmount}
                                                            onChange={(e) => setHelbAmount(e.target.value)}
                                                            placeholder="Amount"
                                                            className="h-8 text-xs w-24"
                                                        />
                                                    )}
                                                    <Button type="button" size="sm" variant={deductHelb ? "default" : "outline"} onClick={toggleHelb} className="h-8 text-xs px-2">
                                                        {deductHelb ? "Added" : "Add"}
                                                    </Button>
                                                </div>
                                            </div>

                                            {otherDeductionItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm py-2 border-b">
                                                    <span>{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-red-600">-KES {item.amount.toLocaleString()}</span>
                                                        <Button size="sm" variant="ghost" onClick={() => removeOtherDeduction(idx)} className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500">
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Input
                                                    value={newOtherDeductionName}
                                                    onChange={(e) => setNewOtherDeductionName(e.target.value)}
                                                    placeholder="Deduction name"
                                                    className="h-9 text-sm flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    value={newOtherDeductionAmount}
                                                    onChange={(e) => setNewOtherDeductionAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    className="h-9 text-sm w-24"
                                                />
                                                <Button size="sm" type="button" onClick={addOtherDeduction} disabled={!newOtherDeductionName || !newOtherDeductionAmount} className="h-9">Add</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-6 flex justify-end">
                                    <Button className="w-full sm:w-auto h-11 px-8" onClick={handleGenerate} disabled={generating || !genSalary}>
                                        {generating && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                                        {editId ? "Save Changes" : "Generate Payslip"}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Dialog open={Boolean(editingEmployeeId)} onOpenChange={(open) => {
                    if (!open) {
                        setEditingEmployeeId(null)
                    }
                }}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Employee Details Management</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Select Employee</Label>
                                <Select
                                    value={editingEmployeeId || genEmployeeId}
                                    onValueChange={(value) => {
                                        setGenEmployeeId(value)
                                        openEmployeeEditor(value)
                                    }}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Choose an employee..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp._id} value={emp._id}>
                                                {emp.firstName} {emp.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">SHA ID</Label>
                                    <Input value={editingDetails.shaId} onChange={(e) => setEditingDetails((prev) => ({ ...prev, shaId: e.target.value }))} placeholder="e.g., SH12345" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">KRA PIN</Label>
                                    <Input value={editingDetails.kraPin} onChange={(e) => setEditingDetails((prev) => ({ ...prev, kraPin: e.target.value }))} placeholder="e.g., A001234567K" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">National ID</Label>
                                    <Input value={editingDetails.nationalId} onChange={(e) => setEditingDetails((prev) => ({ ...prev, nationalId: e.target.value }))} placeholder="e.g., 12345678" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">NSSF Number</Label>
                                    <Input value={editingDetails.nssf} onChange={(e) => setEditingDetails((prev) => ({ ...prev, nssf: e.target.value }))} placeholder="e.g., 50/5967/5967" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-medium">Bank Name</Label>
                                    <Input value={editingDetails.bankName} onChange={(e) => setEditingDetails((prev) => ({ ...prev, bankName: e.target.value }))} placeholder="e.g., Equity Bank" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Bank Branch</Label>
                                    <Input value={editingDetails.bankBranch} onChange={(e) => setEditingDetails((prev) => ({ ...prev, bankBranch: e.target.value }))} placeholder="e.g., Nairobi CBD" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Account Number</Label>
                                    <Input value={editingDetails.accountNumber} onChange={(e) => setEditingDetails((prev) => ({ ...prev, accountNumber: e.target.value }))} placeholder="e.g., 0123456789" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4">
                                <div>
                                    <p className="font-semibold">{editingEmployee ? `${editingEmployee.firstName} ${editingEmployee.lastName}` : "No employee selected"}</p>
                                    <p className="text-xs text-muted-foreground">Accountant can update compliance and banking details here.</p>
                                </div>
                                <Button onClick={handleSaveEmployeeDetails} disabled={savingDetails || !editingEmployeeId}>
                                    {savingDetails && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                                    Save Details
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            <Card className="overflow-hidden border-slate-200 shadow-sm min-w-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" /> Payroll Generator
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">Payroll calculation</p>
                                    <p className="text-xs text-muted-foreground">Keep the inputs spaced and use the company buttons for actions.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant={salaryMode === "gross" ? "default" : "outline"}
                                        onClick={() => setSalaryMode("gross")}
                                    >
                                        Gross → Net
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={salaryMode === "net" ? "default" : "outline"}
                                        onClick={() => setSalaryMode("net")}
                                    >
                                        Net → Gross
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setSalaryInput("")}>Clear</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{salaryMode === "gross" ? "Gross Salary" : "Net Salary"}</Label>
                                        <Input
                                            type="number"
                                            value={salaryInput}
                                            onChange={(e) => setSalaryInput(e.target.value)}
                                            placeholder={salaryMode === "gross" ? "Enter gross salary" : "Enter net salary"}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bonus</Label>
                                        <Input
                                            type="number"
                                            value={genBonus}
                                            onChange={(e) => setGenBonus(e.target.value)}
                                            placeholder="Optional bonus"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-5 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold">Standard deductions</p>
                                            <p className="text-xs text-muted-foreground">PAYE, SHA, NSSF and Housing Levy are applied automatically.</p>
                                        </div>
                                        <Button type="button" variant="outline" onClick={saveCurrentRuleSet}>Save deduction set</Button>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        {DEFAULT_DEDUCTION_RULES.map((rule) => (
                                            <div key={rule.id} className="rounded-lg border bg-slate-50 p-4 text-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{rule.name}</p>
                                                        <p className="text-xs text-muted-foreground">{rule.note}</p>
                                                    </div>
                                                    <span className="rounded-full border bg-white px-2 py-1 text-xs font-medium text-muted-foreground">
                                                        {rule.type === "progressive" ? "Progressive" : `${rule.value}%`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4 border-t pt-4">
                                        <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Custom deduction name</Label>
                                                <Input value={customRuleName} onChange={(e) => setCustomRuleName(e.target.value)} placeholder="e.g. HELB" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Type</Label>
                                                <Select value={customRuleType} onValueChange={(value) => setCustomRuleType(value as DeductionType)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percentage</SelectItem>
                                                        <SelectItem value="fixed">Fixed amount</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Value</Label>
                                                <Input
                                                    type="number"
                                                    value={customRuleValue}
                                                    onChange={(e) => setCustomRuleValue(e.target.value)}
                                                    placeholder={customRuleType === "percentage" ? "%" : "Amount"}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button type="button" onClick={addCustomRule} disabled={!customRuleName.trim() || !customRuleValue} className="w-full">Add</Button>
                                            </div>
                                        </div>

                                        {customRules.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Custom deductions</p>
                                                <div className="grid gap-2 md:grid-cols-2">
                                                    {customRules.map((rule) => (
                                                        <div key={rule.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                                                            <div>
                                                                <p className="font-medium">{rule.name}</p>
                                                                <p className="text-xs text-muted-foreground">{rule.type === "fixed" ? `KES ${rule.value.toLocaleString()}` : `${rule.value}%`}</p>
                                                            </div>
                                                            <span className="font-medium text-muted-foreground">KES {getRuleAmount(rule, Number(salaryInput || 0)).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {savedRules.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Saved templates</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {savedRules.map((rule) => (
                                                        <Button key={rule.id} type="button" variant="outline" size="sm" onClick={() => addSavedRule(rule)}>
                                                            + {rule.name}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">Deduction breakdown</p>
                                            <p className="text-xs text-muted-foreground">Amounts update live as the salary changes.</p>
                                        </div>
                                        <Button type="button" onClick={applyCalculatorToPayrollForm}>Use in payroll form</Button>
                                    </div>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {calculatorResult.items.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Enter a salary amount to calculate deductions.</p>
                                        ) : (
                                            calculatorResult.items.map((item) => (
                                                <div key={item.name} className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                                                    <span>{item.name}</span>
                                                    <span className="font-semibold text-muted-foreground">KES {item.amount.toLocaleString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-lg border bg-slate-50 p-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Estimated Gross</p>
                                        <p className="mt-2 text-2xl font-bold">KES {calculatorResult.gross.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Estimated Net</p>
                                        <p className="mt-2 text-2xl font-bold">KES {calculatorResult.net.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Total Deductions</p>
                                        <p className="mt-2 text-2xl font-bold">KES {calculatorResult.totalDeductions.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Calculated Bonus</p>
                                        <p className="mt-2 text-2xl font-bold">KES {Number(genBonus || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-5 space-y-4">
                                    <div>
                                        <p className="text-sm font-semibold">Generation actions</p>
                                        <p className="text-xs text-muted-foreground">Use the company buttons to generate the payslip or open the editor.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-lg border bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium">HELB Deduction</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">Higher Education Loans Board</p>
                                                </div>
                                                <Button type="button" variant={deductHelb ? "default" : "outline"} onClick={toggleHelb} className="px-5">
                                                    {deductHelb ? "Enabled" : "Disabled"}
                                                </Button>
                                            </div>
                                            {deductHelb && (
                                                <div className="mt-3">
                                                    <Input
                                                        type="number"
                                                        value={helbAmount}
                                                        onChange={(e) => setHelbAmount(e.target.value)}
                                                        placeholder="Enter HELB amount"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {otherDeductionItems.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold">Other Deductions</p>
                                                {otherDeductionItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                                                        <span className="font-medium">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">KES {item.amount.toLocaleString()}</span>
                                                            <Button size="sm" variant="ghost" onClick={() => removeOtherDeduction(idx)} className="h-8 w-8 p-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                                            <Input
                                                value={newOtherDeductionName}
                                                onChange={(e) => setNewOtherDeductionName(e.target.value)}
                                                placeholder="Deduction name"
                                            />
                                            <Input
                                                type="number"
                                                value={newOtherDeductionAmount}
                                                onChange={(e) => setNewOtherDeductionAmount(e.target.value)}
                                                placeholder="Amount"
                                            />
                                            <Button type="button" onClick={addOtherDeduction} disabled={!newOtherDeductionName || !newOtherDeductionAmount}>
                                                Add
                                            </Button>
                                        </div>

                                        <Button className="w-full h-12 text-base font-semibold" onClick={handleGenerate} disabled={generating || !genSalary}>
                                            {generating && <Loader2 className="mr-2 w-5 h-5 animate-spin" />}
                                            {editId ? "Update Payroll" : "Generate Payroll"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="h-1 bg-blue-500" />
                    <CardContent className="p-6 space-y-1">
                        <p className="text-sm text-muted-foreground">Total Processed</p>
                        <p className="text-2xl font-bold tracking-tight">{payrolls.length}</p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="h-1 bg-emerald-500" />
                    <CardContent className="p-6 space-y-1">
                        <p className="text-sm text-muted-foreground">Total Payout</p>
                        <p className="text-2xl font-bold tracking-tight">
                            {payrolls.reduce((sum, p) => sum + p.net_pay, 0).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payroll List - {selectedMonth}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <TableSkeleton rows={8} />
                    ) : payrolls.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No payroll records found for this month.</p>
                            <Button variant="link" onClick={() => setSidebarOpen(true)}>Generate your first payslip</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Employee</th>
                                        <th className="px-4 py-3">Base Salary</th>
                                        <th className="px-4 py-3">Bonus</th>
                                        <th className="px-4 py-3">Deductions</th>
                                        <th className="px-4 py-3">Net Pay</th>
                                        <th className="px-4 py-3">Generated At</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payrolls.map((p) => {
                                        // Find employee name from cached list or use ID if not found
                                        const emp = employees.find(e => e._id === p.user_id)
                                        const name = emp ? `${emp.firstName} ${emp.lastName}` : p.user_id

                                        return (
                                            <tr key={p._id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(p)}>
                                                <td className="px-4 py-3 font-medium">{name}</td>
                                                <td className="px-4 py-3">{p.base_salary.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-green-600">{p.bonus > 0 ? `+${p.bonus}` : '-'}</td>
                                                <td className="px-4 py-3 text-red-600">{p.total_deductions > 0 ? `-${p.total_deductions}` : '-'}</td>
                                                <td className="px-4 py-3 font-bold">{p.net_pay.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.generated_at), 'MMM d, HH:mm')}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                                        {p.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}