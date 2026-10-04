"use client"

import { getUser, logout } from "@/lib/auth"
import { posApi } from "@/lib/api"
import { getApiUrl } from "@/lib/apiBase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Lock,
  LogOut,
  Minus,
  Pause,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type PosProduct = {
  id: string
  name: string
  sku?: string
  barcode?: string
  categoryId?: string
  categoryName?: string
  sellingPrice: number
  quantity: number
  minAlertQuantity?: number
  stockStatus: "ok" | "low" | "out"
  imageUrl?: string
  taxable?: boolean
  taxRate?: number
  productType?: string
}

type CartLine = {
  productId: string
  name: string
  sku?: string
  quantity: number
  unitPrice: number
  stock: number
  taxable?: boolean
  taxRate?: number
}

type PaymentLine = {
  method: "cash" | "mpesa" | "card" | "bank"
  amount: number
  tendered?: number
  reference?: string
  phone?: string
}

const NOTES = [50, 100, 200, 500, 1000]

function money(value: number) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`
}

function kes(value: number) {
  return Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function payLabel(method: string) {
  const key = String(method || "").toLowerCase()
  if (key === "mpesa") return "M-PESA"
  return key.toUpperCase() || "CASH"
}

function saleWhen(sale: any) {
  const when = new Date(sale?.completedAt || Date.now())
  return {
    date: when.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  }
}

function imageSrc(url?: string) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  return `${getApiUrl()}${url.startsWith("/") ? "" : "/"}${url}`
}

function playBeep(ok: boolean) {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = "square"
    oscillator.frequency.value = ok ? 880 : 220
    gain.gain.value = 0.05
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + (ok ? 0.07 : 0.16))
  } catch {
    // optional
  }
}

function receiptLinesHtml(sale: any) {
  return (sale.items || [])
    .map((item: any) => {
      const name = esc(item.productName)
      const sku = item.sku ? `<div class="dim">${esc(item.sku)}</div>` : ""
      return `<div class="line">
        <div>${name}${sku}</div>
        <div class="row"><span>${Number(item.quantity)} x ${kes(item.unitPrice)}</span><span>${kes(item.lineTotal)}</span></div>
      </div>`
    })
    .join("")
}

function receiptPaymentsHtml(sale: any) {
  return (sale.payments || [])
    .map((row: any) => {
      const extra = row.reference || row.mpesaReceiptCode || row.phone || ""
      const change = Number(row.change || 0)
      return `<div class="row"><span>${payLabel(row.method)}</span><span>${kes(row.tendered ?? row.amount)}</span></div>
        ${extra ? `<div class="dim">${esc(extra)}</div>` : ""}
        ${change > 0 ? `<div class="row"><span>CHANGE</span><span>${kes(change)}</span></div>` : ""}`
    })
    .join("")
}

function receiptSlipHtml(sale: any, company: any) {
  const { date, time } = saleWhen(sale)
  const logo = company.logo ? `<img src="${esc(imageSrc(company.logo))}" alt=""/>` : ""
  const pin = [company.pinNumber ? `PIN: ${esc(company.pinNumber)}` : "", company.vatNumber ? `VAT: ${esc(company.vatNumber)}` : ""]
    .filter(Boolean)
    .join("  ")
  const discount = Number(sale.discountAmount || 0)
  const tax = Number(sale.taxTotal || 0)
  return `
    <div class="cut">--------------------------------</div>
    ${logo}
    <h1>${esc(company.name || "Receipt")}</h1>
    ${company.address ? `<div>${esc(company.address)}</div>` : ""}
    ${company.phone ? `<div>Tel: ${esc(company.phone)}</div>` : ""}
    ${pin ? `<div>${pin}</div>` : ""}
    <div class="cut">--------------------------------</div>
    <div class="row"><span>Rcpt</span><span>${esc(sale.receiptNo)}</span></div>
    <div class="row"><span>${esc(date)}</span><span>${esc(time)}</span></div>
    <div class="row"><span>Cashier</span><span>${esc(sale.cashierName || "")}</span></div>
    <div class="row"><span>Customer</span><span>${esc(sale.customerName || "Walk-in")}</span></div>
    <div class="cut">--------------------------------</div>
    ${receiptLinesHtml(sale)}
    <div class="cut">--------------------------------</div>
    <div class="row"><span>SUBTOTAL</span><span>${kes(sale.subtotal)}</span></div>
    ${discount > 0 ? `<div class="row"><span>DISCOUNT</span><span>${kes(discount)}</span></div>` : ""}
    ${tax > 0 ? `<div class="row"><span>VAT</span><span>${kes(tax)}</span></div>` : ""}
    <div class="row total"><span>TOTAL</span><span>KSh ${kes(sale.total)}</span></div>
    ${receiptPaymentsHtml(sale)}
    <div class="cut">--------------------------------</div>
    <div class="center">CUSTOMER COPY</div>
    <div class="center">Goods returnable with this receipt</div>
    <div class="center">*** THANK YOU ***</div>
    <div class="cut">--------------------------------</div>`
}

function printReceipt(sale: any, company: any) {
  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  frame.style.position = "fixed"
  frame.style.right = "0"
  frame.style.bottom = "0"
  frame.style.width = "0"
  frame.style.height = "0"
  frame.style.border = "0"
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) return
  doc.open()
  doc.write(`<!doctype html><html><head><title>${esc(sale.receiptNo)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    html, body { width: 80mm; margin: 0; padding: 0; background: #fff; }
    body {
      font-family: "Courier New", Courier, ui-monospace, monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #111;
      padding: 4mm 3mm 8mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 13px; margin: 0 0 2px; text-align: center; text-transform: uppercase; }
    img { display: block; height: 36px; margin: 0 auto 4px; object-fit: contain; }
    .center { text-align: center; }
    .cut { text-align: center; letter-spacing: 0.5px; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .line { margin-bottom: 4px; }
    .dim { opacity: 0.75; font-size: 10px; }
    .total { font-size: 13px; font-weight: 700; margin: 4px 0; }
  </style></head><body>
  ${receiptSlipHtml(sale, company)}
  </body></html>`)
  doc.close()
  const runPrint = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
  }
  frame.contentWindow?.addEventListener("afterprint", () => frame.remove())
  setTimeout(runPrint, company.logo ? 400 : 180)
  setTimeout(() => {
    if (frame.parentNode) frame.remove()
  }, 60000)
}

function ReceiptSlip({ sale, company }: { sale: any; company: any }) {
  const { date, time } = saleWhen(sale)
  const discount = Number(sale.discountAmount || 0)
  const tax = Number(sale.taxTotal || 0)
  return (
    <div className="mx-auto w-[80mm] bg-[#f4ecd8] px-3 py-3 font-mono text-[11px] leading-tight text-black shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="mb-1 text-center tracking-widest text-black/50">--------------------------------</div>
      {company.logo ? (
        <img src={imageSrc(company.logo)} alt="" className="mx-auto mb-1 h-9 object-contain" />
      ) : null}
      <p className="text-center text-[13px] font-bold uppercase">{company.name || "Receipt"}</p>
      {company.address ? <p className="text-center">{company.address}</p> : null}
      {company.phone ? <p className="text-center">Tel: {company.phone}</p> : null}
      {company.pinNumber || company.vatNumber ? (
        <p className="text-center">
          {company.pinNumber ? `PIN: ${company.pinNumber}` : ""}
          {company.pinNumber && company.vatNumber ? "  " : ""}
          {company.vatNumber ? `VAT: ${company.vatNumber}` : ""}
        </p>
      ) : null}
      <div className="my-1 text-center tracking-widest text-black/50">--------------------------------</div>
      <div className="flex justify-between gap-2"><span>Rcpt</span><span>{sale.receiptNo}</span></div>
      <div className="flex justify-between gap-2"><span>{date}</span><span>{time}</span></div>
      <div className="flex justify-between gap-2"><span>Cashier</span><span>{sale.cashierName}</span></div>
      <div className="flex justify-between gap-2"><span>Customer</span><span>{sale.customerName || "Walk-in"}</span></div>
      <div className="my-1 text-center tracking-widest text-black/50">--------------------------------</div>
      {(sale.items || []).map((item: any, index: number) => (
        <div key={`${item.productId || item.sku || index}-${index}`} className="mb-1">
          <div>{item.productName}</div>
          {item.sku ? <div className="text-[10px] text-black/70">{item.sku}</div> : null}
          <div className="flex justify-between gap-2">
            <span>{Number(item.quantity)} x {kes(item.unitPrice)}</span>
            <span>{kes(item.lineTotal)}</span>
          </div>
        </div>
      ))}
      <div className="my-1 text-center tracking-widest text-black/50">--------------------------------</div>
      <div className="flex justify-between gap-2"><span>SUBTOTAL</span><span>{kes(sale.subtotal)}</span></div>
      {discount > 0 ? (
        <div className="flex justify-between gap-2"><span>DISCOUNT</span><span>{kes(discount)}</span></div>
      ) : null}
      {tax > 0 ? (
        <div className="flex justify-between gap-2"><span>VAT</span><span>{kes(tax)}</span></div>
      ) : null}
      <div className="my-1 flex justify-between gap-2 text-[13px] font-bold">
        <span>TOTAL</span>
        <span>KSh {kes(sale.total)}</span>
      </div>
      {(sale.payments || []).map((row: any, index: number) => {
        const extra = row.reference || row.mpesaReceiptCode || row.phone || ""
        const change = Number(row.change || 0)
        return (
          <div key={`${row.method}-${index}`}>
            <div className="flex justify-between gap-2">
              <span>{payLabel(row.method)}</span>
              <span>{kes(row.tendered ?? row.amount)}</span>
            </div>
            {extra ? <div className="text-[10px] text-black/70">{extra}</div> : null}
            {change > 0 ? (
              <div className="flex justify-between gap-2">
                <span>CHANGE</span>
                <span>{kes(change)}</span>
              </div>
            ) : null}
          </div>
        )
      })}
      <div className="my-1 text-center tracking-widest text-black/50">--------------------------------</div>
      <p className="text-center">CUSTOMER COPY</p>
      <p className="text-center">Goods returnable with this receipt</p>
      <p className="text-center">*** THANK YOU ***</p>
      <div className="mt-1 text-center tracking-widest text-black/50">--------------------------------</div>
    </div>
  )
}

export function PosTerminal() {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>({})
  const [cashier, setCashier] = useState<any>({})
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [products, setProducts] = useState<PosProduct[]>([])
  const [today, setToday] = useState({ count: 0, total: 0 })
  const [heldCount, setHeldCount] = useState(0)
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [discountPercent, setDiscountPercent] = useState("0")
  const [payOpen, setPayOpen] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)
  const [holdsOpen, setHoldsOpen] = useState(false)
  const [salesOpen, setSalesOpen] = useState(false)
  const [holds, setHolds] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [holdId, setHoldId] = useState("")
  const [payMethod, setPayMethod] = useState<"cash" | "mpesa" | "card" | "bank" | "split">("cash")
  const [cashTendered, setCashTendered] = useState("")
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [mpesaCode, setMpesaCode] = useState("")
  const [reference, setReference] = useState("")

  const load = useCallback(async () => {
    const result = await posApi.bootstrap()
    const data = result.data || {}
    setCompany(data.company || {})
    setCashier(data.cashier || {})
    setCategories(data.categories || [])
    setProducts(data.products || [])
    setToday(data.today || { count: 0, total: 0 })
    setHeldCount(data.heldCount || 0)
    setLoading(false)
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    load().catch((error) => {
      toast({ title: "Till could not open", description: error.message, variant: "destructive" })
      setLoading(false)
    })
  }, [load, toast])

  const tillCategories = useMemo(() => {
    const used = new Set(products.map((product) => product.categoryId).filter(Boolean))
    return categories.filter((category) => used.has(category.id))
  }, [categories, products])

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false
      if (!needle) return true
      return (
        product.name.toLowerCase().includes(needle) ||
        product.sku?.toLowerCase().includes(needle) ||
        product.barcode?.toLowerCase().includes(needle)
      )
    })
  }, [products, query, categoryId])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    const percent = Math.max(0, Number(discountPercent || 0))
    const discount = Number(((subtotal * percent) / 100).toFixed(2))
    const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1
    const tax = cart.reduce((sum, line) => {
      if (!line.taxable) return sum
      const lineTotal = line.quantity * line.unitPrice * factor
      return sum + lineTotal * ((Number(line.taxRate || 16) || 0) / 100)
    }, 0)
    const total = Math.max(0, Number((subtotal - discount + tax).toFixed(2)))
    return {
      subtotal,
      discount,
      percent,
      tax: Number(tax.toFixed(2)),
      total,
      count: cart.reduce((sum, line) => sum + line.quantity, 0),
    }
  }, [cart, discountPercent])

  const addProduct = (product: PosProduct, increment = 1) => {
    if (product.productType !== "service" && product.quantity <= 0) {
      playBeep(false)
      toast({
        title: `${product.name} is out of stock`,
        description: "Only 0 left in this branch. Remove the item or check with your supervisor.",
        variant: "destructive",
      })
      return
    }
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id)
      if (existing) {
        const nextQty = existing.quantity + increment
        if (product.productType !== "service" && nextQty > product.quantity) {
          playBeep(false)
          toast({ title: "Not enough stock", description: `Only ${product.quantity} left.`, variant: "destructive" })
          return current
        }
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity: nextQty } : line,
        )
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: increment,
          unitPrice: product.sellingPrice,
          stock: product.quantity,
          taxable: product.taxable,
          taxRate: product.taxRate,
        },
      ]
    })
    playBeep(true)
  }

  const handleSearchSubmit = async () => {
    const code = query.trim()
    if (code.length < 2) return
    try {
      const result = await posApi.lookup(code)
      if (result.success && result.data) {
        addProduct(result.data)
        setQuery("")
        searchRef.current?.focus()
        return
      }
    } catch {
      // fall through to first catalog match
    }
    const match = products.find(
      (product) =>
        product.sku?.toLowerCase() === code.toLowerCase() ||
        product.barcode?.toLowerCase() === code.toLowerCase() ||
        product.name.toLowerCase() === code.toLowerCase(),
    )
    if (match) {
      addProduct(match)
      setQuery("")
    } else {
      playBeep(false)
      toast({
        title: "No products match",
        description: `No products match "${code}". Check the spelling or try the barcode.`,
        variant: "destructive",
      })
    }
  }

  const setQty = (productId: string, quantity: number) => {
    setCart((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  const resetTill = () => {
    setCart([])
    setHoldId("")
    setCustomerName("")
    setCustomerPhone("")
    setDiscountPercent("0")
    setPayOpen(false)
    setQuery("")
    setPayMethod("cash")
    setCashTendered("")
    setMpesaPhone("")
    setMpesaCode("")
    setReference("")
  }

  const startNewSale = () => {
    resetTill()
    setReceipt(null)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  const clearCart = () => {
    startNewSale()
  }

  const salePayload = () => ({
    items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    customerName: customerName || "Walk-in",
    customerPhone,
    discountPercent: Number(discountPercent || 0),
    holdId: holdId || undefined,
  })

  const handleHold = async () => {
    if (!cart.length) return
    setBusy(true)
    try {
      const result = await posApi.hold(salePayload())
      toast({ title: result.message || "Sale held" })
      setHeldCount((count) => count + 1)
      clearCart()
    } catch (error: any) {
      toast({ title: "Could not hold sale", description: error.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const openHolds = async () => {
    setHoldsOpen(true)
    const result = await posApi.listHolds()
    setHolds(result.data || [])
  }

  const openSales = async () => {
    setSalesOpen(true)
    const result = await posApi.listSales()
    setSales(result.data || [])
  }

  const resumeHold = async (id: string) => {
    const result = await posApi.resumeHold(id)
    const sale = result.data
    setCart(
      (sale.items || []).map((item: any) => ({
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        stock: item.quantity,
        taxable: item.taxable,
        taxRate: item.taxRate,
      })),
    )
    setCustomerName(sale.customerName === "Walk-in" ? "" : sale.customerName || "")
    setCustomerPhone(sale.customerPhone || "")
    setDiscountPercent(String(sale.discountPercent || 0))
    setHoldId(String(sale._id))
    setHoldsOpen(false)
    searchRef.current?.focus()
  }

  const buildPayments = (): PaymentLine[] => {
    if (payMethod === "cash") {
      const tendered = Number(cashTendered || totals.total)
      return [{ method: "cash", amount: totals.total, tendered }]
    }
    if (payMethod === "mpesa") {
      return [
        {
          method: "mpesa",
          amount: totals.total,
          phone: mpesaPhone,
          reference: mpesaCode,
        },
      ]
    }
    if (payMethod === "card" || payMethod === "bank") {
      return [{ method: payMethod, amount: totals.total, reference }]
    }
    return []
  }

  const handlePay = async () => {
    if (!cart.length) return
    setBusy(true)
    try {
      const sold = cart
      const result = await posApi.checkout({
        ...salePayload(),
        payments: buildPayments(),
      })
      setProducts((current) =>
        current.map((product) => {
          const line = sold.find((row) => row.productId === product.id)
          if (!line || product.productType === "service") return product
          const quantity = Math.max(0, product.quantity - line.quantity)
          const min = Number(product.minAlertQuantity || 0)
          return {
            ...product,
            quantity,
            stockStatus: quantity <= 0 ? "out" : min > 0 && quantity <= min ? "low" : "ok",
          }
        }),
      )
      if (holdId) setHeldCount((count) => Math.max(0, count - 1))
      setReceipt(result.data)
      setPayOpen(false)
      resetTill()
      setToday((current) => ({
        count: current.count + 1,
        total: current.total + Number(result.data?.total || totals.total),
      }))
      toast({ title: result.message || "Payment received" })
    } catch (error: any) {
      toast({ title: "Payment not complete", description: error.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const sendStk = async () => {
    setBusy(true)
    try {
      const result = await posApi.stkPush({ phone: mpesaPhone, amount: totals.total })
      toast({ title: result.message || "Waiting for M-Pesa" })
    } catch (error: any) {
      toast({ title: "M-Pesa failed", description: error.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (locked) return
      if (event.key === "F2") {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === "F6") {
        event.preventDefault()
        void handleHold()
      }
      if (event.key === "F8") {
        event.preventDefault()
        if (cart.length) setPayOpen(true)
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        if (receipt) {
          event.preventDefault()
          printReceipt(receipt, company)
        }
      }
      if (event.key === "Escape") {
        setPayOpen(false)
        setHoldsOpen(false)
        setSalesOpen(false)
        if (receipt) startNewSale()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const changeDue = Math.max(0, Number(cashTendered || 0) - totals.total)
  const brand = company.primaryColor || "#0f766e"
  const user = getUser()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Opening till…
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex items-center justify-between gap-3 px-4 py-3 text-white" style={{ backgroundColor: brand }}>
        <div className="flex items-center gap-3 min-w-0">
          {company.logo ? (
            <img src={imageSrc(company.logo)} alt="" className="h-9 w-9 rounded bg-white object-contain" />
          ) : null}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-white/80">Point of sale</p>
            <p className="truncate font-semibold">{company.name || "Elevate"}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm">
          <span>
            {cashier.name || user?.first_name} · Cashier
          </span>
          <span>
            Today {today.count} · {money(today.total)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void openHolds()}>
            Held ({heldCount})
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void openSales()}>
            My sales
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLocked(true)}>
            <Lock className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <section className="flex min-h-0 flex-col gap-3 p-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSearchSubmit()
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Scan barcode or search product"
                className="h-12 pl-9 text-base"
                autoFocus
              />
            </div>
            <Button type="submit" className="h-12 px-5" style={{ backgroundColor: brand }}>
              Add
            </Button>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button size="sm" variant={!categoryId ? "default" : "outline"} onClick={() => setCategoryId("")}>
              All
            </Button>
            {tillCategories.map((category) => (
              <Button
                key={category.id}
                size="sm"
                variant={categoryId === category.id ? "default" : "outline"}
                className="max-w-[10rem] shrink-0"
                title={category.name}
                onClick={() => setCategoryId(category.id)}
              >
                <span className="truncate">{category.name}</span>
              </Button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleProducts.length ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-teal-600 hover:shadow"
                  >
                    {product.imageUrl ? (
                      <img src={imageSrc(product.imageUrl)} alt="" className="mb-2 h-16 w-full rounded object-cover" />
                    ) : null}
                    <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 font-mono text-sm">{money(product.sellingPrice)}</p>
                    <p
                      className={`text-xs ${
                        product.stockStatus === "out"
                          ? "text-red-600"
                          : product.stockStatus === "low"
                            ? "text-amber-600"
                            : "text-slate-500"
                      }`}
                    >
                      {product.stockStatus === "out"
                        ? "Out of stock"
                        : product.stockStatus === "low"
                          ? `Low · ${product.quantity}`
                          : `${product.quantity} in stock`}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-slate-500">
                {query
                  ? `No products match "${query}". Check the spelling or try the barcode.`
                  : "No items yet. Scan a barcode or search to start the sale."}
              </p>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Current sale</p>
              <p className="font-semibold">{totals.count} {totals.count === 1 ? "item" : "items"}</p>
            </div>
            <ShoppingCart className="h-5 w-5 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-b p-3">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <Input
              placeholder="Phone"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length ? (
              cart.map((line) => (
                <div key={line.productId} className="flex items-center gap-2 border-b px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.name}</p>
                    <p className="text-xs text-slate-500">{money(line.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(line.productId, line.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      className="h-8 w-14 text-center"
                      value={line.quantity}
                      onChange={(event) => setQty(line.productId, Number(event.target.value || 1))}
                    />
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(line.productId, line.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="w-20 text-right font-mono text-sm">{money(line.quantity * line.unitPrice)}</p>
                  <Button size="icon" variant="ghost" onClick={() => setCart((current) => current.filter((row) => row.productId !== line.productId))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-slate-500">
                No items yet. Scan a barcode or search to start the sale.
              </p>
            )}
          </div>
          <div className="space-y-2 border-t p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <Label htmlFor="discount">Discount %</Label>
              <Input
                id="discount"
                className="h-8 w-20"
                type="number"
                min={0}
                max={10}
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Discount</span>
              <span>{money(totals.discount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Tax</span>
              <span>{money(totals.tax)}</span>
            </div>
            <div className="flex items-center justify-between text-xl font-bold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" disabled={!cart.length || busy} onClick={() => void handleHold()}>
                <Pause className="mr-1 h-4 w-4" />
                Hold sale
              </Button>
              <Button
                variant="outline"
                disabled={!cart.length}
                onClick={() => {
                  if (window.confirm(`Clear ${cart.length} item${cart.length === 1 ? "" : "s"}?`)) clearCart()
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
            <Button
              className="h-14 w-full text-lg"
              disabled={!cart.length || busy}
              style={{ backgroundColor: brand }}
              onClick={() => {
                setCashTendered(String(Math.ceil(totals.total)))
                setPayOpen(true)
              }}
            >
              Pay {money(totals.total)}
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Take payment</DialogTitle>
            <DialogDescription>Sale completes only when paid in full.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {(["cash", "mpesa", "card", "bank"] as const).map((method) => (
              <Button
                key={method}
                variant={payMethod === method ? "default" : "outline"}
                onClick={() => setPayMethod(method)}
                className="capitalize"
              >
                {method === "mpesa" ? "M-Pesa" : method}
              </Button>
            ))}
          </div>
          {payMethod === "cash" ? (
            <div className="space-y-3">
              <Label>Amount received</Label>
              <Input
                type="number"
                value={cashTendered}
                onChange={(event) => setCashTendered(event.target.value)}
                className="h-12 text-lg"
              />
              <div className="flex flex-wrap gap-2">
                {NOTES.map((note) => (
                  <Button key={note} type="button" variant="outline" onClick={() => setCashTendered(String(note))}>
                    {note}
                  </Button>
                ))}
              </div>
              {Number(cashTendered || 0) + 0.009 < totals.total ? (
                <p className="text-red-600">
                  Amount received is {money(totals.total - Number(cashTendered || 0))} short. Enter
                  the full amount or add another payment method.
                </p>
              ) : (
                <p className="text-emerald-700">Change due: {money(changeDue)}</p>
              )}
            </div>
          ) : null}
          {payMethod === "mpesa" ? (
            <div className="space-y-3">
              <Label>Customer phone</Label>
              <Input value={mpesaPhone} onChange={(event) => setMpesaPhone(event.target.value)} placeholder="07XX XXX XXX" />
              <Button type="button" variant="outline" onClick={() => void sendStk()} disabled={busy || !mpesaPhone}>
                Send STK push
              </Button>
              <Label>M-Pesa code</Label>
              <Input value={mpesaCode} onChange={(event) => setMpesaCode(event.target.value)} placeholder="QBR7X..." />
            </div>
          ) : null}
          {payMethod === "card" || payMethod === "bank" ? (
            <div className="space-y-2">
              <Label>Reference number</Label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Back
            </Button>
            <Button
              disabled={
                busy ||
                (payMethod === "cash" && Number(cashTendered || 0) + 0.009 < totals.total) ||
                (payMethod === "mpesa" && !mpesaPhone.trim() && !mpesaCode.trim()) ||
                ((payMethod === "card" || payMethod === "bank") && !reference.trim())
              }
              onClick={() => void handlePay()}
              style={{ backgroundColor: brand }}
            >
              {busy ? "Taking payment…" : `Confirm ${money(totals.total)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(receipt)}
        onOpenChange={(open) => {
          if (!open) startNewSale()
        }}
      >
        <DialogContent className="max-w-[340px] sm:max-w-[340px] gap-0 border-0 bg-transparent p-0 shadow-none" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Payment received</DialogTitle>
            <DialogDescription>
              Receipt {receipt?.receiptNo} is ready.
            </DialogDescription>
          </DialogHeader>
          {receipt ? <ReceiptSlip sale={receipt} company={company} /> : null}
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-white"
              onClick={() => printReceipt(receipt, company)}
            >
              <Printer className="mr-1 h-4 w-4" />
              Print slip
            </Button>
            <Button className="flex-1" onClick={startNewSale} style={{ backgroundColor: brand }}>
              New sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={holdsOpen} onOpenChange={setHoldsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Held sales</DialogTitle>
          </DialogHeader>
          {holds.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {holds.map((hold) => (
                <button
                  key={hold._id}
                  type="button"
                  className="w-full rounded-lg border p-3 text-left hover:bg-slate-50"
                  onClick={() => void resumeHold(hold._id)}
                >
                  <p className="font-medium">Hold #{hold.holdNo} · {hold.customerName}</p>
                  <p className="text-sm text-slate-500">
                    {hold.items?.length || 0} items · {money(hold.total)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No held sales. Hold a sale to serve another customer, then resume it here.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={salesOpen} onOpenChange={setSalesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My transactions</DialogTitle>
          </DialogHeader>
          {sales.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sales.map((sale) => (
                <div key={sale._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{sale.receiptNo}</p>
                    <p className="text-sm text-slate-500">{money(sale.total)} · {sale.customerName}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => printReceipt(sale, company)}>
                    Reprint
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No sales yet today. Completed sales will appear here.</p>
          )}
        </DialogContent>
      </Dialog>

      {locked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 text-white">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900">
            <Lock className="mb-3 h-8 w-8" />
            <h2 className="text-xl font-semibold">Register locked</h2>
            <p className="mb-4 text-sm text-slate-500">Your shift is still open. Unlock to keep selling.</p>
            <Button className="w-full" onClick={() => setLocked(false)} style={{ backgroundColor: brand }}>
              Unlock
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
