"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/apiBase";
import { getToken } from "@/lib/auth";
import { ArrowLeft, Plus } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";

interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  [key: string]: any;
}

interface Client {
  key: string;
  name: string;
  number: string;
  location: string;
  contactPerson?: string;
  source: "stock" | "accounts";
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  client?: {
    name?: string;
  };
}

interface InstalledMachine {
  _id: string;
  productName: string;
  serialNumber?: string;
  client?: {
    name?: string;
  };
  installationLocation?: string;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function NewComplaintPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [clientSearch, setClientSearch] = useState("");

  const [formData, setFormData] = useState({
    clientId: "",
    clientKey: "",
    clientName: "",
    clientNumber: "",
    clientLocation: "",
    title: "",
    description: "",
    complaintCategory: "",
    priority: "medium",
    relatedInvoiceId: "",
    relatedMachineId: "",
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [machines, setMachines] = useState<InstalledMachine[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const { toast } = useToast();

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const [stockRes, accountsRes, brandingRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/clients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/stock/accounts/clients`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/api/company/branding`, { headers: getAuthHeaders() }),
      ]);

      if (!stockRes.ok) throw new Error("Failed to fetch clients");

      const stockResult = await stockRes.json();
      const accountsResult = accountsRes.ok
        ? await accountsRes.json()
        : { data: [] };
      const brandingJson = brandingRes.ok
        ? await brandingRes.json()
        : { data: {} };
      setBranding(brandingJson.data || {});

      const mergedMap = new Map<string, Client>();

      for (const item of stockResult.data || []) {
        const name = String(item?.name || item?.sourceName || "").trim();
        const number = String(item?.number || item?.sourceNumber || "").trim();
        const location = String(
          item?.location || item?.sourceLocation || "",
        ).trim();
        if (!name || !number || !location) continue;
        const key = `${name}|${number}|${location}`.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            key,
            name,
            number,
            location,
            contactPerson: item?.contactPerson,
            source: "stock",
          });
        }
      }

      for (const row of accountsResult.data || []) {
        const name = String(row?.client?.name || "").trim();
        const number = String(row?.client?.number || "").trim();
        const location = String(row?.client?.location || "").trim();
        if (!name || !number || !location) continue;
        const key = `${name}|${number}|${location}`.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            key,
            name,
            number,
            location,
            source: "accounts",
          });
        }
      }

      setClients(
        Array.from(mergedMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.number.toLowerCase().includes(query) ||
        client.location.toLowerCase().includes(query) ||
        (client.contactPerson || "").toLowerCase().includes(query),
    );
  }, [clients, clientSearch]);

  // Fetch invoices and machines when client is selected
  const loadRelatedData = async (clientName: string) => {
    try {
      setLoadingRelated(true);
      const [invoiceRes, machineRes] = await Promise.all([
        fetch(
          `${API_URL}/api/stock/invoices?client=${encodeURIComponent(clientName)}`,
          {
            headers: getAuthHeaders(),
          },
        ),
        fetch(`${API_URL}/api/stock/installed-machines`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (invoiceRes.ok) {
        const invoiceData = await invoiceRes.json();
        const clientInvoices = (invoiceData.data || []).filter(
          (inv: any) =>
            inv.client?.name === clientName ||
            (inv as any).clientName === clientName,
        );
        setInvoices(clientInvoices);
      }

      if (machineRes.ok) {
        const machineData = await machineRes.json();
        const clientMachines = (machineData.data || []).filter(
          (m: any) => m.client?.name === clientName,
        );
        setMachines(clientMachines);
      }
    } catch (error) {
      console.error("Error loading related data:", error);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Determine if machine/invoice dropdown should show
  const shouldShowInvoiceDropdown = [
    "delayed_delivery",
    "billing_issues",
    "refund_requests",
  ].includes(formData.complaintCategory);

  const shouldShowMachineDropdown = [
    "warranty_claims",
    "technical_problems",
    "product_defects",
    "quality_issues",
  ].includes(formData.complaintCategory);

  const primaryColor = branding.primaryColor || "#0f766e";
  const secondaryColor = branding.secondaryColor || "#0ea5e9";
  const primarySoftColor = hexToRgba(primaryColor, 0.08);
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08);
  const primaryBorderColor = hexToRgba(primaryColor, 0.18);

  const submitComplaint = async () => {
    if (
      !formData.clientId ||
      !formData.title ||
      !formData.description ||
      !formData.complaintCategory
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`${API_URL}/api/complaints`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create complaint");
      const result = await response.json();

      toast({
        title: "Success",
        description: "Complaint created successfully",
      });

      router.push(`/admin/clients/complaints/${result.data._id}`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create complaint",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitComplaint();
  };

  if (loading) return <PageLoadingSkeleton title="Loading new complaint" rows={4} />;

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: primaryColor }}
            >
              Complaints
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              New Client Complaint
            </h1>
            <p className="text-sm text-muted-foreground">
              Register and track a new client complaint.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div>
              <Label>
                Search Existing Clients <span className="text-red-500">*</span>
              </Label>
              <Input
                className="mb-2 mt-2"
                placeholder="Search client by name, location, number or contact person"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              <div className="rounded-md border bg-background shadow-sm">
                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span>{filteredClients.length} client(s) found</span>
                  {formData.clientKey && (
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        setClientSearch("");
                        setFormData({
                          ...formData,
                          clientId: "",
                          clientKey: "",
                          clientName: "",
                          clientNumber: "",
                          clientLocation: "",
                        });
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {formData.clientKey ? (
                  <div className="p-3">
                    <div className="flex items-start justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                      <div>
                        <div className="font-medium text-teal-900">
                          Client selected
                        </div>
                        <div className="text-sm text-teal-800">
                          {formData.clientName}
                        </div>
                        <div className="text-xs text-teal-700">
                          {formData.clientNumber} · {formData.clientLocation}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            clientId: "",
                            clientKey: "",
                            clientName: "",
                            clientNumber: "",
                            clientLocation: "",
                          });
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No clients match your search.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto divide-y">
                    {filteredClients.map((client) => (
                      <button
                        key={client.key}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            clientId: client.key,
                            clientKey: client.key,
                            clientName: client.name,
                            clientNumber: client.number,
                            clientLocation: client.location,
                            relatedInvoiceId: "",
                            relatedMachineId: "",
                          });
                          setClientSearch("");
                          loadRelatedData(client.name);
                        }}
                        className="w-full px-3 py-3 text-left text-sm transition hover:bg-muted/60 bg-background"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.number} · {client.location}
                              {client.contactPerson
                                ? ` · ${client.contactPerson}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>
                Complaint Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Brief summary of the complaint"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Detailed description of the complaint"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={5}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.complaintCategory}
                  onValueChange={(value) =>
                    setFormData({ ...formData, complaintCategory: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select complaint category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poor_service">Poor Service</SelectItem>
                    <SelectItem value="delayed_delivery">
                      Delayed Delivery
                    </SelectItem>
                    <SelectItem value="billing_issues">
                      Billing Issues
                    </SelectItem>
                    <SelectItem value="product_defects">
                      Product Defects
                    </SelectItem>
                    <SelectItem value="staff_misconduct">
                      Staff Misconduct
                    </SelectItem>
                    <SelectItem value="technical_problems">
                      Technical Problems
                    </SelectItem>
                    <SelectItem value="warranty_claims">
                      Warranty Claims
                    </SelectItem>
                    <SelectItem value="refund_requests">
                      Refund Requests
                    </SelectItem>
                    <SelectItem value="quality_issues">
                      Quality Issues
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Related Invoice - Show for specific complaint types */}
            {shouldShowInvoiceDropdown && (
              <div className="space-y-2">
                <Label>Related Invoice</Label>
                <Select
                  value={formData.relatedInvoiceId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, relatedInvoiceId: value })
                  }
                  disabled={loadingRelated || invoices.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingRelated ? "Loading..." : "Select invoice"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.length > 0
                      ? invoices.map((inv) => (
                          <SelectItem key={inv._id} value={inv._id}>
                            {inv.invoiceNumber} -{" "}
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Related Machine - Show for machine-related complaint types */}
            {shouldShowMachineDropdown && (
              <div className="space-y-2">
                <Label>Related Machine</Label>
                <Select
                  value={formData.relatedMachineId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, relatedMachineId: value })
                  }
                  disabled={loadingRelated || machines.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingRelated ? "Loading..." : "Select machine"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.length > 0
                      ? machines.map((machine) => (
                          <SelectItem key={machine._id} value={machine._id}>
                            {machine.productName}
                            {machine.serialNumber
                              ? ` (${machine.serialNumber})`
                              : ""}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitComplaint}
                disabled={creating}
              >
                <Plus className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create Complaint"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
