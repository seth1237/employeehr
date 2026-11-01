"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowLeftRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"

type TransferKind = "inventory" | "asset" | "employee"
type CatalogItem = { _id: string; name: string; code?: string; available?: number }

const KIND_LABEL: Record<string, string> = {
  inventory: "Inventory",
  asset: "Asset",
  employee: "Employee",
  mixed: "Mixed",
}

function InterBranchTransfersPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const basePath = pathname.startsWith("/manager") ? "/manager/transfers" : "/admin/stock/transfers"
  const presetType = (searchParams.get("type") || "all") as string
  const presetBranch = searchParams.get("branch") || ""
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [context, setContext] = useState<any>(null)
  const [kindFilter, setKindFilter] = useState(presetType)
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [form, setForm] = useState({
    kind: (presetType === "asset" || presetType === "employee" ? presetType : "inventory") as TransferKind,
    fromBranchId: "",
    toBranchId: "",
    reason: "",
    notes: "",
    carrier: "",
    vehicleReg: "",
    itemId: "",
    quantity: 1,
    lines: [] as Array<{ kind: TransferKind; itemId: string; name: string; quantity: number }>,
  })

  const load = async () => {
    try {
      const [ctxRes, listRes] = await Promise.all([
        api.transfers.context(),
        api.transfers.getAll({
          kind: kindFilter === "all" ? undefined : kindFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          branchId: presetBranch || undefined,
        }),
      ])
      const ctx = ctxRes.data
      setContext(ctx)
      setRows(listRes.data || [])
      setForm((prev) => ({
        ...prev,
        fromBranchId: prev.fromBranchId || ctx?.defaultFromBranchId || ctx?.branches?.[0]?._id || "",
        toBranchId: prev.toBranchId || ctx?.defaultToBranchId || "",
      }))
    } catch (error: any) {
      toast({ description: error?.message || "Failed to load transfers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [kindFilter, statusFilter])

  useEffect(() => {
    if (presetType && presetType !== kindFilter) setKindFilter(presetType)
  }, [presetType])

  const loadCatalog = async (kind: TransferKind, branchId: string) => {
    if (!branchId) return
    try {
      const loader =
        kind === "asset"
          ? api.transfers.catalogAssets
          : kind === "employee"
            ? api.transfers.catalogEmployees
            : api.transfers.catalogProducts
      const res = await loader(branchId)
      setCatalog(res.data || [])
    } catch (error: any) {
      toast({ description: error?.message || "Failed to load branch items", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (showForm && form.fromBranchId) {
      void loadCatalog(form.kind, form.fromBranchId)
    }
  }, [showForm, form.kind, form.fromBranchId])

  const fromLocked = Boolean(context && !context.canManageAll && context.managedBranchIds?.length === 1)

  const addLine = () => {
    const item = catalog.find((row) => row._id === form.itemId)
    if (!item) {
      toast({ description: "Select an item to add", variant: "destructive" })
      return
    }
    const quantity = form.kind === "inventory" ? Math.max(1, Number(form.quantity || 1)) : 1
    if (form.kind === "inventory" && item.available != null && quantity > item.available) {
      toast({ description: `Only ${item.available} available at this branch`, variant: "destructive" })
      return
    }
    setForm((prev) => ({
      ...prev,
      itemId: "",
      quantity: 1,
      lines: [
        ...prev.lines.filter((line) => !(line.kind === prev.kind && line.itemId === item._id)),
        { kind: prev.kind, itemId: item._id, name: item.name, quantity },
      ],
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fromBranchId || !form.toBranchId) {
      toast({ description: "Select sending and receiving branches", variant: "destructive" })
      return
    }
    if (!form.lines.length) {
      toast({ description: "Add at least one item", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const created = await api.transfers.create({
        fromBranchId: form.fromBranchId,
        toBranchId: form.toBranchId,
        reason: form.reason,
        notes: form.notes,
        carrier: form.carrier,
        vehicleReg: form.vehicleReg,
        lines: form.lines,
      })
      toast({ description: `${created.data?.documentNumber || "Transfer"} saved as draft` })
      setShowForm(false)
      setForm((prev) => ({ ...prev, lines: [], reason: "", notes: "", carrier: "", vehicleReg: "" }))
      await load()
    } catch (error: any) {
      toast({ description: error?.message || "Could not create transfer", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const managedLabel = useMemo(() => {
    if (!context) return ""
    if (context.canManageAll) return "Company-wide: you can issue and receive for every branch."
    const names = (context.branches || [])
      .filter((branch: any) => branch.isMine)
      .map((branch: any) => branch.name)
    return names.length
      ? `Branch admin for ${names.join(", ")}. Issue from your branch, receive incoming transfers.`
      : "No branch is assigned to you yet. Ask a company admin to allocate one."
  }, [context])

  const branchCount = context?.branchCount ?? context?.branches?.length ?? 0
  const transfersEnabled = Boolean(context?.transfersEnabled ?? branchCount >= 2)
  const branchesHref = pathname.startsWith("/manager")
    ? "/manager"
    : "/admin/settings/system/branches"

  if (loading) return <PageLoadingSkeleton title="Inter-branch Transfers" />

  if (!transfersEnabled) {
    return (
      <div className="p-4 sm:p-6">
        <FinanceDocumentShell
          hideModuleNav
          eyebrow="Inventory"
          title="Inter-branch Transfers"
          description="Formal transfer notes for stock, assets, and staff — same document standard as invoices."
        >
          <Card>
            <CardContent className="space-y-4 p-10 text-center">
              <ArrowLeftRight className="mx-auto h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {branchCount === 1
                    ? "Add a second branch to activate transfers"
                    : "This workspace is active once the company has branches"}
                </p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  {branchCount === 1
                    ? "You already have one branch. Create another location so stock, assets, and staff can move with a formal transfer document."
                    : "Inter-branch transfers stay available for companies that operate more than one branch. Create branches first, assign a branch admin, then issue and receive transfers here."}
                </p>
              </div>
              <Button asChild>
                <Link href={branchesHref}>
                  {branchCount === 1 ? "Add another branch" : "Create branches"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </FinanceDocumentShell>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <FinanceDocumentShell
        hideModuleNav
        eyebrow="Inventory"
        title="Inter-branch Transfers"
        description={managedLabel}
        actions={
          <Button onClick={() => setShowForm((value) => !value)} className="gap-2">
            <Plus className="h-4 w-4" />
            New transfer
          </Button>
        }
      >

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create transfer document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Type</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value as TransferKind, itemId: "" })}
                  >
                    <option value="inventory">Inventory</option>
                    <option value="asset">Fixed asset</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div>
                  <Label>From branch</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.fromBranchId}
                    disabled={fromLocked}
                    onChange={(e) => setForm({ ...form, fromBranchId: e.target.value, lines: [] })}
                  >
                    <option value="">Select sending branch</option>
                    {(context?.branches || []).map((branch: any) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} {branch.isMine ? "(your branch)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>To branch</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.toBranchId}
                    onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}
                  >
                    <option value="">Select receiving branch</option>
                    {(context?.branches || [])
                      .filter((branch: any) => branch._id !== form.fromBranchId)
                      .map((branch: any) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} {branch.managerName ? `· ${branch.managerName}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Reason</Label>
                  <Input
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Stock balancing, deployment, posting..."
                  />
                </div>
                <div>
                  <Label>Carrier / vehicle</Label>
                  <Input
                    value={form.carrier}
                    onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    placeholder="Internal van, courier..."
                  />
                </div>
                <div>
                  <Label>Vehicle / reference</Label>
                  <Input
                    value={form.vehicleReg}
                    onChange={(e) => setForm({ ...form, vehicleReg: e.target.value })}
                    placeholder="KDA 123A"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto]">
                <div>
                  <Label>Add {KIND_LABEL[form.kind].toLowerCase()}</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.itemId}
                    onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                  >
                    <option value="">Select from sending branch</option>
                    {catalog.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                        {item.code ? ` · ${item.code}` : ""}
                        {item.available != null ? ` · ${item.available} available` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {form.kind === "inventory" ? (
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div />
                )}
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={addLine}>
                    Add line
                  </Button>
                </div>
              </div>

              {form.lines.length > 0 && (
                <div className="rounded-md border">
                  {form.lines.map((line) => (
                    <div key={`${line.kind}-${line.itemId}`} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-0">
                      <span>
                        {KIND_LABEL[line.kind]} · {line.name} · qty {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            lines: prev.lines.filter((row) => row !== line),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional handling instructions"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save draft"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", "inventory", "asset", "employee"].map((value) => (
          <Button
            key={value}
            size="sm"
            variant={kindFilter === value ? "default" : "outline"}
            onClick={() => setKindFilter(value)}
          >
            {value === "all" ? "All types" : KIND_LABEL[value]}
          </Button>
        ))}
        <span className="mx-2 h-8 w-px bg-border" />
        {["all", "draft", "in_transit", "received", "cancelled"].map((value) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            onClick={() => setStatusFilter(value)}
          >
            {value.replace("_", " ")}
          </Button>
        ))}
      </div>

      {!rows.length ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <ArrowLeftRight className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p>No transfers yet. Create a draft, issue the formal document, then receive at the destination branch.</p>
          </CardContent>
        </Card>
      ) : (
        <FinanceTableCard title="Transfer documents">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="px-4 py-3 font-medium">{row.documentNumber}</td>
                  <td className="px-4 py-3">{KIND_LABEL[row.kind] || row.kind}</td>
                  <td className="px-4 py-3">{row.fromBranchName}</td>
                  <td className="px-4 py-3">{row.toBranchName}</td>
                  <td className="px-4 py-3">{row.lines?.length || 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${basePath}/${row._id}`}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FinanceTableCard>
      )}
      </FinanceDocumentShell>
    </div>
  )
}

export default function InterBranchTransfersPageRoute() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Inter-branch Transfers" />}>
      <InterBranchTransfersPage />
    </Suspense>
  )
}
