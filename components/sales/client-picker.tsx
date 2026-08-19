"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { salesApi } from "@/lib/api"

type ClientOption = {
  _id: string
  name: string
  phone?: string
  location?: string
  contactPerson?: string
}

export function SalesClientPicker({
  label = "Client",
  value,
  clientId,
  required,
  onChange,
}: {
  label?: string
  value: string
  clientId?: string
  required?: boolean
  onChange: (next: { name: string; clientId?: string; phone?: string; location?: string; contactPerson?: string }) => void
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<ClientOption[]>([])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setMatches([])
      return
    }
    const handle = setTimeout(() => {
      void salesApi.searchClients(q).then((res) => setMatches(res.data || [])).catch(() => setMatches([]))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const shown = useMemo(() => matches.slice(0, 8), [matches])

  return (
    <div className="relative space-y-1">
      <Label>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-11 pl-8"
          value={query}
          required={required}
          autoComplete="off"
          placeholder="Search clients or type a new name"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            onChange({ name: e.target.value, clientId: "" })
          }}
        />
      </div>
      {open && query.trim().length >= 1 ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-md">
          {shown.map((client) => (
            <button
              key={client._id}
              type="button"
              className="block w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange({
                  name: client.name,
                  clientId: client._id,
                  phone: client.phone,
                  location: client.location,
                  contactPerson: client.contactPerson,
                })
                setQuery(client.name)
                setOpen(false)
              }}
            >
              <span className="font-medium">{client.name}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {client.phone || "No phone"} {client.location ? `· ${client.location}` : ""}
              </span>
            </button>
          ))}
          <div className="border-t bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {clientId ? "Selected from CRM." : `Use “${query.trim()}” as a new client.`}{" "}
            <Link href="/sales/clients" className="font-medium text-teal-800 underline">
              Add client
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
