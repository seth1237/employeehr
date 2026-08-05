"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import API_URL from "@/lib/apiBase";
import { getToken, getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyStampToPdf,
  generateDeliveryNotePdf,
  generateInvoicePdf,
  type InvoiceDocumentSettings,
  type TenantBranding,
} from "@/lib/stock-document-pdf";

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  description?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  deliveryNoteNumber: string;
  quotationNumber?: string;
  client: { name: string; number: string; location: string };
  items: InvoiceItem[];
  subTotal: number;
  status: "issued" | "paid" | "cancelled";
  createdBy: string;
  createdAt: string;
  dispatch?: {
    status:
      | "not_assigned"
      | "assigned"
      | "packing"
      | "packed"
      | "dispatched"
      | "delivered";
    assignedToUserId?: string;
    packingItems?: Array<{ requiredQuantity: number; packedQuantity: number }>;
  };
}

interface DispatchUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
  signatureUrl?: string;
}

interface StampOption {
  _id: string;
  name: string;
}

type SortOption =
  | "date-desc"
  | "date-asc"
  | "client-asc"
  | "client-desc"
  | "amount-desc"
  | "amount-asc"
  | "invoice-asc"
  | "invoice-desc";

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

export default function EmployeeInvoicesPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceDocumentSettings>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [dispatchUsers, setDispatchUsers] = useState<DispatchUser[]>([]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (!q) return;
    setSearchInput(q);
    setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  );

  const primaryColor = branding.primaryColor || "#0f766e";
  const secondaryColor = branding.secondaryColor || "#0ea5e9";
  const primarySoftColor = hexToRgba(primaryColor, 0.08);
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08);
  const primaryBorderColor = hexToRgba(primaryColor, 0.18);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const invoicesResponse = await fetch(`${API_URL}/api/stock/invoices`, {
        headers,
      });
      const invoicesData = await invoicesResponse.json();
      if (!invoicesResponse.ok) {
        throw new Error(invoicesData.message || "Failed to load invoices");
      }
      setInvoices(invoicesData.data || []);

      const [brandingResult, invoiceSettingsResult, usersResult] =
        await Promise.allSettled([
          fetch(`${API_URL}/api/company/branding`, { headers }),
          fetch(`${API_URL}/api/company/invoice-settings`, { headers }),
          fetch(`${API_URL}/api/users`, { headers }),
        ]);

      if (brandingResult.status === "fulfilled") {
        try {
          const brandingData = await brandingResult.value.json();
          setBranding(brandingData.data || {});
        } catch {
          setBranding({});
        }
      } else {
        setBranding({});
      }

      if (invoiceSettingsResult.status === "fulfilled") {
        try {
          const invoiceSettingsData = await invoiceSettingsResult.value.json();
          setInvoiceSettings(invoiceSettingsData.data || {});
        } catch {
          setInvoiceSettings({});
        }
      } else {
        setInvoiceSettings({});
      }

      if (usersResult.status === "fulfilled") {
        try {
          const usersData = await usersResult.value.json();
          setDispatchUsers(usersData.data || []);
        } catch {
          setDispatchUsers([]);
        }
      } else {
        setDispatchUsers([]);
      }
    } catch (loadError: any) {
      setInvoices([]);
      window.alert(loadError?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const promptStampSelection = async (): Promise<{
    stampId: string;
    date: string;
  } | null> => {
    const addStamp = window.confirm("Add a stamp to this PDF?");
    if (!addStamp) return null;

    const defaultDate = new Date().toLocaleDateString("en-GB");
    const selectedDate = window.prompt(
      "Enter stamp date (DD/MM/YYYY)",
      defaultDate,
    );
    if (selectedDate === null) return null;

    const stampsRes = await fetch(`${API_URL}/api/stamps`, { headers });
    const stampsJson = await stampsRes.json();
    const stamps: StampOption[] = stampsJson.data || stampsJson || [];

    if (!stamps.length) {
      window.alert("No stamps found. Create one first in System > Stamps.");
      return null;
    }

    const stampList = stamps
      .map((stamp, index) => `${index + 1}. ${stamp.name}`)
      .join("\n");
    const selected = window.prompt(`Select stamp number:\n${stampList}`, "1");
    if (!selected) return null;

    const index = Number(selected) - 1;
    if (Number.isNaN(index) || index < 0 || index >= stamps.length) {
      window.alert("Invalid stamp selection");
      return null;
    }

    return { stampId: stamps[index]._id, date: selectedDate || defaultDate };
  };

  const getUserDisplayName = (user?: DispatchUser | null) => {
    if (!user) return "System User";
    return (
      [user.firstName || user.first_name, user.lastName || user.last_name]
        .filter(Boolean)
        .join(" ") ||
      user.email ||
      "System User"
    );
  };

  const toDataUrl = async (url?: string): Promise<string | undefined> => {
    if (!url) return undefined;
    try {
      const response = await fetch(url);
      if (!response.ok) return undefined;
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ""));
        reader.onerror = () =>
          reject(new Error("Failed to read signature image"));
        reader.readAsDataURL(blob);
      });
      return dataUrl || undefined;
    } catch {
      return undefined;
    }
  };

  const resolvePreparedBy = async () => {
    try {
      const currentUser = getUser();
      if (!currentUser)
        return {
          preparedBy: "System User",
          preparedBySignature: undefined,
          stampPref: false,
        };
      const userId = currentUser.userId || currentUser._id;
      const res = await fetch(`${API_URL}/api/users/${userId}`, { headers });
      if (!res.ok)
        return {
          preparedBy: "System User",
          preparedBySignature: undefined,
          stampPref: false,
        };
      const json = await res.json();
      const user = json.data || json;
      const preparedBy = getUserDisplayName(user);
      const preparedBySignature = await toDataUrl(user?.signatureUrl);
      const stampPref =
        typeof user?.promptStampOnPdf === "boolean"
          ? user.promptStampOnPdf
          : false;
      return { preparedBy, preparedBySignature, stampPref };
    } catch {
      return {
        preparedBy: "System User",
        preparedBySignature: undefined,
        stampPref: false,
      };
    }
  };

  const handleDownloadInvoicePdf = async (invoice: Invoice) => {
    const { preparedBy, preparedBySignature, stampPref } =
      await resolvePreparedBy();
    const stampSelection = stampPref ? await promptStampSelection() : null;

    const doc = generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      deliveryNoteNumber: invoice.deliveryNoteNumber,
      quotationNumber: invoice.quotationNumber,
      createdAt: invoice.createdAt,
      client: invoice.client,
      items: invoice.items,
      subTotal: invoice.subTotal,
      branding,
      invoiceSettings,
      preparedBy,
      preparedBySignature,
      watermarkText:
        invoice.status === "paid"
          ? "PAID"
          : invoice.status === "cancelled"
            ? "CANCELLED"
            : undefined,
      autoSave: false,
    });

    if (stampSelection) {
      try {
        const query = new URLSearchParams({
          date: stampSelection.date,
          user: preparedBy,
          email: branding?.email || "",
          poBox: "",
        }).toString();
        const stampRes = await fetch(
          `${API_URL}/api/stamps/${stampSelection.stampId}/svg?${query}`,
          { headers },
        );
        if (stampRes.ok) {
          const stampSvg = await stampRes.text();
          await applyStampToPdf(doc, stampSvg, 140, 255, 55, 33);
        } else {
          const errorText = await stampRes.text();
          window.alert(
            errorText ||
              "Failed to load selected stamp. PDF will be downloaded without stamp.",
          );
        }
      } catch {
        window.alert(
          "Failed to apply stamp. PDF will be downloaded without stamp.",
        );
      }
    }

    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  };

  const handleDownloadDeliveryNotePdf = async (invoice: Invoice) => {
    const { preparedBy, preparedBySignature, stampPref } =
      await resolvePreparedBy();
    const stampSelection = stampPref ? await promptStampSelection() : null;

    const doc = generateDeliveryNotePdf({
      invoiceNumber: invoice.invoiceNumber,
      deliveryNoteNumber: invoice.deliveryNoteNumber,
      createdAt: invoice.createdAt,
      client: invoice.client,
      items: invoice.items,
      branding,
      invoiceSettings,
      preparedBy,
      preparedBySignature,
      watermarkText:
        invoice.status === "paid"
          ? "PAID"
          : invoice.status === "cancelled"
            ? "CANCELLED"
            : undefined,
      autoSave: false,
    });

    if (stampSelection) {
      try {
        const query = new URLSearchParams({
          date: stampSelection.date,
          user: preparedBy,
          email: branding?.email || "",
          poBox: "",
        }).toString();
        const stampRes = await fetch(
          `${API_URL}/api/stamps/${stampSelection.stampId}/svg?${query}`,
          { headers },
        );
        if (stampRes.ok) {
          const stampSvg = await stampRes.text();
          await applyStampToPdf(doc, stampSvg, 140, 255, 55, 33);
        } else {
          const errorText = await stampRes.text();
          window.alert(
            errorText ||
              "Failed to load selected stamp. PDF will be downloaded without stamp.",
          );
        }
      } catch {
        window.alert(
          "Failed to apply stamp. PDF will be downloaded without stamp.",
        );
      }
    }

    doc.save(`delivery-note-${invoice.deliveryNoteNumber}.pdf`);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const userNameById = useMemo(() => {
    return new Map(
      dispatchUsers.map((user) => {
        const fullName = [
          user.firstName || user.first_name,
          user.lastName || user.last_name,
        ]
          .filter(Boolean)
          .join(" ");
        return [user._id, fullName || user.email || user._id];
      }),
    );
  }, [dispatchUsers]);

  const filteredInvoices = invoices.filter((invoice) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.deliveryNoteNumber.toLowerCase().includes(query) ||
      (invoice.quotationNumber || "").toLowerCase().includes(query) ||
      invoice.client.name.toLowerCase().includes(query) ||
      invoice.client.number.toLowerCase().includes(query) ||
      invoice.client.location.toLowerCase().includes(query)
    );
  });

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      const aClient = a.client.name.toLowerCase();
      const bClient = b.client.name.toLowerCase();
      const aAmount = Number(a.subTotal || 0);
      const bAmount = Number(b.subTotal || 0);
      const aInvoice = a.invoiceNumber.toLowerCase();
      const bInvoice = b.invoiceNumber.toLowerCase();

      switch (sortBy) {
        case "date-asc":
          return aDate - bDate;
        case "client-asc":
          return aClient.localeCompare(bClient);
        case "client-desc":
          return bClient.localeCompare(aClient);
        case "amount-desc":
          return bAmount - aAmount;
        case "amount-asc":
          return aAmount - bAmount;
        case "invoice-asc":
          return aInvoice.localeCompare(bInvoice);
        case "invoice-desc":
          return bInvoice.localeCompare(aInvoice);
        case "date-desc":
        default:
          return bDate - aDate;
      }
    });
  }, [filteredInvoices, sortBy]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.total += 1;
        acc.amount += Number(invoice.subTotal || 0);
        if (invoice.status === "paid") acc.paid += 1;
        if (invoice.status === "issued") acc.issued += 1;
        if (invoice.status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      { total: 0, amount: 0, paid: 0, issued: 0, cancelled: 0 },
    );
  }, [invoices]);

  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [page, pageSize, sortedInvoices]);

  const visiblePages = useMemo(() => {
    const count = Math.min(8, totalPages);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [totalPages]);

  if (loading) return <div className="p-6">Loading invoices...</div>;

  const sellerNameFor = (invoice: Invoice) =>
    userNameById.get(invoice.createdBy) || "System User";

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
              Invoices
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Employee invoice workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              View, search, sort, and download invoices and delivery notes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadInvoices}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total invoices
              </div>
              <div className="mt-1 text-xl font-semibold">{totals.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Paid
              </div>
              <div
                className="mt-1 text-xl font-semibold"
                style={{ color: secondaryColor }}
              >
                {totals.paid}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Issued
              </div>
              <div className="mt-1 text-xl font-semibold">{totals.issued}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total Value
              </div>
              <div className="mt-1 text-xl font-semibold">
                KES{" "}
                {totals.amount.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_200px] lg:items-end">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Invoice, delivery note, quotation, client..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setSearch(searchInput);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort invoices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date: newest first</SelectItem>
                  <SelectItem value="date-asc">Date: oldest first</SelectItem>
                  <SelectItem value="client-asc">
                    Client name: A to Z
                  </SelectItem>
                  <SelectItem value="client-desc">
                    Client name: Z to A
                  </SelectItem>
                  <SelectItem value="amount-desc">
                    Amount: highest first
                  </SelectItem>
                  <SelectItem value="amount-asc">
                    Amount: lowest first
                  </SelectItem>
                  <SelectItem value="invoice-asc">
                    Invoice number: A to Z
                  </SelectItem>
                  <SelectItem value="invoice-desc">
                    Invoice number: Z to A
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button className="w-full" onClick={() => setSearch(searchInput)}>
                Apply search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Invoice list</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {sortedInvoices.length} of {invoices.length} invoices
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              View and download invoices and delivery notes.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedInvoices.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
              <div>
                <p className="text-sm font-medium text-foreground">
                  No invoices found
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or sorting options.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full table-fixed text-[13px]">
                <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-medium w-[14%]">Invoice #</th>
                    <th className="px-3 py-3 font-medium w-[22%]">Client</th>
                    <th className="px-3 py-3 font-medium w-[14%]">Seller</th>
                    <th className="px-3 py-3 font-medium w-[8%]">Items</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Amount</th>
                    <th className="px-3 py-3 font-medium w-[10%]">Status</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Date</th>
                    <th className="px-3 py-3 font-medium w-[8%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedInvoices.map((invoice, index) => {
                    const sellerName = sellerNameFor(invoice);
                    const dispatchState =
                      invoice.dispatch?.status || "not_assigned";

                    return (
                      <tr
                        key={invoice._id}
                        className={`border-b align-top transition-colors hover:bg-muted/40 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="min-w-0">
                            <div
                              className="truncate font-medium text-foreground"
                              title={invoice.invoiceNumber}
                            >
                              {invoice.invoiceNumber}
                            </div>
                            <div
                              className="truncate text-[11px] text-muted-foreground"
                              title={invoice.deliveryNoteNumber}
                            >
                              DN {invoice.deliveryNoteNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="min-w-0">
                            <div
                              className="truncate font-medium text-foreground"
                              title={invoice.client.name}
                            >
                              {invoice.client.name}
                            </div>
                            <div
                              className="truncate text-[11px] text-muted-foreground"
                              title={`${invoice.client.number} ${invoice.client.location}`.trim()}
                            >
                              {[invoice.client.number, invoice.client.location]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div
                            className="truncate text-foreground"
                            title={sellerName}
                          >
                            {sellerName}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {invoice.items.length}
                        </td>
                        <td className="px-3 py-2 align-top font-medium text-foreground">
                          KES{" "}
                          {invoice.subTotal.toLocaleString("en-KE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                              invoice.status === "paid"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : invoice.status === "cancelled"
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-sky-200 bg-sky-50 text-sky-700"
                            }`}
                          >
                            {invoice.status}
                          </Badge>
                          {dispatchState !== "not_assigned" &&
                            dispatchState !== "delivered" && (
                              <div className="mt-1 text-[10px] text-muted-foreground capitalize">
                                {dispatchState.replaceAll("_", " ")}
                              </div>
                            )}
                          {dispatchState === "delivered" && (
                            <div className="mt-1 text-[10px] text-emerald-600">
                              Delivered
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString(
                            "en-KE",
                            {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            },
                          )}
                          <div className="mt-0.5 text-[10px]">
                            {new Date(invoice.createdAt).toLocaleTimeString(
                              "en-KE",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-full whitespace-nowrap"
                                >
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadInvoicePdf(invoice)
                                  }
                                >
                                  Download invoice PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadDeliveryNotePdf(invoice)
                                  }
                                >
                                  Download delivery note
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/employee/stock/dispatch/${invoice._id}`}
                                  >
                                    View dispatch status
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {sortedInvoices.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, sortedInvoices.length)} of{" "}
                {sortedInvoices.length}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Prev
                </Button>
                {visiblePages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                    className="min-w-9"
                  >
                    {pageNumber}
                  </Button>
                ))}
                {totalPages > 8 && (
                  <span className="px-1 text-sm text-muted-foreground">…</span>
                )}
                {totalPages > 8 && (
                  <Button
                    variant={page === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    className="min-w-9"
                  >
                    {totalPages}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
