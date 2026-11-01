"use client"

import { useEffect, useState } from "react"
import { glApi, stockApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function StockAdjustmentsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ productId: "", quantity: 0, reason: "" })

  useEffect(() => {
    stockApi.getProducts?.().then((res: any) => setProducts(res.data || res || [])).catch(() => {
      glApi.getAccounts()
    })
  }, [])

  return (
    <FinanceDocumentShell
      eyebrow="Inventory Accounting"
      title="Stock Adjustments"
      description="Write on or write off quantity and post the inventory journal"
    >
      <FinanceTableCard title="Adjustment">
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Product</Label>
            {products.length ? (
              <select className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>{product.name}</option>
                ))}
              </select>
            ) : (
              <Input value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} placeholder="Stock product id" />
            )}
          </div>
          <div>
            <Label>Quantity (+/-)</Label>
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <Button onClick={async () => {
            try {
              await glApi.postStockAdjustment(form)
              window.alert("Adjustment posted")
            } catch (error: any) {
              window.alert(error.message)
            }
          }}>Post adjustment</Button>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
