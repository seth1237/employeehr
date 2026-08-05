"use client"

import { useEffect, useState } from "react"
import { WarehouseCanvas } from "@/components/admin/stock/warehouse-management"
import { stockApi } from "@/lib/api"

interface Warehouse {
  _id: string
  name: string
  rows: number
  cols: number
  cellPrefix?: string
  description?: string
  layoutObjects?: any[]
}

// ── Create Warehouse Modal ─────────────────────────────────────────────────────
function CreateWarehouseModal({
  onCreated,
}: {
  onCreated: (w: Warehouse) => void
}) {
  const [name, setName]        = useState("")
  const [rows, setRows]        = useState("10")
  const [cols, setCols]        = useState("10")
  const [prefix, setPrefix]    = useState("")
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState("")

  const handleCreate = async () => {
    if (!name.trim()) { setError("Warehouse name is required"); return }
    setLoading(true)
    setError("")
    try {
      const data = await stockApi.createWarehouse({
        name: name.trim(),
        rows: Number(rows),
        cols: Number(cols),
        cellPrefix: prefix || undefined,
      })
      if (!data.success || !data.data) throw new Error(data.message || "Failed to create")
      onCreated(data.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const templates = [
    { name: "Small Warehouse",       rows: 6,  cols: 6  },
    { name: "Medium Warehouse",      rows: 12, cols: 10 },
    { name: "Distribution Centre",   rows: 20, cols: 16 },
    { name: "Medical Storage",       rows: 10, cols: 8  },
    { name: "Cold Storage",          rows: 8,  cols: 8  },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500 mb-4">
            <span className="text-white text-2xl">⬡</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">
            Create your warehouse layout
          </h1>
          <p className="text-sm text-slate-500">
            Start from a template or configure your own grid.
          </p>
        </div>

        {/* templates */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setName(t.name)
                setRows(String(t.rows))
                setCols(String(t.cols))
              }}
              className="
                p-4 rounded-xl border border-slate-200 bg-white
                hover:border-blue-300 hover:bg-blue-50 text-left transition-all
              "
            >
              <p className="text-sm font-medium text-slate-700">{t.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.rows} × {t.cols} grid
              </p>
            </button>
          ))}
          <button
            onClick={() => { setName(""); setRows("10"); setCols("10") }}
            className="
              p-4 rounded-xl border border-dashed border-slate-300 bg-transparent
              hover:border-blue-400 text-left transition-all
            "
          >
            <p className="text-sm font-medium text-slate-500">Blank canvas</p>
            <p className="text-xs text-slate-400 mt-0.5">Configure manually</p>
          </button>
        </div>

        {/* form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              Warehouse name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nairobi Distribution Centre"
              className="
                w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-blue-400
              "
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Rows
              </label>
              <input
                type="number" min={1} max={50}
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className="
                  w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                "
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Columns
              </label>
              <input
                type="number" min={1} max={50}
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                className="
                  w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                "
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Cell prefix
              </label>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. A"
                maxLength={3}
                className="
                  w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                "
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="
              w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600
              text-white font-medium text-sm transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? "Creating…" : "Create warehouse"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Warehouse Picker ───────────────────────────────────────────────────────────
function WarehousePicker({
  warehouses,
  onSelect,
  onNew,
}: {
  warehouses: Warehouse[]
  onSelect: (w: Warehouse) => void
  onNew: () => void
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500 mb-3">
            <span className="text-white text-xl">⬡</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-1">
            Your warehouses
          </h1>
          <p className="text-sm text-slate-500">
            Open a warehouse to manage its layout and inventory.
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {warehouses.map((w) => (
            <button
              key={w._id}
              onClick={() => onSelect(w)}
              className="
                w-full flex items-center gap-3 p-4 rounded-xl
                bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50
                text-left transition-all group
              "
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-blue-500">⬡</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-700 group-hover:text-blue-600">
                  {w.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {w.rows} × {w.cols} grid
                  {w.description ? ` · ${w.description}` : ""}
                </p>
              </div>
              <span className="text-slate-300 group-hover:text-blue-400 text-lg">›</span>
            </button>
          ))}
        </div>

        <button
          onClick={onNew}
          className="
            w-full py-3 rounded-xl border border-dashed border-slate-300
            text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500
            transition-all
          "
        >
          + Create new warehouse
        </button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function WarehouseManagementSystemPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [active, setActive]         = useState<Warehouse | null>(null)
  const [creating, setCreating]     = useState(false)
  const [loading, setLoading]       = useState(true)
  const [products, setProducts]     = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      stockApi.getWarehouses(),
      stockApi.getProducts(),
    ])
      .then(([warehousesRes, productsRes]) => {
        if (warehousesRes.success) {
          setWarehouses(warehousesRes.data || [])
          if ((warehousesRes.data || []).length === 1) setActive((warehousesRes.data || [])[0])
        }
        if (productsRes.success) {
          setProducts(productsRes.data || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (w: Warehouse) => {
    setWarehouses((prev) => [...prev, w])
    setCreating(false)
    setActive(w)
  }

  const persistWarehouseLayout = async (objects: any[]) => {
    if (!active?._id) return
    const res = await stockApi.updateWarehouse(active._id, { layoutObjects: objects })
    if (res.success && res.data) {
      const updated = res.data
      setWarehouses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
      setActive(updated)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading warehouses…</p>
        </div>
      </div>
    )
  }

  if (active) {
    return (
      <WarehouseCanvas
        warehouse={active}
        initialObjects={active.layoutObjects || []}
        products={products}
        onSave={persistWarehouseLayout}
      />
    )
  }

  if (creating || warehouses.length === 0) {
    return <CreateWarehouseModal onCreated={handleCreated} />
  }

  return (
    <WarehousePicker
      warehouses={warehouses}
      onSelect={setActive}
      onNew={() => setCreating(true)}
    />
  )
}
