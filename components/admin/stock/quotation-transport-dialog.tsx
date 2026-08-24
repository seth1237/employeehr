"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type QuotationTransportInput = {
  transportCost?: number
  transportNote?: string
}

type QuotationTransportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: QuotationTransportInput) => void | Promise<void>
  loading?: boolean
  clientName?: string
}

export function QuotationTransportDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  clientName,
}: QuotationTransportDialogProps) {
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    if (!open) {
      setAmount("")
      setNote("")
    }
  }, [open])

  const handleConfirm = async () => {
    const transportCost = amount.trim() ? Number(amount) : undefined
    if (transportCost !== undefined && (!Number.isFinite(transportCost) || transportCost < 0)) {
      window.alert("Enter a valid transport amount or leave it blank to skip.")
      return
    }
    await onConfirm({
      transportCost,
      transportNote: note.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transport cost</DialogTitle>
          <DialogDescription>
            {clientName
              ? `Record delivery transport for ${clientName}. This will appear under Transport in company expenses.`
              : "Record delivery transport for this invoice. This will appear under Transport in company expenses."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="transport-amount">Transport amount (KES)</Label>
            <Input
              id="transport-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00 — leave blank if none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="transport-note">Notes (optional)</Label>
            <Textarea
              id="transport-note"
              rows={3}
              placeholder="Courier, route, vehicle, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={loading}>
            {loading ? "Converting…" : "Convert to invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
