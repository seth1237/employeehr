"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import API_URL from "@/lib/apiBase";
import { getToken, getUser } from "@/lib/auth";
import { stockApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  applyStampToPdf,
  generateQuotationPdf,
  type InvoiceDocumentSettings,
  type TenantBranding,
} from "@/lib/stock-document-pdf";

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  currentQuantity: number;
  isOutsourced?: boolean;
  category?: string;
  productType?: string;
  categoryDetails?: { _id: string; name: string };
}

interface Client {
  key?: string;
  name: string;
  number: string;
  location: string;
  contactPerson?: string;
}

interface QuotationItem {
  productId: string;
  productName: string;
  quantity: number;
  productUnitPrice?: number;
  soldUnitPrice?: number;
  unitPrice: number;
  lineTotal: number;
  taxRate?: number;
  totalAfterTax?: number;
  isOutsourced?: boolean;
  description?: string;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  status: "draft" | "pending_approval" | "converted" | "cancelled";
  client: Client;
  items: QuotationItem[];
  subTotal: number;
  createdBy: string;
  createdByName?: string;
  ownerUserId?: string;
  ownerUserName?: string;
  branchId?: string;
  branchName?: string;
  convertedInvoiceId?: string;
  approvedAt?: string;
  createdAt: string;
}

interface DraftItem {
  productId?: string;
  productName?: string;
  quantity: number;
  productUnitPrice?: number;
  soldUnitPrice?: number;
  unitPrice: number;
  taxRate?: number;
  isOutsourced?: boolean;
  description?: string;
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
  | "status-asc"
  | "status-desc";

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

export default function EmployeeQuotationsPage() {
  const { toast } = useToast();
  const createFormRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceDocumentSettings>({});

  const [showCreate, setShowCreate] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(
    null,
  );
  const [savingQuotation, setSavingQuotation] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [clientContactPerson, setClientContactPerson] = useState("");
  const [selectedClientPhone, setSelectedClientPhone] = useState("");
  const [selectedExistingClient, setSelectedExistingClient] = useState("");
  const [existingClientSearch, setExistingClientSearch] = useState("");
  const [showClientList, setShowClientList] = useState(true);

  const [productSearch, setProductSearch] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const [quotationSearchInput, setQuotationSearchInput] = useState("");
  const [quotationSearch, setQuotationSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Quotation["status"]>(
    "all",
  );
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Use shared stockApi client for consistency with admin page (adds auth headers, consistent error handling)
      const [
        productsRes,
        servicesRes,
        quotationsRes,
        activityClientsRes,
        savedClientsRes,
        brandingRes,
        invoiceSettingsRes,
      ] = await Promise.all([
        stockApi.getProducts(),
        // services endpoint is not wrapped in stockApi currently, fall back to fetch
        fetch(`${API_URL}/api/stock/services`, { headers: getAuthHeaders() })
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
        stockApi.getQuotations(),
        stockApi.getClients(),
        stockApi.getSavedClients(),
        fetch(`${API_URL}/api/company/branding`, { headers: getAuthHeaders() })
          .then((r) => r.json())
          .catch(() => ({ data: {} })),
        fetch(`${API_URL}/api/company/invoice-settings`, {
          headers: getAuthHeaders(),
        })
          .then((r) => r.json())
          .catch(() => ({ data: {} })),
      ]);

      // stockApi returns ApiResponse objects; normalize them
      const productsJson =
        productsRes && (productsRes as any).data ? productsRes : { data: [] };
      const servicesJson = servicesRes || { data: [] };
      const quotationsJson =
        quotationsRes && (quotationsRes as any).data
          ? quotationsRes
          : { data: [] };
      const activityClientsResp = activityClientsRes || { data: [] };
      const savedClientsResp = savedClientsRes || { data: [] };
      const brandingJson = brandingRes || { data: {} };
      const invoiceSettingsJson = invoiceSettingsRes || { data: {} };

      setProducts((productsJson.data as any[]) || []);
      setServices((servicesJson.data as any[]) || []);
      setQuotations((quotationsJson.data as any[]) || []);

      const activityClients = (activityClientsResp.data || []) as Client[];
      const savedClients = (savedClientsResp.data || []) as Client[];
      const mergedClientsMap = new Map<string, Client>();

      for (const client of activityClients) {
        const key = `${String(client.name || "")
          .trim()
          .toLowerCase()}|${String(client.number || "")
          .trim()
          .toLowerCase()}|${String(client.location || "")
          .trim()
          .toLowerCase()}`;
        if (!key) continue;
        mergedClientsMap.set(key, { ...client, key });
      }

      for (const client of savedClients) {
        const key = `${String(client.name || "")
          .trim()
          .toLowerCase()}|${String(client.number || "")
          .trim()
          .toLowerCase()}|${String(client.location || "")
          .trim()
          .toLowerCase()}`;
        if (!key || mergedClientsMap.has(key)) continue;
        mergedClientsMap.set(key, { ...client, key });
      }

      setClients(Array.from(mergedClientsMap.values()));
      setBranding((brandingJson.data as any) || {});
      setInvoiceSettings((invoiceSettingsJson.data as any) || {});
    } catch (error) {
      console.error("Load quotations failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load quotations";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserDetails = async () => {
    try {
      const currentUser = getUser();
      if (!currentUser) return null;
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/users/${currentUser.userId || currentUser._id}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json;
    } catch {
      return null;
    }
  };

  const toDataUrl = async (url?: string): Promise<string | undefined> => {
    if (!url) return undefined;
    try {
      const response = await fetch(url);
      if (!response.ok) return undefined;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ""));
        reader.onerror = () =>
          reject(new Error("Failed to read signature image"));
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [quotationSearch, sortBy, statusFilter]);

  const primaryColor = branding.primaryColor || "#0f766e";
  const secondaryColor = branding.secondaryColor || "#0ea5e9";
  const primarySoftColor = hexToRgba(primaryColor, 0.08);
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08);
  const primaryBorderColor = hexToRgba(primaryColor, 0.18);

  const getSellerName = (quotation: Quotation) =>
    quotation.ownerUserName ||
    quotation.createdByName ||
    quotation.createdBy ||
    "System User";

  const filteredQuotations = quotations.filter((quotation) => {
    const query = quotationSearch.trim().toLowerCase();
    if (statusFilter !== "all" && quotation.status !== statusFilter)
      return false;
    if (!query) return true;
    return (
      quotation.quotationNumber.toLowerCase().includes(query) ||
      quotation.client.name.toLowerCase().includes(query) ||
      quotation.client.number.toLowerCase().includes(query) ||
      quotation.client.location.toLowerCase().includes(query) ||
      getSellerName(quotation).toLowerCase().includes(query)
    );
  });

  const canDownloadQuotation = (quotation: Quotation) => {
    return Boolean(quotation.approvedAt || quotation.status === "converted");
  };

  const canEditQuotation = (quotation: Quotation) => {
    return !quotation.approvedAt && quotation.status === "pending_approval";
  };

  const sortedQuotations = useMemo(() => {
    return [...filteredQuotations].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      const aClient = a.client.name.toLowerCase();
      const bClient = b.client.name.toLowerCase();
      const aAmount = Number(a.subTotal || 0);
      const bAmount = Number(b.subTotal || 0);
      const aStatus = a.status.toLowerCase();
      const bStatus = b.status.toLowerCase();

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
        case "status-asc":
          return aStatus.localeCompare(bStatus);
        case "status-desc":
          return bStatus.localeCompare(aStatus);
        case "date-desc":
        default:
          return bDate - aDate;
      }
    });
  }, [filteredQuotations, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedQuotations.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedQuotations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedQuotations.slice(start, start + pageSize);
  }, [page, sortedQuotations]);

  const visiblePages = useMemo(() => {
    const count = Math.min(8, totalPages);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [totalPages]);

  const summary = useMemo(() => {
    return quotations.reduce(
      (acc, quotation) => {
        acc.total += 1;
        acc.amount += Number(quotation.subTotal || 0);
        if (quotation.status === "pending_approval") acc.pending += 1;
        if (quotation.status === "draft") acc.draft += 1;
        if (quotation.status === "converted") acc.converted += 1;
        return acc;
      },
      { total: 0, amount: 0, pending: 0, draft: 0, converted: 0 },
    );
  }, [quotations]);

  const pendingApprovalQuotations = filteredQuotations.filter(
    (quotation) => quotation.status === "pending_approval",
  );

  const filteredClients = clients.filter((client) => {
    const query = existingClientSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      client.name.toLowerCase().includes(query) ||
      client.location.toLowerCase().includes(query) ||
      client.number.toLowerCase().includes(query) ||
      (client.contactPerson || "").toLowerCase().includes(query)
    );
  });

  const inventoryItems = useMemo(
    () => [...products, ...services],
    [products, services],
  );

  const matchingProducts = inventoryItems.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return false;
    return (
      product.name.toLowerCase().includes(query) ||
      (product.categoryDetails?.name || product.category || "")
        .toLowerCase()
        .includes(query)
    );
  });

  const outOfStockHiddenCount = matchingProducts.filter(
    (product) => Number(product.currentQuantity || 0) <= 0,
  ).length;

  const productSuggestions = matchingProducts
    .filter(
      (product) =>
        product.productType === "service" ||
        Number(product.currentQuantity || 0) > 0,
    )
    .slice(0, 8);

  const resetForm = () => {
    setClientName("");
    setClientNumber("");
    setClientLocation("");
    setClientContactPerson("");
    setSelectedClientPhone("");
    setSelectedExistingClient("");
    setExistingClientSearch("");
    setProductSearch("");
    setItemQuantity("1");
    setItemUnitPrice("");
    setItemDescription("");
    setItems([]);
    setShowCreate(false);
    setEditingQuotationId(null);
  };

  const selectExistingClient = (value: string) => {
    setSelectedExistingClient(value);
    if (!value) return;
    try {
      const client = JSON.parse(value) as Client;
      setClientName(client.name || "");
      setSelectedClientPhone(client.number || "");
      // Don't auto-fill phone for privacy in employee UI
      setClientNumber("");
      setClientLocation(client.location || "");
      setClientContactPerson(client.contactPerson || "");
      setShowClientList(false);
    } catch {
      setClientName("");
      setSelectedClientPhone("");
      setClientNumber("");
      setClientLocation("");
      setClientContactPerson("");
    }
  };

  const startEditQuotation = (quotation: Quotation) => {
    // Allow edit only when quotation is not approved and not converted
    if (
      quotation.approvedAt ||
      quotation.status === "converted" ||
      quotation.status === "cancelled"
    ) {
      toast({
        title: "Not editable",
        description: "This quotation can no longer be edited.",
        variant: "destructive",
      });
      return;
    }

    setShowCreate(true);
    setEditingQuotationId(quotation._id);
    setClientName(quotation.client.name || "");
    setSelectedClientPhone(quotation.client.number || "");
    // Do not expose client phone for edit UI by default
    setClientNumber("");
    setClientLocation(quotation.client.location || "");
    setClientContactPerson(quotation.client.contactPerson || "");
    setSelectedExistingClient("");
    setItems(
      quotation.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        productUnitPrice: item.productUnitPrice ?? item.unitPrice,
        soldUnitPrice: item.soldUnitPrice ?? item.unitPrice,
        unitPrice: item.unitPrice,
        isOutsourced: Boolean(item.isOutsourced),
        description: item.description,
      })),
    );

    // Scroll into view the create form area
    setTimeout(() => {
      createFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const addItemFromSuggestion = (product: Product) => {
    if (Number(itemQuantity) <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const unitPrice = itemUnitPrice
      ? Number(itemUnitPrice)
      : Number(product.sellingPrice || 0);
    if (unitPrice < 0) {
      toast({
        title: "Invalid price",
        description: "Price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    const minimumPrice = Number(product.sellingPrice || 0);
    if (unitPrice < minimumPrice) {
      toast({
        title: "Invalid sold price",
        description: `Sold price cannot be below minimum selling price (${minimumPrice})`,
        variant: "destructive",
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        quantity: Number(itemQuantity),
        productName: product.name,
        productUnitPrice: Number(product.sellingPrice || 0),
        soldUnitPrice: unitPrice,
        unitPrice,
        description: itemDescription,
      },
    ]);

    setProductSearch("");
    setItemQuantity("1");
    setItemUnitPrice("");
    setItemDescription("");
  };

  const removeDraftItem = (index: number) => {
    setItems((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const updateDraftItemSoldPrice = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return item;

        const minimumPrice = Number(
          item.productUnitPrice ?? item.unitPrice ?? 0,
        );
        const nextSoldPrice = parsed < minimumPrice ? minimumPrice : parsed;

        return {
          ...item,
          soldUnitPrice: nextSoldPrice,
          unitPrice: nextSoldPrice,
        };
      }),
    );
  };

  const updateDraftItemDescription = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        return {
          ...item,
          description: value,
        };
      }),
    );
  };

  const createQuotation = async () => {
    if (!clientName || items.length === 0) {
      toast({
        title: "Missing data",
        description: "Add client name and at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingQuotation(true);

      const effectiveClientNumber =
        clientNumber.trim() || selectedClientPhone.trim();
      if (!clientName.trim() || !effectiveClientNumber || items.length === 0) {
        toast({
          title: "Missing data",
          description:
            "Client name, phone number, and at least one item are required",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        clientName,
        clientNumber: effectiveClientNumber,
        clientLocation: clientLocation || "N/A",
        clientContactPerson: clientContactPerson || "",
        items,
      };

      let response: Response;
      if (editingQuotationId) {
        response = await fetch(
          `${API_URL}/api/stock/quotations/${editingQuotationId}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          },
        );
      } else {
        response = await fetch(`${API_URL}/api/stock/quotations`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Error",
          description: result.message || "Failed to save quotation",
          variant: "destructive",
        });
        return;
      }

      if (editingQuotationId) {
        toast({
          title: "Updated",
          description: `Quotation ${result.data.quotationNumber} updated`,
        });
      } else {
        toast({
          title: "Success",
          description: `Quotation ${result.data.quotationNumber} submitted for approval`,
        });
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error("Failed to save quotation:", error);
      toast({
        title: "Error",
        description: "Failed to save quotation",
        variant: "destructive",
      });
    } finally {
      setSavingQuotation(false);
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

    const stampsRes = await fetch(`${API_URL}/api/stamps`, {
      headers: getAuthHeaders(),
    });
    const stampsJson = await stampsRes.json();
    const stamps: StampOption[] = stampsJson.data || stampsJson || [];

    if (!stamps.length) {
      toast({
        title: "No stamps",
        description: "Create a stamp first in System > Stamps",
        variant: "destructive",
      });
      return null;
    }

    const stampList = stamps
      .map((stamp, index) => `${index + 1}. ${stamp.name}`)
      .join("\n");
    const selected = window.prompt(`Select stamp number:\n${stampList}`, "1");
    if (!selected) return null;

    const index = Number(selected) - 1;
    if (Number.isNaN(index) || index < 0 || index >= stamps.length) {
      toast({
        title: "Invalid stamp",
        description: "Please choose a valid stamp number",
        variant: "destructive",
      });
      return null;
    }

    return { stampId: stamps[index]._id, date: selectedDate || defaultDate };
  };

  const downloadQuotationPdf = async (quotation: Quotation) => {
    if (!canDownloadQuotation(quotation)) {
      toast({
        title: "Download unavailable",
        description:
          "This quotation can only be downloaded after admin approval.",
        variant: "destructive",
      });
      return;
    }

    const currentDetails = await fetchCurrentUserDetails();
    const preparedBy =
      [
        currentDetails?.firstName || currentDetails?.first_name,
        currentDetails?.lastName || currentDetails?.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      currentDetails?.email ||
      "System User";
    const preparedBySignature = currentDetails?.signatureUrl
      ? await toDataUrl(currentDetails.signatureUrl)
      : undefined;

    const stampPref =
      typeof currentDetails?.promptStampOnPdf === "boolean"
        ? currentDetails.promptStampOnPdf
        : false;
    const stampSelection = stampPref ? await promptStampSelection() : null;

    const doc = generateQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      createdAt: quotation.createdAt,
      client: quotation.client,
      items: quotation.items,
      subTotal: quotation.subTotal,
      branding,
      invoiceSettings,
      preparedBy,
      preparedBySignature,
      watermarkText: quotation.status === "cancelled" ? "CANCELLED" : undefined,
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
          { headers: getAuthHeaders() },
        );
        if (stampRes.ok) {
          const stampSvg = await stampRes.text();
          await applyStampToPdf(doc, stampSvg, 140, 255, 55, 33);
        } else {
          const errorText = await stampRes.text();
          toast({
            title: "Stamp skipped",
            description: errorText || "Failed to load selected stamp",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Stamp skipped",
          description: "Failed to apply stamp, downloading PDF without stamp",
          variant: "destructive",
        });
      }
    }

    doc.save(`quotation-${quotation.quotationNumber}.pdf`);
  };

  if (loading) return <div className="p-6">Loading quotations...</div>;

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
              Quotations
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Employee quotation workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, search, and download quotations. All quotations require
              admin approval.
            </p>
            {pendingApprovalQuotations.length > 0 ? (
              <Badge
                variant="outline"
                className="mt-2 rounded-full border-amber-200 bg-amber-50 text-amber-800"
              >
                Pending approval: {pendingApprovalQuotations.length}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadData()}>
              Refresh
            </Button>
            <Button
              onClick={() => (showCreate ? resetForm() : setShowCreate(true))}
            >
              {showCreate ? "Close" : "Create Quotation"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total quotations
              </div>
              <div className="mt-1 text-xl font-semibold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Pending approval
              </div>
              <div
                className="mt-1 text-xl font-semibold"
                style={{ color: secondaryColor }}
              >
                {summary.pending}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Converted
              </div>
              <div className="mt-1 text-xl font-semibold">
                {summary.converted}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Value
              </div>
              <div className="mt-1 text-xl font-semibold">
                KES{" "}
                {summary.amount.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_180px] lg:items-end">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Quotation no, client, or location"
                value={quotationSearchInput}
                onChange={(event) =>
                  setQuotationSearchInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter")
                    setQuotationSearch(quotationSearchInput);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: typeof statusFilter) =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">
                    Pending approval
                  </SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort quotations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date: newest first</SelectItem>
                  <SelectItem value="date-asc">Date: oldest first</SelectItem>
                  <SelectItem value="client-asc">Client: A to Z</SelectItem>
                  <SelectItem value="client-desc">Client: Z to A</SelectItem>
                  <SelectItem value="amount-desc">
                    Amount: highest first
                  </SelectItem>
                  <SelectItem value="amount-asc">
                    Amount: lowest first
                  </SelectItem>
                  <SelectItem value="status-asc">Status: A to Z</SelectItem>
                  <SelectItem value="status-desc">Status: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                className="w-full"
                onClick={() => setQuotationSearch(quotationSearchInput)}
              >
                Apply search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <div
          ref={createFormRef}
          className="transition-all duration-300 ease-out"
        >
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-linear-to-r from-primary/5 to-primary/0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Create Quotation</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your quotation will be submitted for admin approval.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => resetForm()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Search Existing Clients</Label>
                  <Input
                    className="mb-2"
                    placeholder="Search client by name, location, number or contact person"
                    value={existingClientSearch}
                    onChange={(event) => {
                      setExistingClientSearch(event.target.value);
                      setShowClientList(true);
                    }}
                  />
                  <div className="rounded-md border bg-background shadow-sm">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <span>{filteredClients.length} client(s) found</span>
                      <div className="flex items-center gap-2">
                        {selectedExistingClient && (
                          <button
                            type="button"
                            className="underline"
                            onClick={() => setShowClientList((prev) => !prev)}
                          >
                            {showClientList ? "Collapse" : "Expand"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            setExistingClientSearch("");
                            setSelectedExistingClient("");
                            setClientName("");
                            setClientNumber("");
                            setClientLocation("");
                            setClientContactPerson("");
                            setShowClientList(true);
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {selectedExistingClient && !showClientList ? (
                      <div className="p-3">
                        <div className="flex items-start justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                          <div>
                            <div className="font-medium text-teal-900">
                              Client selected
                            </div>
                            <div className="text-sm text-teal-800">
                              {clientName}
                            </div>
                            <div className="text-xs text-teal-700">
                              {clientLocation}
                              {clientContactPerson
                                ? ` · ${clientContactPerson}`
                                : ""}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowClientList(true)}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No saved clients match your search.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-auto divide-y">
                        {filteredClients.map((client) => {
                          const value = JSON.stringify(client);
                          const isSelected = selectedExistingClient === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => selectExistingClient(value)}
                              className={`w-full px-3 py-3 text-left text-sm transition hover:bg-muted/60 ${isSelected ? "bg-teal-50" : "bg-background"}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium">
                                    {client.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.location}
                                    {client.contactPerson
                                      ? ` · ${client.contactPerson}`
                                      : ""}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Client Name</Label>
                  <Input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Client Number</Label>
                  <Input
                    value={clientNumber}
                    onChange={(event) => setClientNumber(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Client Location</Label>
                  <Input
                    value={clientLocation}
                    onChange={(event) => setClientLocation(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Contact Person (optional)</Label>
                  <Input
                    value={clientContactPerson}
                    onChange={(event) =>
                      setClientContactPerson(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="rounded-md border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <span>Add Products to Quotation</span>
                  {productSearch.trim() && productSuggestions.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-medium">
                      {productSuggestions.length} match
                      {productSuggestions.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label>Type Product Name</Label>
                    <Input
                      placeholder="Start typing product name..."
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(event) => setItemQuantity(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Sold Price (optional override)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={itemUnitPrice}
                      onChange={(event) => setItemUnitPrice(event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Label>
                      Product Description / Scope of Work (optional, supports
                      bullet points)
                    </Label>
                    <Textarea
                      placeholder="Enter additional details or bullet points here..."
                      value={itemDescription}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>,
                      ) => setItemDescription(event.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                {productSearch.trim() && (
                  <div className="border rounded-md divide-y bg-white shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    {productSuggestions.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground space-y-2">
                        <p className="font-medium">
                          No matching products found
                        </p>
                        <p className="text-xs">
                          Try searching with different keywords or check if the
                          product is in stock.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-medium">
                          Available Products ({productSuggestions.length})
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {productSuggestions.map((product) => (
                            <button
                              key={product._id}
                              type="button"
                              className="w-full text-left p-3 hover:bg-primary/5 transition-colors text-sm border-b last:border-b-0"
                              onClick={() => addItemFromSuggestion(product)}
                            >
                              <div className="font-medium flex items-center gap-2">
                                {product.name}
                                {product.isOutsourced ? (
                                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 font-medium">
                                    Outsourced
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 grid grid-cols-3 gap-2">
                                <span>
                                  Category:{" "}
                                  {product.categoryDetails?.name || "N/A"}
                                </span>
                                <span>Price: KES {product.sellingPrice}</span>
                                <span
                                  className={
                                    product.currentQuantity > 0
                                      ? "text-green-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  Stock: {product.currentQuantity}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {outOfStockHiddenCount > 0 ? (
                          <div className="p-3 text-xs text-muted-foreground bg-muted/20">
                            <span className="font-medium">
                              {outOfStockHiddenCount} out-of-stock product(s)
                            </span>{" "}
                            hidden from list
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="overflow-x-auto border rounded-md bg-muted/30 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="py-3 px-3">Product</th>
                        <th className="py-3 px-3 text-center">Qty</th>
                        <th className="py-3 px-3 text-right">Product Price</th>
                        <th className="py-3 px-3 text-right">Sold Price</th>
                        <th className="py-3 px-3 text-center">Outsourced</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const inventoryItem = inventoryItems.find(
                          (product) => product._id === item.productId,
                        );
                        const name =
                          item.productName ||
                          inventoryItem?.name ||
                          item.productId;
                        const referencePrice =
                          item.productUnitPrice ??
                          inventoryItem?.sellingPrice ??
                          item.unitPrice;
                        const soldPrice = item.soldUnitPrice ?? item.unitPrice;
                        return (
                          <tr
                            key={`${item.productId}-${index}`}
                            className="border-b hover:bg-muted/20 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <div className="font-medium">{name}</div>
                              <Textarea
                                value={item.description || ""}
                                onChange={(e) =>
                                  updateDraftItemDescription(
                                    index,
                                    e.target.value,
                                  )
                                }
                                placeholder="Add description/notes..."
                                className="mt-1 h-16 w-full text-xs"
                              />
                            </td>
                            <td className="py-3 px-3 text-center font-medium">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-medium">
                              KES {referencePrice}
                            </td>
                            <td className="py-3 px-3">
                              <Input
                                type="number"
                                min={Number(referencePrice || 0)}
                                value={soldPrice}
                                onChange={(event) =>
                                  updateDraftItemSoldPrice(
                                    index,
                                    event.target.value,
                                  )
                                }
                                className="h-8 text-right"
                              />
                              <div className="mt-1 text-[10px] text-muted-foreground text-right">
                                Min: KES {referencePrice}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-xs font-medium rounded px-2 py-1 bg-muted">
                                {item.isOutsourced ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold">
                              KES {(item.quantity * soldPrice).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Button
                                size="sm"
                                type="button"
                                variant="destructive"
                                onClick={() => removeDraftItem(index)}
                              >
                                Drop
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t pt-4">
                <div className="flex gap-2">
                  <Button
                    onClick={createQuotation}
                    disabled={savingQuotation}
                    className="flex-1"
                  >
                    {savingQuotation ? "Saving..." : "Submit for Approval"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Once submitted, your quotation will be reviewed by an admin
                  for approval.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Approval
            <span
              className="rounded-full px-2 py-0.5 text-xs text-primary-foreground"
              style={{ backgroundColor: primaryColor }}
            >
              {pendingApprovalQuotations.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingApprovalQuotations.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              No pending approvals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full table-fixed text-[13px]">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-medium w-[15%]">
                      Quotation No
                    </th>
                    <th className="px-3 py-3 font-medium w-[22%]">Client</th>
                    <th className="px-3 py-3 font-medium w-[18%]">Owner</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Branch</th>
                    <th className="px-3 py-3 font-medium w-[10%]">Amount</th>
                    <th className="px-3 py-3 font-medium w-[20%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovalQuotations.map((quotation, index) => (
                    <tr
                      key={quotation._id}
                      className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                    >
                      <td className="px-3 py-2 align-top">
                        <div
                          className="truncate font-medium"
                          title={quotation.quotationNumber}
                        >
                          {quotation.quotationNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Pending approval
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div
                          className="truncate font-medium"
                          title={quotation.client.name}
                        >
                          {quotation.client.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {quotation.client.location || "-"}
                        </div>
                      </td>
                      <td
                        className="px-3 py-2 align-top truncate"
                        title={getSellerName(quotation)}
                      >
                        {getSellerName(quotation)}
                      </td>
                      <td
                        className="px-3 py-2 align-top truncate"
                        title={quotation.branchName || "-"}
                      >
                        {quotation.branchName || "-"}
                      </td>
                      <td className="px-3 py-2 align-top font-medium">
                        KES{" "}
                        {quotation.subTotal.toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-2 items-center">
                            {canEditQuotation(quotation) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditQuotation(quotation)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                Edit
                              </Button>
                            ) : null}
                            {canDownloadQuotation(quotation) ? (
                              <Button
                                size="sm"
                                onClick={() => downloadQuotationPdf(quotation)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                PDF
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="opacity-50 cursor-not-allowed"
                              >
                                PDF
                              </Button>
                            )}
                          </div>
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: canDownloadQuotation(quotation)
                                ? "#16a34a"
                                : "#ea580c",
                            }}
                          >
                            {canDownloadQuotation(quotation)
                              ? "✓ Ready to download"
                              : "⏳ Awaiting admin approval"}
                          </span>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            By {getUser()?.first_name || "Employee"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Quotation List</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {sortedQuotations.length} of {filteredQuotations.length}{" "}
                quotations
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Compact view for faster scanning.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full table-fixed text-[13px]">
              <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr className="border-b">
                  <th className="px-3 py-3 font-medium w-[14%]">
                    Quotation No
                  </th>
                  <th className="px-3 py-3 font-medium w-[20%]">Client</th>
                  <th className="px-3 py-3 font-medium w-[14%]">Owner</th>
                  <th className="px-3 py-3 font-medium w-[12%]">Branch</th>
                  <th className="px-3 py-3 font-medium w-[8%]">Items</th>
                  <th className="px-3 py-3 font-medium w-[11%]">Amount</th>
                  <th className="px-3 py-3 font-medium w-[11%]">Status</th>
                  <th className="px-3 py-3 font-medium w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedQuotations.map((quotation, index) => (
                  <tr
                    key={quotation._id}
                    className={`border-b align-top transition-colors hover:bg-muted/40 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                  >
                    <td className="px-3 py-2 align-top">
                      <div
                        className="truncate font-medium"
                        title={quotation.quotationNumber}
                      >
                        {quotation.quotationNumber}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div
                        className="truncate font-medium"
                        title={quotation.client.name}
                      >
                        {quotation.client.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {[quotation.client.number, quotation.client.location]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </div>
                    </td>
                    <td
                      className="px-3 py-2 align-top truncate"
                      title={getSellerName(quotation)}
                    >
                      {getSellerName(quotation)}
                    </td>
                    <td
                      className="px-3 py-2 align-top truncate"
                      title={quotation.branchName || "-"}
                    >
                      {quotation.branchName || "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {quotation.items.length}
                    </td>
                    <td className="px-3 py-2 align-top font-medium">
                      KES{" "}
                      {quotation.subTotal.toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                          quotation.status === "converted"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : quotation.status === "pending_approval"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : quotation.status === "draft"
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {quotation.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          {canEditQuotation(quotation) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditQuotation(quotation)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                          ) : null}
                          {canDownloadQuotation(quotation) ? (
                            <Button
                              size="sm"
                              onClick={() => downloadQuotationPdf(quotation)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              PDF
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="opacity-50 cursor-not-allowed"
                            >
                              PDF
                            </Button>
                          )}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: canDownloadQuotation(quotation)
                              ? "#16a34a"
                              : "#ea580c",
                          }}
                        >
                          {canDownloadQuotation(quotation)
                            ? quotation.status === "converted"
                              ? "✓ Converted"
                              : "✓ Ready to download"
                            : "⏳ Awaiting approval"}
                        </span>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          By {getUser()?.first_name || "Employee"}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedQuotations.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, sortedQuotations.length)} of{" "}
                {sortedQuotations.length}
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
