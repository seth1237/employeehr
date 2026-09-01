"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function JournalEntriesPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    reference: "",
    lines: [
      { accountId: "", debit: 0, credit: 0 },
      { accountId: "", debit: 0, credit: 0 }
    ]
  })
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [entriesRes, accountsRes] = await Promise.all([
        glApi.getJournals(),
        glApi.getAccounts()
      ])
      setEntries(entriesRes.data || [])
      setAccounts(accountsRes.data || [])
    } catch (err: any) {
      window.alert(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddLine = () => {
    setForm(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: "", debit: 0, credit: 0 }]
    }))
  }

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const newLines = [...form.lines]
    newLines[index] = { ...newLines[index], [field]: value }
    
    // Auto-balance logic for simple 2-line entries
    if (newLines.length === 2 && (field === 'debit' || field === 'credit')) {
      const otherIdx = index === 0 ? 1 : 0
      const otherField = field === 'debit' ? 'credit' : 'debit'
      newLines[otherIdx] = { ...newLines[otherIdx], [otherField]: value }
    }
    
    setForm(prev => ({ ...prev, lines: newLines }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await glApi.postJournal(form)
      setShowForm(false)
      setForm({
        date: new Date().toISOString().slice(0, 10),
        description: "",
        reference: "",
        lines: [
          { accountId: "", debit: 0, credit: 0 },
          { accountId: "", debit: 0, credit: 0 }
        ]
      })
      await loadData()
    } catch (err: any) {
      window.alert(err.message || "Failed to post journal entry")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Journal Entries" />

  return (
    <FinanceDocumentShell
      eyebrow="General Ledger"
      title="Journal Entries"
      description="View and post manual double-entry journals"
      kpis={[
        { label: "Total Entries", value: entries.length },
      ]}
    >
      {showForm ? (
        <FinanceTableCard title="New Journal Entry">
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <Label>Reference (Optional)</Label>
                <Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="e.g. ADJ-001" />
              </div>
              <div className="md:col-span-3">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Reason for this journal entry..." />
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Account</th>
                    <th className="p-2 w-32">Debit</th>
                    <th className="p-2 w-32">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        <select 
                          className="w-full h-9 rounded border bg-background px-3"
                          value={line.accountId}
                          onChange={e => handleUpdateLine(idx, "accountId", e.target.value)}
                        >
                          <option value="">Select Account...</option>
                          {accounts.map(acc => (
                            <option key={acc._id} value={acc._id}>{acc.code} - {acc.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <Input 
                          type="number" min="0" step="0.01"
                          value={line.debit || ""} 
                          onChange={e => handleUpdateLine(idx, "debit", parseFloat(e.target.value) || 0)} 
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          type="number" min="0" step="0.01"
                          value={line.credit || ""} 
                          onChange={e => handleUpdateLine(idx, "credit", parseFloat(e.target.value) || 0)} 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-muted/30 border-t flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={handleAddLine}>+ Add Line</Button>
                <div className="flex gap-4 text-sm font-medium mr-4">
                  <span>Total Debit: {form.lines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2)}</span>
                  <span>Total Credit: {form.lines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Posting..." : "Post Entry"}
              </Button>
            </div>
          </div>
        </FinanceTableCard>
      ) : (
        <FinanceTableCard 
          title="Recent Journals"
          headerRight={
            <Button size="sm" onClick={() => setShowForm(true)}>Post Manual Entry</Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Entry #</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No entries found.</td></tr>
                ) : (
                  entries.map((entry, idx) => (
                    <tr key={entry._id} className={`border-b ${idx % 2 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{entry.entryNumber}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{entry.source}</Badge>
                      </td>
                      <td className="px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {entry.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FinanceTableCard>
      )}
    </FinanceDocumentShell>
  )
}
