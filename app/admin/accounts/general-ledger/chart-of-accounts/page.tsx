"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle } from "lucide-react"

export default function ChartOfAccountsPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", type: "asset", description: "" })
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await glApi.getAccounts()
      setAccounts(res.data || [])
    } catch (err: any) {
      window.alert(err.message || "Failed to load accounts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async () => {
    if (!form.code || !form.name) return window.alert("Code and Name required")
    try {
      setSaving(true)
      await glApi.createAccount(form)
      setShowForm(false)
      setForm({ code: "", name: "", type: "asset", description: "" })
      await loadData()
    } catch (err: any) {
      window.alert(err.message || "Failed to create account")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Chart of Accounts" />

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Chart of Accounts"
      description="Manage the ledger accounts used for double-entry bookkeeping"
      kpis={[
        { label: "Total Accounts", value: accounts.length },
        { label: "Assets", value: accounts.filter(a => a.type === "asset").length },
        { label: "Liabilities", value: accounts.filter(a => a.type === "liability").length },
        { label: "Revenue/Expense", value: accounts.filter(a => ["revenue", "expense"].includes(a.type)).length },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <FinanceTableCard 
            title="Account List"
            headerRight={
              <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Account
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
                  <tr className="text-left border-b">
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Account Name</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">System</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc, idx) => (
                    <tr key={acc._id} className={`border-b ${idx % 2 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2 font-mono">{acc.code}</td>
                      <td className="px-4 py-2 font-medium">{acc.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="capitalize">{acc.type}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        {acc.isSystem && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FinanceTableCard>
        </div>

        {showForm && (
          <div>
            <FinanceTableCard title="Add Account">
              <div className="p-4 space-y-4 text-sm">
                <div>
                  <Label>Account Type</Label>
                  <select 
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm mt-1"
                    value={form.type} 
                    onChange={e => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <Label>Code</Label>
                  <Input 
                    value={form.code} 
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. 1050"
                  />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Petty Cash"
                  />
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Account"}
                </Button>
              </div>
            </FinanceTableCard>
          </div>
        )}
      </div>
    </FinanceDocumentShell>
  )
}
