"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { stockApi, companyApi } from "@/lib/api"
import { Save } from "lucide-react"

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank" },
]

export default function AddExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "",
    purpose: "",
    payeePhone: "",
    paymentMethod: "cash",
    vat: "",
    department: "",
    receiptNote: "",
    isRecurring: false,
    recurDate: "",
  })

  useEffect(() => {
    Promise.all([
      stockApi.getExpenseCategories(),
      companyApi.getDepartments().catch(() => ({ data: [] as any[] })),
    ])
      .then(([catRes, deptRes]) => {
        setCategories(catRes.data || [])
        setDepartments(deptRes.data || [])
      })
      .catch(() => {
        setCategories([])
        setDepartments([])
      })
      .finally(() => setLoading(false))
  }, [])

  const update = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async () => {
    if (!form.payeePhone.trim() || !form.amount || !form.purpose.trim()) {
      window.alert("Payee, amount, and purpose are required")
      return
    }
    if (!form.category) {
      window.alert("Select a category")
      return
    }
    if (form.isRecurring && !form.recurDate) {
      window.alert("Select the date this expense recurs")
      return
    }

    try {
      setSubmitting(true)
      let proofMeta:
        | {
            proofUrl?: string
            proofFileName?: string
            proofOriginalName?: string
          }
        | undefined

      if (proofFile) {
        setUploadingProof(true)
        const uploaded = await stockApi.uploadExpenseProof(proofFile)
        proofMeta = uploaded?.data || undefined
      }

      await stockApi.createManualExpense({
        payeePhone: form.payeePhone.trim(),
        amount: Number(form.amount),
        purpose: form.purpose.trim(),
        category: form.category,
        paymentMethod: form.paymentMethod,
        vat: form.vat ? Number(form.vat) : 0,
        department: form.department.trim() || undefined,
        receiptNote: form.receiptNote.trim() || undefined,
        expenseDate: form.expenseDate,
        isRecurring: form.isRecurring,
        recurDate: form.isRecurring ? form.recurDate : undefined,
        workflowStatus: "submitted",
        proofUrl: proofMeta?.proofUrl,
        proofFileName: proofMeta?.proofFileName,
        proofOriginalName: proofMeta?.proofOriginalName,
      })
      router.push("/admin/accounts/expenses")
    } catch (error: any) {
      window.alert(error?.message || "Failed to create expense")
    } finally {
      setUploadingProof(false)
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading add expense" rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Expenses"
      title="Add Expense"
      description="Record a company expense. Mark it as recurring if it repeats on a set date."
      backHref="/admin/accounts/expenses"
      actions={
        <Button onClick={() => void submit()} disabled={submitting}>
          <Save className="h-4 w-4 mr-1" />
          {submitting ? "Saving…" : "Save expense"}
        </Button>
      }
    >
      <FinanceTableCard title="Expense details">
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={form.expenseDate}
              onChange={(e) => update("expenseDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="expense-amount">Amount (KES)</Label>
            <Input
              id="expense-amount"
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No categories yet.{" "}
                <a href="/admin/accounts/expenses/categories" className="text-primary underline">
                  Create categories
                </a>
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="expense-payee">Payee / vendor</Label>
            <Input
              id="expense-payee"
              value={form.payeePhone}
              onChange={(e) => update("payeePhone", e.target.value)}
              placeholder="Vendor name or phone"
            />
          </div>
          <div>
            <Label>Payment method</Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) => update("paymentMethod", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="expense-vat">VAT (KES)</Label>
            <Input
              id="expense-vat"
              type="number"
              min={0}
              step="0.01"
              value={form.vat}
              onChange={(e) => update("vat", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Department</Label>
            <Select
              value={form.department || "__none__"}
              onValueChange={(v) => update("department", v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departments.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No departments found. Create them under company settings first.
              </p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="expense-purpose">Purpose / description</Label>
            <Textarea
              id="expense-purpose"
              rows={3}
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="What was this expense for?"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="expense-receipt">Receipt / attachment note</Label>
            <Textarea
              id="expense-receipt"
              rows={2}
              value={form.receiptNote}
              onChange={(e) => update("receiptNote", e.target.value)}
              placeholder="Receipt number, file reference, or note"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="expense-proof">Invoice / proof of transaction</Label>
            <Input
              id="expense-proof"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Upload the invoice or payment proof (PDF, image, or document, max 10MB).
              {proofFile ? ` Selected: ${proofFile.name}` : ""}
              {uploadingProof ? " Uploading…" : ""}
            </p>
          </div>

          <div className="md:col-span-2 rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="expense-recurring"
                checked={form.isRecurring}
                onCheckedChange={(checked) => update("isRecurring", Boolean(checked))}
              />
              <Label htmlFor="expense-recurring" className="cursor-pointer">
                This expense recurs
              </Label>
            </div>
            {form.isRecurring ? (
              <div className="max-w-xs">
                <Label htmlFor="expense-recur-date">Recur date</Label>
                <Input
                  id="expense-recur-date"
                  type="date"
                  value={form.recurDate}
                  onChange={(e) => update("recurDate", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose the next date this expense should recur.
                </p>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={() => void submit()} disabled={submitting}>
              <Save className="h-4 w-4 mr-1" />
              {submitting ? "Saving…" : "Save expense"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/accounts/expenses")}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
