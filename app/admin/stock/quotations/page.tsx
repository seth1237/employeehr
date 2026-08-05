"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import API_URL from "@/lib/apiBase";
import { getToken, getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { stockApi } from "@/lib/api";
import { finishDataLoad, startDataLoad } from "@/lib/silent-load";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  PageLoadingSkeleton,
} from "@/components/admin/ui/page-states";
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  StickyActionBar,
} from "@/components/admin/ui/mobile-list";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  type InvoiceDocumentSettings,
  type TenantBranding,
} from "@/lib/stock-document-pdf";

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  currentQuantity: number;
  isOutsourced?: boolean;
  categoryDetails?: { _id: string; name: string };
  imageUrl?: string;
  description?: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
  managerId?: string;
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
  imageUrl?: string;
  showImageOnQuote?: boolean;
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
  imageUrl?: string;
  showImageOnQuote?: boolean;
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
  | "owner-asc"
  | "owner-desc"
  | "pending-first"
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportQuotationsSummaryXlsx(quotations: Quotation[]) {
  const rows = quotations.map((quotation) => ({
    "Quotation #": quotation.quotationNumber,
    "Client name": quotation.client.name,
    "Client number": quotation.client.number,
    "Client location": quotation.client.location,
    Salesperson:
      quotation.ownerUserName ||
      quotation.createdByName ||
      quotation.createdBy ||
      "N/A",
    Products: quotation.items
      .map((i) => `${i.productName} (${i.quantity}x)`)
      .join(", "),
    "Quotation value": quotation.subTotal,
    Status: quotation.status,
    "Converted invoice id": quotation.convertedInvoiceId || "",
    "Created at": new Date(quotation.createdAt).toISOString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");
  const workbookOutput = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
  const blob = new Blob([workbookOutput], {
    type: "application/octet-stream",
  });
  downloadBlob(blob, "quotations-summary.xlsx");
}

export default function QuotationsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceDocumentSettings>({});
  const [searchInput, setQuotationSearchInput] = useState("");
  const [quotationSearch, setQuotationSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [statusFilter, setStatusFilter] = useState<"all" | Quotation["status"]>(
    "all",
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showCreate, setShowCreate] = useState(false);
  const appliedEditId = useRef<string | null>(null);

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "excel" | null>(null);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(
    null,
  );
  const [savingQuotation, setSavingQuotation] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [clientContactPerson, setClientContactPerson] = useState("");
  const [selectedExistingClient, setSelectedExistingClient] = useState("");
  const [existingClientSearch, setExistingClientSearch] = useState("");
  const [showClientList, setShowClientList] = useState(true);
  const [quotationOwnerId, setQuotationOwnerId] = useState("");
  const [quotationBranchId, setQuotationBranchId] = useState("");
  const [branchHint, setBranchHint] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemTaxRate, setItemTaxRate] = useState("0");
  const [itemDescription, setItemDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (!q) return;
    setQuotationSearchInput(q);
    setQuotationSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      setShowCreate(true);
      setEditingQuotationId(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || quotations.length === 0 || loading) return;
    if (appliedEditId.current === editId) return;
    const target = quotations.find((q) => q._id === editId);
    if (target && (target.status === "draft" || target.status === "pending_approval")) {
      appliedEditId.current = editId;
      startEditQuotation(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotations, loading, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [quotationSearch, sortBy, statusFilter]);

  useEffect(() => {
    // No local UI preferences on this page; stamp and signature are managed per-user in User Settings / Profile
  }, []);

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const loadData = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing);
    try {
      const [
        productsRes,
        quotationsRes,
        activityClientsRes,
        savedClientsRes,
        brandingRes,
        invoiceSettingsRes,
        usersRes,
        branchesRes,
      ] = await Promise.all([
        fetch(`${API_URL}/api/stock/products?lite=1`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/stock/quotations`, { headers: getAuthHeaders() }),
        stockApi.getClients(),
        stockApi.getSavedClients(),
        fetch(`${API_URL}/api/company/branding`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/company/invoice-settings`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/api/users`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/branches`, { headers: getAuthHeaders() }),
      ]);
      const [
        productsJson,
        quotationsJson,
        activityClientsResp,
        savedClientsResp,
        brandingJson,
        invoiceSettingsJson,
        usersJson,
        branchesJson,
      ] = await Promise.all([
        productsRes.json(),
        quotationsRes.json(),
        Promise.resolve(activityClientsRes),
        Promise.resolve(savedClientsRes),
        brandingRes.json(),
        invoiceSettingsRes.json(),
        usersRes.json(),
        branchesRes.json(),
      ]);

      setProducts(productsJson.data || []);
      setQuotations(quotationsJson.data || []);
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
      setUsers(usersJson.data || []);
      setBranches(branchesJson.data || []);
      setBranding(brandingJson.data || {});
      setInvoiceSettings(invoiceSettingsJson.data || {});
      // quotation page no longer manages prepared-by selection here; rely on user profile and admin user settings
    } catch {
      toast({
        title: "Error",
        description: "Failed to load quotations",
        variant: "destructive",
      });
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing);
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

  const exportQuotationsSummaryPdf = async (
    quotationsToExport: Quotation[],
    periodStr?: string,
  ) => {
    if (!quotationsToExport.length) {
      toast({
        title: "No quotations",
        description: "There are no quotations to export.",
        variant: "destructive",
      });
      return;
    }

    const resolvedQuotations = await Promise.all(
      quotationsToExport.map(async (quotation) => {
        let convertedInvoiceNumber = "";
        if (quotation.convertedInvoiceId) {
          try {
            const invoiceRes = await fetch(
              `${API_URL}/api/stock/invoices/${quotation.convertedInvoiceId}`,
              { headers: getAuthHeaders() },
            );
            if (invoiceRes.ok) {
              const invoiceJson = await invoiceRes.json();
              convertedInvoiceNumber =
                invoiceJson?.data?.invoiceNumber ||
                quotation.convertedInvoiceId;
            }
          } catch {}
        }

        return {
          quotationNumber: quotation.quotationNumber,
          createdAt: quotation.createdAt,
          client: quotation.client,
          salesperson:
            quotation.ownerUserName || quotation.createdByName || "N/A",
          items: quotation.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
          subTotal: quotation.subTotal,
          convertedInvoiceNumber,
          status: quotation.status,
        };
      }),
    );

    const { generateQuotationStyleSummaryPdf } = await import(
      "@/lib/stock-document-pdf"
    );

    generateQuotationStyleSummaryPdf({
      quotations: resolvedQuotations,
      branding,
      periodStr,
      autoSave: true,
    });
  };

  const handleExportRequest = (type: "pdf" | "excel") => {
    setExportType(type);
    setExportStartDate("");
    setExportEndDate("");
    setExportModalOpen(true);
  };

  const confirmExport = () => {
    let filtered = [...quotations]; // Note: Can also use sortedQuotations if you want to apply search filters, but usually exports use all data bounded by date.

    if (exportStartDate) {
      const start = new Date(exportStartDate).getTime();
      filtered = filtered.filter(
        (q) => new Date(q.createdAt).getTime() >= start,
      );
    }

    if (exportEndDate) {
      // Add 1 day to include the entire end date
      const end = new Date(exportEndDate).getTime() + 86400000;
      filtered = filtered.filter((q) => new Date(q.createdAt).getTime() < end);
    }

    if (filtered.length === 0) {
      toast({
        title: "No data",
        description: "No quotations found for this period.",
        variant: "destructive",
      });
      setExportModalOpen(false);
      return;
    }

    let periodStr = "All Time";
    if (exportStartDate && exportEndDate) {
      periodStr = `${exportStartDate} to ${exportEndDate}`;
    } else if (exportStartDate) {
      periodStr = `From ${exportStartDate}`;
    } else if (exportEndDate) {
      periodStr = `Until ${exportEndDate}`;
    }

    if (exportType === "pdf") {
      exportQuotationsSummaryPdf(filtered, periodStr);
    } else {
      exportQuotationsSummaryXlsx(filtered);
    }

    setExportModalOpen(false);
  };

  // Signature upload and user selection handled in Admin User Settings and Employee Profile

  useEffect(() => {
    loadData();
  }, []);

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

  const sortedQuotations = useMemo(() => {
    return [...filteredQuotations].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      const aClient = a.client.name.toLowerCase();
      const bClient = b.client.name.toLowerCase();
      const aOwner = getSellerName(a).toLowerCase();
      const bOwner = getSellerName(b).toLowerCase();
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
        case "owner-asc":
          return aOwner.localeCompare(bOwner);
        case "owner-desc":
          return bOwner.localeCompare(aOwner);
        case "pending-first": {
          const aPending = a.status === "pending_approval" ? 1 : 0;
          const bPending = b.status === "pending_approval" ? 1 : 0;
          if (aPending !== bPending) return bPending - aPending;
          return bDate - aDate;
        }
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
  const activeQuotations = filteredQuotations.filter(
    (quotation) => quotation.status !== "pending_approval",
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

  const matchingProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return false;
    return (
      product.name.toLowerCase().includes(query) ||
      (product.categoryDetails?.name || "").toLowerCase().includes(query)
    );
  });

  const outOfStockHiddenCount = matchingProducts.filter(
    (product) => Number(product.currentQuantity || 0) <= 0,
  ).length;

  const productSuggestions = matchingProducts
    .filter((product) => Number(product.currentQuantity || 0) > 0)
    .slice(0, 8);

  const resetForm = () => {
    setClientName("");
    setClientNumber("");
    setClientLocation("");
    setClientContactPerson("");
    setSelectedExistingClient("");
    setExistingClientSearch("");
    setQuotationOwnerId("");
    setQuotationBranchId("");
    setBranchHint("");
    setProductSearch("");
    setItemQuantity("1");
    setItemUnitPrice("");
    setItemTaxRate("0");
    setItemDescription("");
    setItems([]);
    setEditingQuotationId(null);
    setShowCreate(false);
  };

  const selectExistingClient = (value: string) => {
    setSelectedExistingClient(value);
    if (!value) return;
    try {
      const client = JSON.parse(value) as Client;
      setClientName(client.name || "");
      setClientNumber(client.number || "");
      setClientLocation(client.location || "");
      setClientContactPerson(client.contactPerson || "");
      setShowClientList(false);
    } catch {
      setClientName("");
      setClientNumber("");
      setClientLocation("");
      setClientContactPerson("");
    }
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
        description: itemDescription || product.description || "",
        imageUrl: product.imageUrl,
        showImageOnQuote: true,
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

  const createOrUpdateQuotation = async () => {
    if (!clientName || !clientNumber || items.length === 0) {
      toast({
        title: "Missing data",
        description: "Add client name, phone number and at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingQuotation(true);

      const endpoint = editingQuotationId
        ? `${API_URL}/api/stock/quotations/${editingQuotationId}`
        : `${API_URL}/api/stock/quotations`;

      const method = editingQuotationId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientName,
          clientNumber,
          clientLocation: clientLocation || "N/A",
          clientContactPerson: clientContactPerson || "",
          ownerUserId: quotationOwnerId || undefined,
          branchId: quotationBranchId || undefined,
          items,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Error",
          description: result.message || "Failed to save quotation",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: editingQuotationId
          ? `Quotation ${result.data.quotationNumber} updated`
          : `Quotation ${result.data.quotationNumber} created`,
      });

      resetForm();
      loadData({ silent: true });
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

  const startEditQuotation = (quotation: Quotation) => {
    if (
      quotation.status !== "draft" &&
      quotation.status !== "pending_approval"
    ) {
      toast({
        title: "Not editable",
        description: "Only draft or pending quotations can be edited",
        variant: "destructive",
      });
      return;
    }

    setShowCreate(true);
    setEditingQuotationId(quotation._id);
    setClientName(quotation.client.name);
    setClientNumber(quotation.client.number);
    setClientLocation(quotation.client.location);
    setClientContactPerson(quotation.client.contactPerson || "");
    setSelectedExistingClient("");
    setQuotationOwnerId(quotation.ownerUserId || "");
    setQuotationBranchId(quotation.branchId || "");
    setBranchHint(quotation.branchName || "");
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
        imageUrl: item.imageUrl,
        showImageOnQuote: item.showImageOnQuote ?? true,
      })),
    );
  };

  const approveQuotation = async (quotationId: string) => {
    const response = await fetch(
      `${API_URL}/api/stock/quotations/${quotationId}/approve`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      toast({
        title: "Error",
        description: result.message || "Failed to approve quotation",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Approved",
      description: "Quotation moved to active quotations",
    });
    loadData({ silent: true });
  };

  const rejectQuotation = async (quotationId: string) => {
    const response = await fetch(
      `${API_URL}/api/stock/quotations/${quotationId}/reject`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      toast({
        title: "Error",
        description: result.message || "Failed to reject quotation",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Rejected", description: "Quotation has been rejected" });
    loadData({ silent: true });
  };

  const convertToInvoice = async (quotationId: string) => {
    const response = await fetch(
      `${API_URL}/api/stock/quotations/${quotationId}/convert`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      toast({
        title: "Error",
        description: result.message || "Failed to convert quotation",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Invoice created",
      description: `Invoice ${result.data.invoiceNumber} created with delivery note ${result.data.deliveryNoteNumber}. Open it to preview, print, or email.`,
    });
    if (result.data?._id) {
      window.location.href = `/admin/stock/invoices/${result.data._id}`;
      return;
    }
    loadData({ silent: true });
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

  const knowBranch = () => {
    if (!quotationOwnerId) {
      toast({
        title: "Select owner first",
        description: "Choose whose quotation it is before finding the branch",
        variant: "destructive",
      });
      return;
    }

    const matchedBranch = branches.find(
      (branch) => branch.managerId === quotationOwnerId,
    );
    if (!matchedBranch) {
      setQuotationBranchId("");
      setBranchHint("No branch matched for the selected owner");
      toast({
        title: "Branch not found",
        description: "No branch is assigned to that user yet",
        variant: "destructive",
      });
      return;
    }

    setQuotationBranchId(matchedBranch._id);
    setBranchHint(`${matchedBranch.name} (${matchedBranch.code})`);
    toast({
      title: "Branch found",
      description: `Quotation branch: ${matchedBranch.name} (${matchedBranch.code})`,
    });
  };

  const downloadQuotationPdf = async (quotation: Quotation) => {
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

    const { generateQuotationPdf, applyStampToPdf } = await import(
      "@/lib/stock-document-pdf"
    );

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

  if (loading) return <PageLoadingSkeleton title="Loading quotations" rows={8} />;

  const currentUser = getUser();
  const canApprove = ["company_admin", "hr"].includes(
    String(currentUser?.role || ""),
  );

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
              Quotation dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              View, search, sort, and convert quotations from one place.
            </p>
            {pendingApprovalQuotations.length > 0 ? (
              <Badge
                variant="outline"
                className="mt-2 rounded-full border-amber-200 bg-amber-50 text-amber-800"
              >
                Pending requests {pendingApprovalQuotations.length}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportRequest("excel")}
            >
              Export summary (Excel)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportRequest("pdf")}
            >
              Export summary (PDF)
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
                placeholder="Quotation no, client, owner or location"
                value={searchInput}
                onChange={(event) =>
                  setQuotationSearchInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") setQuotationSearch(searchInput);
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
                  <SelectItem value="pending-first">Pending first</SelectItem>
                  <SelectItem value="client-asc">Client: A to Z</SelectItem>
                  <SelectItem value="client-desc">Client: Z to A</SelectItem>
                  <SelectItem value="owner-asc">Owner: A to Z</SelectItem>
                  <SelectItem value="owner-desc">Owner: Z to A</SelectItem>
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
                onClick={() => setQuotationSearch(searchInput)}
              >
                Apply search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stamp prompt and prepared-by signature management moved to Admin User Settings and Employee Profile */}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingQuotationId ? "Edit Quotation" : "Create Quotation"}
            </CardTitle>
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
                            {clientNumber} · {clientLocation}
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
                                <div className="font-medium">{client.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {client.number} · {client.location}
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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Quotation Owner</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={quotationOwnerId}
                  onChange={(event) => {
                    setQuotationOwnerId(event.target.value);
                    setBranchHint("");
                  }}
                >
                  <option value="">
                    -- Select who this quotation is for --
                  </option>
                  {users
                    .filter((user) =>
                      [
                        "employee",
                        "manager",
                        "admin",
                        "company_admin",
                        "hr",
                      ].includes(user.role),
                    )
                    .map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </option>
                    ))}
                </select>
              </div>
              {branches.length > 0 ? (
                <div>
                  <Label>Branch</Label>
                  <div className="flex gap-2">
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={quotationBranchId}
                      onChange={(event) =>
                        setQuotationBranchId(event.target.value)
                      }
                    >
                      <option value="">-- Select branch --</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={knowBranch}
                    >
                      Know Branch
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {branchHint ||
                      "Choose a user and click Know Branch to auto-fill their assigned branch."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  This company has no branches yet, so branch selection is
                  hidden.
                </div>
              )}
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Type Product Name</Label>
                  <Input
                    placeholder="Start typing product name"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
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
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setItemDescription(event.target.value)
                    }
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>

              {productSearch.trim() && (
                <div className="border rounded-md divide-y">
                  {productSuggestions.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground space-y-2">
                      <p>No matching products</p>
                      <p className="text-xs">
                        Choose a matching inventory item to continue.
                      </p>
                    </div>
                  ) : (
                    <>
                      {productSuggestions.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-secondary text-sm"
                          onClick={() => addItemFromSuggestion(product)}
                        >
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {product.isOutsourced ? (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                                Outsourced
                              </span>
                            ) : null}
                          </div>
                          <div className="text-muted-foreground">
                            Category: {product.categoryDetails?.name || "N/A"} |
                            Product Price: {product.sellingPrice} | In stock:{" "}
                            {product.currentQuantity}
                          </div>
                        </button>
                      ))}
                      {outOfStockHiddenCount > 0 ? (
                        <div className="p-3 text-xs text-muted-foreground">
                          {outOfStockHiddenCount} out-of-stock product(s) hidden
                          from selectable list.
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 px-2">Product</th>
                      <th className="py-2 px-2">Qty</th>
                      <th className="py-2 px-2">Product Price</th>
                      <th className="py-2 px-2">Sold Price (Editable)</th>
                      <th className="py-2 px-2">Outsourced</th>
                      <th className="py-2 px-2">Total</th>
                      <th className="py-2 px-2">Drop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const name =
                        item.productName ||
                        products.find(
                          (product) => product._id === item.productId,
                        )?.name ||
                        item.productId;
                      const referencePrice =
                        item.productUnitPrice ??
                        products.find(
                          (product) => product._id === item.productId,
                        )?.sellingPrice ??
                        item.unitPrice;
                      const soldPrice = item.soldUnitPrice ?? item.unitPrice;
                      return (
                        <tr
                          key={`${item.productId}-${index}`}
                          className="border-b"
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              {item.imageUrl && (
                                <img
                                  src={`${API_URL}${item.imageUrl}`}
                                  alt={name}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-10 w-10 rounded border object-cover"
                                />
                              )}
                              <div className="font-medium">{name}</div>
                            </div>
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
                            {item.imageUrl && (
                              <label className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
                                <Checkbox
                                  checked={item.showImageOnQuote}
                                  onCheckedChange={(val) => {
                                    setItems((prev) =>
                                      prev.map((it, idx) =>
                                        idx === index
                                          ? { ...it, showImageOnQuote: !!val }
                                          : it,
                                      ),
                                    );
                                  }}
                                />
                                <span>Show image on quotation PDF</span>
                              </label>
                            )}
                          </td>
                          <td className="py-2 px-2">{item.quantity}</td>
                          <td className="py-2 px-2">{referencePrice}</td>
                          <td className="py-2 px-2">
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
                              className="h-8"
                            />
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Min: {referencePrice}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            {item.isOutsourced ? "Yes" : "No"}
                          </td>
                          <td className="py-2 px-2">
                            {(item.quantity * soldPrice).toFixed(2)}
                          </td>
                          <td className="py-2 px-2">
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

            <div className="flex gap-2">
              <Button
                onClick={createOrUpdateQuotation}
                disabled={savingQuotation}
              >
                {savingQuotation
                  ? "Saving..."
                  : editingQuotationId
                    ? "Update Quotation"
                    : "Generate Quotation"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Requests
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
                      <td className="px-3 py-2 align-top font-medium">
                        KES{" "}
                        {quotation.subTotal.toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadQuotationPdf(quotation)}
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditQuotation(quotation)}
                          >
                            Edit
                          </Button>
                          {canApprove ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveQuotation(quotation._id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectQuotation(quotation._id)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground self-center">
                              Awaiting approval
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Prepared by {currentUser?.first_name || "Admin"}{" "}
                          {currentUser?.last_name || ""}
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
              <CardTitle className="text-base">Quotation list</CardTitle>
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
          {sortedQuotations.length === 0 ? (
            <EmptyState
              title={
                quotations.length === 0
                  ? "No quotations yet"
                  : "No quotations match your filters"
              }
              description={
                quotations.length === 0
                  ? "Create your first quotation, then convert it to an invoice when the customer approves."
                  : "Try adjusting your search or status filter."
              }
              actionLabel={
                quotations.length === 0 ? "Create quotation" : undefined
              }
              actionHref={
                quotations.length === 0
                  ? "/admin/stock/quotations?action=new"
                  : undefined
              }
            />
          ) : (
          <>
          <DesktopTableShell>
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
                      <Link
                        href={`/admin/stock/quotations/${quotation._id}`}
                        className="truncate font-medium hover:underline block"
                        title={quotation.quotationNumber}
                      >
                        {quotation.quotationNumber}
                      </Link>
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
                      <StatusBadge status={quotation.status} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/stock/quotations/${quotation._id}`}>
                            Open
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQuotationPdf(quotation)}
                          aria-label={`Download PDF for ${quotation.quotationNumber}`}
                        >
                          PDF
                        </Button>
                        {quotation.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditQuotation(quotation)}
                            aria-label={`Edit ${quotation.quotationNumber}`}
                          >
                            Edit
                          </Button>
                        )}
                        {quotation.status === "draft" ? (
                          <Button
                            size="sm"
                            onClick={() => convertToInvoice(quotation._id)}
                            aria-label={`Convert ${quotation.quotationNumber} to invoice`}
                          >
                            Convert
                          </Button>
                        ) : quotation.status === "converted" ? (
                          quotation.convertedInvoiceId ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/admin/stock/invoices/${quotation.convertedInvoiceId}`}>
                                View invoice
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground self-center">
                              Converted
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground self-center capitalize">
                            {quotation.status.replaceAll("_", " ")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Prepared by {currentUser?.first_name || "Admin"}{" "}
                        {currentUser?.last_name || ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableShell>

          <MobileCardList label="Quotations">
            {pagedQuotations.map((quotation) => (
              <MobileCard key={quotation._id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/stock/quotations/${quotation._id}`}
                      className="font-semibold hover:underline"
                    >
                      {quotation.quotationNumber}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {quotation.client.name}
                    </p>
                  </div>
                  <StatusBadge status={quotation.status} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    KES{" "}
                    {quotation.subTotal.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span>{quotation.items.length} items</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/admin/stock/quotations/${quotation._id}`}>
                      Open
                    </Link>
                  </Button>
                  {quotation.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => convertToInvoice(quotation._id)}
                      aria-label={`Convert ${quotation.quotationNumber} to invoice`}
                    >
                      Convert
                    </Button>
                  )}
                  {quotation.status === "converted" &&
                    quotation.convertedInvoiceId && (
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link
                          href={`/admin/stock/invoices/${quotation.convertedInvoiceId}`}
                        >
                          Invoice
                        </Link>
                      </Button>
                    )}
                </div>
              </MobileCard>
            ))}
          </MobileCardList>

          <StickyActionBar label="Quotation actions">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              aria-label="Refresh quotations"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowCreate(true);
                setEditingQuotationId(null);
              }}
              aria-label="Create new quotation"
            >
              New quote
            </Button>
          </StickyActionBar>

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
          </>
          )}
        </CardContent>
      </Card>

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmExport}>
              Export {exportType?.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
