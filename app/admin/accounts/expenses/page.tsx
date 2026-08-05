"use client"

import { useEffect, useMemo, useState } from "react"
import { stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown } from "lucide-react"

interface ExpenseRecord {
  _id: string
  payerPhone: string
  payeePhone: string
  amount: number
  purpose: string
  status: "pending" | "prompt_sent" | "completed" | "failed"
  responseMessage?: string
  createdAt: string
}

interface RepeatBillRecord {
  _id: string
  payerPhone: string
  payeePhones: string[]
  amount: number
  purpose: string
  lastRunAt?: string
  lastRunCount?: number
  createdAt: string
}

export default function AccountsExpensesPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [repeatSubmitting, setRepeatSubmitting] = useState(false)
  const [runningRepeatId, setRunningRepeatId] = useState<string | null>(null)
  const [showRepeatBills, setShowRepeatBills] = useState(true)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [repeatBills, setRepeatBills] = useState<RepeatBillRecord[]>([])
  const [form, setForm] = useState({
    payerPhone: "",
    payeePhone: "",
    amount: "",
    purpose: "",
  })
  const [repeatForm, setRepeatForm] = useState({
    payerPhone: "",
    payeePhones: "",
    amount: "",
    purpose: "",
  })

  const payerPhoneOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.payerPhone).filter(Boolean))),
    [expenses],
  )

  const payeePhoneOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.payeePhone).filter(Boolean))),
    [expenses],
  )

  const purposeOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.purpose).filter(Boolean))),
    [expenses],
  )

  const loadExpenses = async (opts?: SilentLoadOptions) => {
    try {
      await runDataLoad(
        setLoading,
        async () => {
          const response = await stockApi.getExpenses()
          setExpenses(response.data || [])
        },
        opts,
        setRefreshing,
      )
    } catch {
      setExpenses([])
    }
  }

  const loadRepeatBills = async () => {
    try {
      const response = await stockApi.getRepeatBills()
      setRepeatBills(response.data || [])
    } catch {
      setRepeatBills([])
    }
  }

  useEffect(() => {
    loadExpenses()
    loadRepeatBills()
  }, [])

  const initiateExpense = async () => {
    if (!form.payerPhone.trim() || !form.payeePhone.trim() || !form.amount.trim() || !form.purpose.trim()) {
      window.alert("Payer phone, payee phone, amount and purpose are required")
      return
    }

    const amountValue = Number(form.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      window.alert("Enter a valid amount")
      return
    }

    try {
      setSubmitting(true)
      const response = await stockApi.initiateExpense({
        payerPhone: form.payerPhone.trim(),
        payeePhone: form.payeePhone.trim(),
        amount: amountValue,
        purpose: form.purpose.trim(),
      })

      setForm({ payerPhone: "", payeePhone: "", amount: "", purpose: "" })
      await loadExpenses({ silent: true })
      window.alert(response.message || "M-Pesa prompt initiated")
    } catch (error: any) {
      window.alert(error?.message || "Failed to initiate expense")
    } finally {
      setSubmitting(false)
    }
  }

  const createRepeatBill = async () => {
    if (!repeatForm.payerPhone.trim() || !repeatForm.payeePhones.trim() || !repeatForm.amount.trim() || !repeatForm.purpose.trim()) {
      window.alert("Payer phone, payee numbers, amount and purpose are required")
      return
    }

    const amountValue = Number(repeatForm.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      window.alert("Enter a valid amount")
      return
    }

    const payeePhones = Array.from(
      new Set(
        repeatForm.payeePhones
          .split(/[\n,;]+/g)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    )

    if (!payeePhones.length) {
      window.alert("Enter at least one payee number")
      return
    }

    try {
      setRepeatSubmitting(true)
      const response = await stockApi.createRepeatBill({
        payerPhone: repeatForm.payerPhone.trim(),
        payeePhones,
        amount: amountValue,
        purpose: repeatForm.purpose.trim(),
        sendNow: true,
      })

      setRepeatForm({ payerPhone: "", payeePhones: "", amount: "", purpose: "" })
      await Promise.all([loadRepeatBills(), loadExpenses({ silent: true })])
      window.alert(response.message || "Repeat bill saved and sent")
    } catch (error: any) {
      window.alert(error?.message || "Failed to save repeat bill")
    } finally {
      setRepeatSubmitting(false)
    }
  }

  const runRepeatBill = async (repeatBillId: string) => {
    try {
      setRunningRepeatId(repeatBillId)
      const response = await stockApi.runRepeatBill(repeatBillId)
      await Promise.all([loadRepeatBills(), loadExpenses({ silent: true })])
      window.alert(response.message || "Repeat bill executed")
    } catch (error: any) {
      window.alert(error?.message || "Failed to run repeat bill")
    } finally {
      setRunningRepeatId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounts · Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Send M-Pesa prompts for bill payments and record purpose per expense.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Expense Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Payer Phone (Accountant)</Label>
              <Input
                list="payer-phone-options"
                value={form.payerPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, payerPhone: event.target.value }))}
                placeholder="2547XXXXXXXX"
              />
              <datalist id="payer-phone-options">
                {payerPhoneOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Payee Phone (Person Being Paid)</Label>
              <Input
                list="payee-phone-options"
                value={form.payeePhone}
                onChange={(event) => setForm((prev) => ({ ...prev, payeePhone: event.target.value }))}
                placeholder="2547XXXXXXXX"
              />
              <datalist id="payee-phone-options">
                {payeePhoneOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="1"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="1000"
              />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input
                list="purpose-options"
                value={form.purpose}
                onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                placeholder="Office internet bill"
              />
              <datalist id="purpose-options">
                {purposeOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          </div>

          <Button onClick={initiateExpense} disabled={submitting}>
            {submitting ? "Prompting..." : "Prompt M-Pesa Payment"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Payer</th>
                  <th className="py-2">Payee</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Purpose</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {loading && !refreshing ? (
                  <tr>
                    <td className="py-2" colSpan={7}>
                      <TableSkeleton rows={8} />
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td className="py-2" colSpan={7}>No expenses yet.</td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense._id} className="border-b">
                      <td className="py-2">{new Date(expense.createdAt).toLocaleString()}</td>
                      <td className="py-2">{expense.payerPhone}</td>
                      <td className="py-2">{expense.payeePhone}</td>
                      <td className="py-2">{expense.amount.toFixed(2)}</td>
                      <td className="py-2">{expense.purpose}</td>
                      <td className="py-2 capitalize">{expense.status.replace("_", " ")}</td>
                      <td className="py-2">{expense.responseMessage || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Repeat Bills</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRepeatBills(!showRepeatBills)}
            className="transition-transform"
          >
            <ChevronDown
              size={20}
              className={`transition-transform ${showRepeatBills ? "rotate-0" : "-rotate-90"}`}
            />
          </Button>
        </CardHeader>
        {showRepeatBills && (
          <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Save recurring bills and send prompts to multiple payee numbers at once.
          </p>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Payer Phone (Accountant)</Label>
              <Input
                value={repeatForm.payerPhone}
                onChange={(event) => setRepeatForm((prev) => ({ ...prev, payerPhone: event.target.value }))}
                placeholder="2547XXXXXXXX"
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="1"
                value={repeatForm.amount}
                onChange={(event) => setRepeatForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="1000"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Purpose</Label>
              <Input
                value={repeatForm.purpose}
                onChange={(event) => setRepeatForm((prev) => ({ ...prev, purpose: event.target.value }))}
                placeholder="Monthly office internet"
              />
            </div>
          </div>

          <div>
            <Label>Payee Numbers (comma/new line separated)</Label>
            <Textarea
              value={repeatForm.payeePhones}
              onChange={(event) => setRepeatForm((prev) => ({ ...prev, payeePhones: event.target.value }))}
              placeholder={"2547XXXXXXXX\n2547YYYYYYYY"}
              rows={4}
            />
          </div>

          <Button onClick={createRepeatBill} disabled={repeatSubmitting}>
            {repeatSubmitting ? "Saving & Sending..." : "Save Repeat Bill & Send"}
          </Button>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Created</th>
                  <th className="py-2">Payer</th>
                  <th className="py-2">Payees</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Purpose</th>
                  <th className="py-2">Last Run</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {repeatBills.length === 0 ? (
                  <tr>
                    <td className="py-2" colSpan={7}>No repeat bills yet.</td>
                  </tr>
                ) : (
                  repeatBills.map((bill) => (
                    <tr key={bill._id} className="border-b">
                      <td className="py-2">{new Date(bill.createdAt).toLocaleString()}</td>
                      <td className="py-2">{bill.payerPhone}</td>
                      <td className="py-2">{bill.payeePhones.length}</td>
                      <td className="py-2">{bill.amount.toFixed(2)}</td>
                      <td className="py-2">{bill.purpose}</td>
                      <td className="py-2">
                        {bill.lastRunAt ? `${new Date(bill.lastRunAt).toLocaleString()} (${bill.lastRunCount || 0})` : "Never"}
                      </td>
                      <td className="py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runRepeatBill(bill._id)}
                          disabled={runningRepeatId === bill._id}
                        >
                          {runningRepeatId === bill._id ? "Running..." : "Run Now"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        )}
      </Card>
    </div>
  )
}
