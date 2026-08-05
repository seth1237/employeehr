"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav"
import { stockApi } from "@/lib/api"
import {
  getFavoriteHrefs,
  getRecentPages,
} from "@/lib/admin-personalization"
import {
  FileText,
  Package,
  Users,
  LayoutGrid,
  PlusCircle,
  Search,
  Star,
  Clock3,
} from "lucide-react"

type RecordHit = {
  type: "invoice" | "quotation" | "product" | "client"
  id: string
  title: string
  subtitle?: string
  href: string
}

export function AdminCommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [records, setRecords] = useState<RecordHit[]>([])
  const [searching, setSearching] = useState(false)
  const [recentPages, setRecentPages] = useState<ReturnType<typeof getRecentPages>>([])
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setRecentPages(getRecentPages())
      setFavoriteHrefs(getFavoriteHrefs())
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("admin-open-command-palette", onOpen)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("admin-open-command-palette", onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setRecords([])
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setRecords([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await stockApi.globalSearch(q)
        if (cancelled) return
        const data = res.data || {}
        const hits: RecordHit[] = []
        for (const inv of data.invoices || []) {
          hits.push({
            type: "invoice",
            id: inv._id,
            title: inv.invoiceNumber,
            subtitle: `${inv.client?.name || "Client"} · ${inv.status}`,
            href: `/admin/stock/invoices/${inv._id}`,
          })
        }
        for (const qt of data.quotations || []) {
          hits.push({
            type: "quotation",
            id: qt._id,
            title: qt.quotationNumber || qt._id,
            subtitle: `${qt.client?.name || "Client"} · ${qt.status}`,
            href: `/admin/stock/quotations/${qt._id}`,
          })
        }
        for (const p of data.products || []) {
          hits.push({
            type: "product",
            id: p._id,
            title: p.name,
            subtitle: `Qty ${p.currentQuantity ?? 0} · ${p.category || "Product"}`,
            href: `/admin/stock/add-inventory?productId=${p._id}`,
          })
        }
        for (const c of data.clients || []) {
          hits.push({
            type: "client",
            id: c._id,
            title: c.legalName || c.sourceName || "Client",
            subtitle: c.kraPin || c.sourceNumber || c.sourceLocation || "Client",
            href: `/admin/clients/clients-list?q=${encodeURIComponent(c.legalName || c.sourceName || "")}`,
          })
        }
        setRecords(hits.slice(0, 20))
      } catch {
        if (!cancelled) setRecords([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  const favoriteItems = ADMIN_NAV_ITEMS.filter((item) =>
    favoriteHrefs.includes(item.href),
  )

  const qLower = query.toLowerCase()
  const navMatches = ADMIN_NAV_ITEMS.filter((item) => {
    if (!qLower) return true
    const hay = `${item.label} ${item.section} ${(item.keywords || []).join(" ")}`.toLowerCase()
    return hay.includes(qLower)
  }).slice(0, qLower ? 12 : 8)

  const iconFor = (type: RecordHit["type"]) => {
    if (type === "invoice" || type === "quotation") return FileText
    if (type === "product") return Package
    return Users
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-w-[220px]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search pages & records...</span>
        <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to pages or records">
        <CommandInput
          placeholder="Search invoices, products, clients, pages..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{searching ? "Searching..." : "No results found."}</CommandEmpty>

          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => go("/admin/stock/quotations?action=new")}>
              <PlusCircle className="h-4 w-4" />
              Create quotation
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/stock/invoices")}>
              <FileText className="h-4 w-4" />
              Open invoices
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/alerts")}>
              <LayoutGrid className="h-4 w-4" />
              Notifications inbox
            </CommandItem>
          </CommandGroup>

          {!qLower && favoriteItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Favorites">
                {favoriteItems.map((item) => (
                  <CommandItem
                    key={`fav-${item.href}`}
                    onSelect={() => go(item.href)}
                    value={`favorite ${item.label}`}
                  >
                    <Star className="h-4 w-4 text-amber-500" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!qLower && recentPages.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recently used">
                {recentPages.slice(0, 6).map((page) => (
                  <CommandItem
                    key={`recent-${page.href}`}
                    onSelect={() => go(page.href)}
                    value={`recent ${page.label}`}
                  >
                    <Clock3 className="h-4 w-4" />
                    {page.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {records.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Records">
                {records.map((hit) => {
                  const Icon = iconFor(hit.type)
                  return (
                    <CommandItem key={`${hit.type}-${hit.id}`} onSelect={() => go(hit.href)} value={`${hit.title} ${hit.subtitle}`}>
                      <Icon className="h-4 w-4" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">{hit.subtitle}</span>
                        )}
                      </div>
                      <CommandShortcut className="capitalize">{hit.type}</CommandShortcut>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Pages">
            {navMatches.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.section} ${(item.keywords || []).join(" ")}`}
                onSelect={() => go(item.href)}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>{item.label}</span>
                <CommandShortcut>{item.section}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
