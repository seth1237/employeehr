"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Calculator, Trash2, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import {
    ALLOWANCE_PRESETS,
    calculatePayroll,
    DEDUCTION_PRESETS,
    DEFAULT_DEDUCTION_RULES,
    getRuleAmount,
    isStatutoryDeduction,
    PAYE_BANDS,
    PERSONAL_RELIEF,
    roundCurrency,
    statutoryDisplayName,
    statutoryKey,
    type DeductionItem,
    type DeductionRule,
    type DeductionType,
} from "@/lib/payroll-calculator"
import { FinanceDocumentShell } from "@/components/accounts/finance-document-shell"
import { downloadEmployeePayslip } from "@/lib/payslip-download"
import { downloadMonthPayrollWorkbook } from "@/lib/payroll-month-export"

type SalaryMode = "gross" | "net"
type PayrollEmployeeDetails = {
    shaId: string
    kraPin: string
    nationalId: string
    bankName: string
    bankBranch: string
    accountNumber: string
    nssf: string
}

const SAVED_DEDUCTIONS_KEY = "elevate_payroll_saved_deductions"
const HELB_DEDUCTION_KEY = "elevate_payroll_helb_enabled"

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
    const router = useRouter()
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

    const [deductionsDisabled, setDeductionsDisabled] = useState(false)
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
    const [exporting, setExporting] = useState(false)

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

            if (payrollRes?.success) setPayrolls(payrollRes.data || [])
            if (previousPayrollRes?.success) setPreviousMonthPayrolls(previousPayrollRes.data || [])
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
                if (res?.success && res.data && res.data.length > 0) {
                    const lastSlip = res.data[0]
                    // Pre-fill overrides for standard deductions if they were overridden
                    if (lastSlip.standard_deduction_overrides) {
                        setStandardDeductionOverrides(lastSlip.standard_deduction_overrides)
                    }
                    // Pre-fill other items
                    setOtherDeductionItems(lastSlip.deduction_items.filter((item: any) =>
                        !DEFAULT_DEDUCTION_RULES.some((rule) => statutoryKey(rule.name) === statutoryKey(item.name))
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
        return calculatePayroll({
            salaryInput: Number(salaryInput || 0),
            salaryMode,
            bonusAmount: Number(genBonus || 0),
            otherBonusItems,
            otherDeductionItems,
            calculatorRules: [...DEFAULT_DEDUCTION_RULES, ...customRules],
            standardDeductionOverrides,
            deductHelb,
            helbAmount: Number(helbAmount || 0),
            deductionsDisabled,
        })
    }, [salaryInput, salaryMode, genBonus, customRules, deductHelb, helbAmount, otherDeductionItems, otherBonusItems, standardDeductionOverrides, deductionsDisabled])

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
        addNamedLine(otherDeductionItems, setOtherDeductionItems, newOtherDeductionName, newOtherDeductionAmount)
        setNewOtherDeductionName("")
        setNewOtherDeductionAmount("")
    }

    const addNamedLine = (
        list: DeductionItem[],
        setter: (next: DeductionItem[]) => void,
        name: string,
        amount: string,
    ) => {
        const label = name.trim()
        const value = Number(amount)
        if (!label || !Number.isFinite(value) || value === 0) return
        const existing = list.findIndex((item) => statutoryKey(item.name) === statutoryKey(label))
        if (existing >= 0) {
            setter(list.map((item, index) => (index === existing ? { ...item, amount: roundCurrency(item.amount + value) } : item)))
        } else {
            setter([...list, { name: label, amount: roundCurrency(value) }])
        }
    }

    const addOtherBonus = () => {
        addNamedLine(otherBonusItems, setOtherBonusItems, newOtherBonusName, newOtherBonusAmount)
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
        setOtherDeductionItems(
            (payroll.deduction_items || []).filter((item: any) => !isStatutoryDeduction(item.name) && statutoryKey(item.name) !== "helb"),
        )
        const helbLine = (payroll.deduction_items || []).find((item: any) => statutoryKey(item.name) === "helb")
        if (helbLine) {
            setDeductHelb(true)
            setHelbAmount(String(helbLine.amount || ""))
        }
        setOtherBonusItems(payroll.other_bonus_items || [])
        setStandardDeductionOverrides(payroll.standard_deduction_overrides || {})
        setDeductionsDisabled(Boolean(payroll.deductions_disabled))
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
            setDeductionsDisabled(false)
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
                base_salary: Number(calculatorResult.basic || genSalary || 0),
                bonus: Number(genBonus || 0),
                other_bonus_items: otherBonusItems,
                deduction_items: calculatorResult.items.filter((item) => !isStatutoryDeduction(item.name)),
                standard_deduction_overrides: standardDeductionOverrides,
                deductions_disabled: deductionsDisabled,
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

    const markPayrollPaid = async (payrollId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await api.payroll.update(payrollId, { status: "paid" })
            toast({
                description: "Marked paid — net salary posted to Cashflow & Banking (bank account).",
            })
            fetchData(true)
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error.message || "Failed to mark payroll as paid",
            })
        }
    }

    const downloadReceipt = async (payrollId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            const [payslipRes, brandingRes] = await Promise.all([
                api.payroll.getPayslipDetails(payrollId),
                api.company.getBranding().catch(() => null),
            ])
            const detail = payslipRes.data
            if (!detail?.payslip) {
                toast({ variant: "destructive", description: "Payslip details were not found" })
                return
            }
            downloadEmployeePayslip(detail, brandingRes?.data?.primaryColor || "#0f766e")
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error.message || "Failed to download payslip",
            })
        }
    }

    const exportMonthWorkbook = async () => {
        if (!payrolls.length) {
            toast({
                variant: "destructive",
                description: "Generate payslips for this month before exporting.",
            })
            return
        }
        try {
            setExporting(true)
            const brandingRes = await api.company.getBranding().catch(() => null)
            await downloadMonthPayrollWorkbook({
                companyName: brandingRes?.data?.name || "Company",
                month: selectedMonth,
                payrolls,
                employees,
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error.message || "Failed to export payroll workbook",
            })
        } finally {
            setExporting(false)
        }
    }

    const markAllPaid = async () => {
        try {
            const res = await api.payroll.markMonthPaid(selectedMonth)
            toast({
                description: res.message || `Month ${selectedMonth} marked paid.`,
            })
            await fetchData(true)
            router.push(`/admin/accounts/payroll/journal?month=${encodeURIComponent(selectedMonth)}`)
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error.message || "Failed to mark the month as paid",
            })
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
        <FinanceDocumentShell
            eyebrow="Accounts · Payroll"
            title="Payroll Management"
            description="Run the month, apply KRA PAYE bands, and add allowances, advances, and savings on the payslip."
            backHref="/admin/accounts"
            kpis={[
                {
                    label: "Employees",
                    value: employees.length,
                },
                {
                    label: "This Month Entries",
                    value: payrolls.length,
                },
                {
                    label: "Net Pay Total",
                    value: payrolls.reduce((sum, p) => sum + Number(p.net_pay || 0), 0),
                    prefix: "KES",
                },
                {
                    label: "Deductions Total",
                    value: payrolls.reduce((sum, p) => sum + Number(p.total_deductions || 0), 0),
                    prefix: "KES",
                    accent: "danger",
                },
            ]}
            toolbar={
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-40 h-9"
                    />
                    <Button
                        variant="outline"
                        className="gap-2 h-9"
                        onClick={() => void exportMonthWorkbook()}
                        disabled={exporting || loading || payrolls.length === 0}
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export payroll
                    </Button>
                    <Button variant="outline" className="gap-2 h-9" onClick={launchEmployeeDetails}>
                        <Calculator className="w-4 h-4" /> Employee Details
                    </Button>
                    <Dialog open={batchPayrollOpen} onOpenChange={setBatchPayrollOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 h-9">
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
                                    <h3 className="text-sm font-semibold mb-1">Statutory</h3>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        PAYE uses the KRA monthly bands on taxable pay (gross less NSSF and housing levy). SHIF stays 2.75% of gross.
                                    </p>
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
                                                    <p className="text-[10px] text-muted-foreground">{rule.note}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {calculatorResult.paye.bands.length > 0 && !deductionsDisabled && (
                                        <table className="mt-4 w-full text-xs">
                                            <thead>
                                                <tr className="text-left text-muted-foreground border-b">
                                                    <th className="py-1 font-medium">PAYE band</th>
                                                    <th className="py-1 font-medium">Rate</th>
                                                    <th className="py-1 font-medium text-right">Taxable</th>
                                                    <th className="py-1 font-medium text-right">Tax</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {calculatorResult.paye.bands.map((band) => (
                                                    <tr key={`${band.from}-${band.rate}`} className="border-b last:border-0">
                                                        <td className="py-1">
                                                            {band.from.toLocaleString()}
                                                            {band.to ? ` – ${band.to.toLocaleString()}` : "+"}
                                                        </td>
                                                        <td className="py-1">{band.rate}%</td>
                                                        <td className="py-1 text-right">{band.taxable.toLocaleString()}</td>
                                                        <td className="py-1 text-right">{band.tax.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td className="py-1" colSpan={3}>Personal relief</td>
                                                    <td className="py-1 text-right">-{PERSONAL_RELIEF.toLocaleString()}</td>
                                                </tr>
                                                <tr className="font-medium">
                                                    <td className="py-1" colSpan={3}>PAYE payable</td>
                                                    <td className="py-1 text-right">{calculatorResult.paye.paye.toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold">Allowances</h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ALLOWANCE_PRESETS.map((name) => (
                                                <Button
                                                    key={name}
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => setNewOtherBonusName(name)}
                                                >
                                                    {name}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm py-2 border-b">
                                                <span>Bonus</span>
                                                <Input
                                                    type="number"
                                                    value={genBonus}
                                                    onChange={(e) => setGenBonus(e.target.value)}
                                                    className="h-8 w-28 text-sm"
                                                />
                                            </div>
                                            {otherBonusItems.map((item, idx) => (
                                                <div key={`${item.name}-${idx}`} className="flex items-center justify-between text-sm py-2 border-b">
                                                    <span>{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span>+{item.amount.toLocaleString()}</span>
                                                        <Button size="sm" variant="ghost" onClick={() => removeOtherBonus(idx)} className="h-6 w-6 p-0 text-muted-foreground">
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Input
                                                    value={newOtherBonusName}
                                                    onChange={(e) => setNewOtherBonusName(e.target.value)}
                                                    placeholder="Allowance name"
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

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold">Other deductions</h3>
                                            <label className="flex items-center gap-2 text-xs">
                                                <Checkbox checked={deductionsDisabled} onCheckedChange={(v) => setDeductionsDisabled(Boolean(v))} />
                                                Skip statutory
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {DEDUCTION_PRESETS.map((name) => (
                                                <Button
                                                    key={name}
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => setNewOtherDeductionName(name)}
                                                >
                                                    {name}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm py-2 border-b">
                                                <span>HELB</span>
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
                                                        {deductHelb ? "On" : "Off"}
                                                    </Button>
                                                </div>
                                            </div>

                                            {otherDeductionItems.map((item, idx) => (
                                                <div key={`${item.name}-${idx}`} className="flex items-center justify-between text-sm py-2 border-b">
                                                    <span>{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span>-{item.amount.toLocaleString()}</span>
                                                        <Button size="sm" variant="ghost" onClick={() => removeOtherDeduction(idx)} className="h-6 w-6 p-0 text-muted-foreground">
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Input
                                                    value={newOtherDeductionName}
                                                    onChange={(e) => setNewOtherDeductionName(e.target.value)}
                                                    placeholder="Advance, savings, other…"
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
            }
        >

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

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">PAYE monthly bands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Tax is calculated on taxable pay (basic + allowances − NSSF − housing levy). Only the slice of salary that falls in a band is taxed at that rate. Personal relief of KES {PERSONAL_RELIEF.toLocaleString()} is then subtracted.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="py-2 font-medium">Monthly taxable pay</th>
                                    <th className="py-2 font-medium">Rate</th>
                                    <th className="py-2 font-medium text-right">This payslip</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PAYE_BANDS.map((band, index) => {
                                    const from = index === 0 ? 0 : PAYE_BANDS[index - 1].upTo
                                    const slice = calculatorResult.paye.bands.find((item) => item.rate === band.rate)
                                    return (
                                        <tr key={band.rate} className="border-b last:border-0">
                                            <td className="py-2">
                                                {from.toLocaleString()}
                                                {Number.isFinite(band.upTo) ? ` – ${band.upTo.toLocaleString()}` : "+"}
                                            </td>
                                            <td className="py-2">{band.rate}%</td>
                                            <td className="py-2 text-right">
                                                {slice ? `${slice.taxable.toLocaleString()} → ${slice.tax.toLocaleString()}` : "—"}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        SHIF 2.75% of gross · NSSF 6% of pensionable pay up to 72,000 · Housing levy 1.5% of gross.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle>Payroll List - {selectedMonth}</CardTitle>
                    {payrolls.some((row) => row.status !== "paid") ? (
                        <Button onClick={() => void markAllPaid()}>
                            Mark all paid · go to journal
                        </Button>
                    ) : payrolls.length ? (
                        <Button variant="outline" onClick={() => router.push(`/admin/accounts/payroll/journal?month=${encodeURIComponent(selectedMonth)}`)}>
                            Open month journal
                        </Button>
                    ) : null}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <TableSkeleton rows={8} />
                    ) : payrolls.length === 0 ? (
                        <div className="py-10 text-sm text-muted-foreground">
                            No payslips for {selectedMonth}. Use Generate Payslip to add one.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Employee</th>
                                        <th className="px-4 py-3 font-medium">Basic</th>
                                        <th className="px-4 py-3 font-medium">Allowances</th>
                                        <th className="px-4 py-3 font-medium">Deductions</th>
                                        <th className="px-4 py-3 font-medium">Net</th>
                                        <th className="px-4 py-3 font-medium">Generated</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payrolls.map((p) => {
                                        // Find employee name from cached list or use ID if not found
                                        const emp = employees.find(e => e._id === p.user_id)
                                        const name = emp ? `${emp.firstName} ${emp.lastName}` : p.user_id
                                        const allowanceTotal =
                                            Number(p.bonus || 0) +
                                            (p.other_bonus_items || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)

                                        return (
                                            <tr key={p._id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(p)}>
                                                <td className="px-4 py-3 font-medium">{name}</td>
                                                <td className="px-4 py-3">{Number(p.base_salary || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3">{allowanceTotal ? allowanceTotal.toLocaleString() : "—"}</td>
                                                <td className="px-4 py-3">{p.total_deductions > 0 ? p.total_deductions.toLocaleString() : "—"}</td>
                                                <td className="px-4 py-3 font-bold">{p.net_pay.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.generated_at), 'MMM d, HH:mm')}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                        p.status === "paid"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-green-100 text-green-700"
                                                    }`}>
                                                        {p.status.toUpperCase()}
                                                    </span>
                                                    {p.deductions_disabled ? (
                                                        <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                                                            NO TAX
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            onClick={(e) => void downloadReceipt(p._id, e)}
                                                        >
                                                            <Download className="mr-1 h-3 w-3" />
                                                            Receipt
                                                        </Button>
                                                        {p.status !== "paid" ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs"
                                                                onClick={(e) => void markPayrollPaid(p._id, e)}
                                                            >
                                                                Mark paid
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Paid</span>
                                                        )}
                                                    </div>
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
        </FinanceDocumentShell>
    )
}