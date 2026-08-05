"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/fetchUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateJobDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateJobDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({
    serviceId: "",
    clientId: "",
    scheduledDate: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchClients();
    }
  }, [open]);

  const fetchServices = async () => {
    try {
      const result = await fetchJson<{
        success: boolean;
        data: any[];
        message?: string;
      }>("/api/stock/services");
      if (result.response.ok && result.data?.success) {
        setServices(result.data.data);
      } else {
        throw new Error(result.errorMessage || "Failed to fetch services");
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch services";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const fetchClients = async () => {
    try {
      const result = await fetchJson<{
        success: boolean;
        data: any[];
        message?: string;
      }>("/api/stock/saved-clients");
      if (result.response.ok && result.data?.success) {
        setClients(result.data.data);
      } else {
        throw new Error(result.errorMessage || "Failed to fetch clients");
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch clients";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = { ...form };
      if (formData.clientId === "__none") {
        formData.clientId = "";
      }
      const result = await fetchJson<{
        success: boolean;
        data?: any;
        message?: string;
      }>("/api/stock/services/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (result.response.ok && result.data?.success) {
        onSuccess();
        setForm({ serviceId: "", clientId: "", scheduledDate: "", notes: "" });
      } else {
        throw new Error(result.errorMessage || "Failed to create job");
      }
    } catch (error) {
      console.error("Failed to create job:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create job";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Service Job</DialogTitle>
          <DialogDescription>
            Schedule a new service appointment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="service">Service</Label>
            <Select
              value={form.serviceId}
              onValueChange={(val) => setForm({ ...form, serviceId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc._id} value={svc._id}>
                    {svc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="client">Client (Optional)</Label>
            <Select
              value={form.clientId}
              onValueChange={(val) => setForm({ ...form, clientId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.key} value={client.key}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Scheduled Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm({ ...form, scheduledDate: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
