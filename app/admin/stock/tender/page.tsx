"use client";

import { useEffect, useMemo, useState } from "react";
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
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { stockApi } from "@/lib/api";
import { finishDataLoad, startDataLoad } from "@/lib/silent-load";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyStampToPdf,
  generateTenderPdf,
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

interface TenderItem {
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
  categoryGroup?: string;
}

interface Tender {
  _id: string;
  tenderNumber: string;
  tenderName: string;
  department: string;
  status: "draft" | "pending_approval" | "converted" | "cancelled";
  client: Client;
  items: TenderItem[];
  subTotal: number;
  createdBy: string;
  createdByName?: string;
  ownerUserId?: string;
  ownerUserName?: string;
  branchId?: string;
  branchName?: string;
  convertedInvoiceId?: string;
  createdAt: string;
  categoryOrder?: string[];
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
  categoryGroup?: string;
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

export default function TendersPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceDocumentSettings>({});
  const [searchInput, setTenderSearchInput] = useState("");
  const [tenderSearch, setTenderSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [statusFilter, setStatusFilter] = useState<"all" | Tender["status"]>(
    "all",
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showCreate, setShowCreate] = useState(false);
  const [editingTenderId, setEditingTenderId] = useState<string | null>(null);
  const [savingTender, setSavingTender] = useState(false);

  const [tenderName, setTenderName] = useState("");
  const [department, setDepartment] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [clientContactPerson, setClientContactPerson] = useState("");
  const [selectedExistingClient, setSelectedExistingClient] = useState("");
  const [existingClientSearch, setExistingClientSearch] = useState("");
  const [showClientList, setShowClientList] = useState(true);
  const [tenderOwnerId, setTenderOwnerId] = useState("");
  const [tenderBranchId, setTenderBranchId] = useState("");
  const [branchHint, setBranchHint] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemTaxRate, setItemTaxRate] = useState("0");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategoryGroup, setItemCategoryGroup] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  // Bulk add by category
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (!q) return;
    setTenderSearchInput(q);
    setTenderSearch(q);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [tenderSearch, sortBy, statusFilter]);

  useEffect(() => {
    // No local UI preferences on this page; stamp and signature are managed per-user in User Settings / Profile
  }, []);

  const buildCategoryOrderFromItems = (sourceItems: DraftItem[]) => {
    const categories = Array.from(
      new Set(
        sourceItems
          .map((item) => item.categoryGroup?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );
    return categories;
  };

  useEffect(() => {
    setCategoryOrder((prev) => {
      const nextCategories = buildCategoryOrderFromItems(items);
      const existing = prev.filter((category) =>
        nextCategories.includes(category),
      );
      const missing = nextCategories.filter(
        (category) => !existing.includes(category),
      );
      return [...existing, ...missing];
    });
  }, [items]);

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
        tendersRes,
        activityClientsRes,
        savedClientsRes,
        brandingRes,
        invoiceSettingsRes,
        usersRes,
        branchesRes,
      ] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/stock/tenders`, { headers: getAuthHeaders() }),
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
        tendersJson,
        activityClientsResp,
        savedClientsResp,
        brandingJson,
        invoiceSettingsJson,
        usersJson,
        branchesJson,
      ] = await Promise.all([
        productsRes.json(),
        tendersRes.json(),
        Promise.resolve(activityClientsRes),
        Promise.resolve(savedClientsRes),
        brandingRes.json(),
        invoiceSettingsRes.json(),
        usersRes.json(),
        branchesRes.json(),
      ]);

      setProducts(productsJson.data || []);
      setTenders(tendersJson.data || []);
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
    } catch (e) {
      console.error("Failed to load tenders API error:", e);
      toast({
        title: "Error",
        description: "Failed to load tenders",
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

  useEffect(() => {
    loadData();
  }, []);

  const primaryColor = branding.primaryColor || "#0f766e";
  const secondaryColor = branding.secondaryColor || "#0ea5e9";
  const primarySoftColor = hexToRgba(primaryColor, 0.08);
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08);
  const primaryBorderColor = hexToRgba(primaryColor, 0.18);

  const getSellerName = (tender: Tender) =>
    tender.ownerUserName ||
    tender.createdByName ||
    tender.createdBy ||
    "System User";

  const filteredTenders = tenders.filter((tender) => {
    const query = tenderSearch.trim().toLowerCase();
    if (statusFilter !== "all" && tender.status !== statusFilter) return false;
    if (!query) return true;
    return (
      tender.tenderNumber.toLowerCase().includes(query) ||
      (tender.tenderName || "").toLowerCase().includes(query) ||
      (tender.department || "").toLowerCase().includes(query) ||
      tender.client.name.toLowerCase().includes(query) ||
      tender.client.number.toLowerCase().includes(query) ||
      tender.client.location.toLowerCase().includes(query) ||
      getSellerName(tender).toLowerCase().includes(query)
    );
  });

  const sortedTenders = useMemo(() => {
    return [...filteredTenders].sort((a, b) => {
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
  }, [filteredTenders, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedTenders.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedTenders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTenders.slice(start, start + pageSize);
  }, [page, sortedTenders]);

  const visiblePages = useMemo(() => {
    const count = Math.min(8, totalPages);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [totalPages]);

  const summary = useMemo(() => {
    return tenders.reduce(
      (acc, tender) => {
        acc.total += 1;
        acc.amount += Number(tender.subTotal || 0);
        if (tender.status === "pending_approval") acc.pending += 1;
        if (tender.status === "draft") acc.draft += 1;
        if (tender.status === "converted") acc.converted += 1;
        return acc;
      },
      { total: 0, amount: 0, pending: 0, draft: 0, converted: 0 },
    );
  }, [tenders]);

  const pendingApprovalTenders = filteredTenders.filter(
    (tender) => tender.status === "pending_approval",
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

  // Derive unique categories from the product list
  const productCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    for (const p of products) {
      if (p.categoryDetails?._id && p.categoryDetails?.name) {
        catMap.set(p.categoryDetails._id, p.categoryDetails.name);
      }
    }
    return Array.from(catMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Products in the currently selected bulk category, sorted by price (expensive to cheapest)
  const bulkCategoryProducts = useMemo(() => {
    if (!bulkCategoryId) return [];
    return products
      .filter(
        (p) =>
          p.categoryDetails?._id === bulkCategoryId &&
          Number(p.currentQuantity || 0) > 0,
      )
      .sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0));
  }, [products, bulkCategoryId]);

  const addProductsByCategory = () => {
    if (!bulkCategoryId) {
      toast({
        title: "No category selected",
        description: "Please select a category first",
        variant: "destructive",
      });
      return;
    }
    if (bulkCategoryProducts.length === 0) {
      toast({
        title: "No products",
        description: "No in-stock products found for that category",
        variant: "destructive",
      });
      return;
    }

    const categoryName =
      productCategories.find((c) => c.id === bulkCategoryId)?.name ||
      "Unknown Category";
    const newItems: DraftItem[] = bulkCategoryProducts.map((product) => ({
      productId: product._id,
      productName: product.name,
      quantity: 1,
      productUnitPrice: Number(product.sellingPrice || 0),
      soldUnitPrice: Number(product.sellingPrice || 0),
      unitPrice: Number(product.sellingPrice || 0),
      isOutsourced: product.isOutsourced ?? false,
      description: product.description || "",
      imageUrl: product.imageUrl,
      showImageOnQuote: true,
      categoryGroup: categoryName,
    }));

    setItems((prev) => [...prev, ...newItems]);
    setBulkCategoryId("");
    toast({
      title: "Category added",
      description: `${newItems.length} products from "${categoryName}" added to the tender`,
    });
  };

  const outOfStockHiddenCount = matchingProducts.filter(
    (product) => Number(product.currentQuantity || 0) <= 0,
  ).length;

  const productSuggestions = matchingProducts
    .filter((product) => Number(product.currentQuantity || 0) > 0)
    .sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0))
    .slice(0, 8);

  const resetForm = () => {
    setTenderName("");
    setDepartment("");
    setClientName("");
    setClientNumber("");
    setClientLocation("");
    setClientContactPerson("");
    setSelectedExistingClient("");
    setExistingClientSearch("");
    setTenderOwnerId("");
    setTenderBranchId("");
    setBranchHint("");
    setProductSearch("");
    setItemQuantity("1");
    setItemUnitPrice("");
    setItemTaxRate("0");
    setItemDescription("");
    setItemCategoryGroup("");
    setItems([]);
    setCategoryOrder([]);
    setBulkCategoryId("");
    setEditingTenderId(null);
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

    const inferredCategoryGroup =
      itemCategoryGroup.trim() || product.categoryDetails?.name || undefined;

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
        categoryGroup: inferredCategoryGroup,
      },
    ]);

    setProductSearch("");
    setItemQuantity("1");
    setItemUnitPrice("");
    setItemDescription("");
    setItemCategoryGroup("");
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

  const updateDraftItemCategoryGroup = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        return {
          ...item,
          categoryGroup: value.trim() || undefined,
        };
      }),
    );
  };

  const moveCategoryOrder = (index: number, direction: -1 | 1) => {
    setCategoryOrder((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const moveDraftItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const duplicateDraftItem = (index: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const duplicate: DraftItem = {
        ...item,
        quantity: item.quantity || 1,
      };
      const next = [...prev];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
  };

  const createOrUpdateTender = async () => {
    if (
      !tenderName ||
      !department ||
      !clientName ||
      !clientNumber ||
      items.length === 0
    ) {
      const missing = [];
      if (!tenderName) missing.push("Tender Name");
      if (!department) missing.push("Department");
      if (!clientName) missing.push("Client Name");
      if (!clientNumber) missing.push("Phone Number");
      if (items.length === 0) missing.push("at least one item");

      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingTender(true);

      const endpoint = editingTenderId
        ? `${API_URL}/api/stock/tenders/${editingTenderId}`
        : `${API_URL}/api/stock/tenders`;

      const method = editingTenderId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenderName,
          department,
          clientName,
          clientNumber,
          clientLocation: clientLocation || "N/A",
          clientContactPerson: clientContactPerson || "",
          ownerUserId: tenderOwnerId || undefined,
          branchId: tenderBranchId || undefined,
          items,
          categoryOrder,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Failed to save tender backend response:", result);
        toast({
          title: "Error",
          description: result.message || "Failed to save tender",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: editingTenderId
          ? `Tender ${result.data.tenderNumber} updated`
          : `Tender ${result.data.tenderNumber} created`,
      });

      resetForm();
      loadData({ silent: true });
    } catch (error) {
      console.error("Failed to save tender:", error);
      toast({
        title: "Error",
        description: "Failed to save tender",
        variant: "destructive",
      });
    } finally {
      setSavingTender(false);
    }
  };

  const startEditTender = (tender: Tender) => {
    if (tender.status !== "draft" && tender.status !== "pending_approval") {
      toast({
        title: "Not editable",
        description: "Only draft or pending tenders can be edited",
        variant: "destructive",
      });
      return;
    }

    setShowCreate(true);
    setEditingTenderId(tender._id);
    setTenderName(tender.tenderName || "");
    setDepartment(tender.department || "");
    setClientName(tender.client.name);
    setClientNumber(tender.client.number);
    setClientLocation(tender.client.location);
    setClientContactPerson(tender.client.contactPerson || "");
    setSelectedExistingClient("");
    setTenderOwnerId(tender.ownerUserId || "");
    setTenderBranchId(tender.branchId || "");
    setBranchHint(tender.branchName || "");
    const mappedItems = tender.items.map((item) => {
      const matchedProduct = products.find(
        (product) => product._id === item.productId,
      );
      const categoryGroup =
        item.categoryGroup || matchedProduct?.categoryDetails?.name || "";

      return {
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
        categoryGroup: categoryGroup || undefined,
      };
    });
    setItems(mappedItems);
    setCategoryOrder(
      tender.categoryOrder?.length
        ? tender.categoryOrder.filter(Boolean)
        : buildCategoryOrderFromItems(mappedItems),
    );
  };

  const approveTender = async (tenderId: string) => {
    const response = await fetch(
      `${API_URL}/api/stock/tenders/${tenderId}/approve`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      console.error("Failed to approve tender backend response:", result);
      toast({
        title: "Error",
        description: result.message || "Failed to approve tender",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Approved", description: "Tender moved to active tenders" });
    loadData({ silent: true });
  };

  const rejectTender = async (tenderId: string) => {
    const response = await fetch(
      `${API_URL}/api/stock/tenders/${tenderId}/reject`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      console.error("Failed to reject tender backend response:", result);
      toast({
        title: "Error",
        description: result.message || "Failed to reject tender",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Rejected", description: "Tender has been rejected" });
    loadData({ silent: true });
  };

  const convertToInvoice = async (tenderId: string) => {
    const response = await fetch(
      `${API_URL}/api/stock/tenders/${tenderId}/convert`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      console.error("Failed to convert tender backend response:", result);
      toast({
        title: "Error",
        description: result.message || "Failed to convert tender",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Converted",
      description: `Invoice ${result.data.invoiceNumber} created with Delivery Note ${result.data.deliveryNoteNumber}`,
    });
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
    if (!tenderOwnerId) {
      toast({
        title: "Select owner first",
        description: "Choose whose tender it is before finding the branch",
        variant: "destructive",
      });
      return;
    }

    const matchedBranch = branches.find(
      (branch) => branch.managerId === tenderOwnerId,
    );
    if (!matchedBranch) {
      setTenderBranchId("");
      setBranchHint("No branch matched for the selected owner");
      toast({
        title: "Branch not found",
        description: "No branch is assigned to that user yet",
        variant: "destructive",
      });
      return;
    }

    setTenderBranchId(matchedBranch._id);
    setBranchHint(`${matchedBranch.name} (${matchedBranch.code})`);
    toast({
      title: "Branch found",
      description: `Tender branch: ${matchedBranch.name} (${matchedBranch.code})`,
    });
  };

  // Generates the tender PDF. Every page header shows TENDER APPLICATION / Tender Name /
  // Department only — client details are intentionally withheld from the header/body so the
  // document reads as a formal tender application rather than a client-facing quote.
  const downloadTenderPdf = async (tender: Tender) => {
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

    const groupedByCategory = tender.items.reduce(
      (acc: Record<string, typeof tender.items>, item) => {
        const category =
          item.categoryGroup || item.description || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      },
      {},
    );

    const orderedCategoryNames = [
      ...(tender.categoryOrder || []).filter(Boolean),
      ...Object.keys(groupedByCategory).filter(
        (category) => !(tender.categoryOrder || []).includes(category),
      ),
    ];
    const orderedGroupedByCategory = Object.fromEntries(
      orderedCategoryNames
        .filter((category) => Boolean(groupedByCategory[category]))
        .map((category) => [
          category,
          (groupedByCategory[category] || []).map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            description: item.description,
            imageUrl: item.imageUrl,
            showImageOnQuote: item.showImageOnQuote,
          })),
        ]),
    );

    const doc = generateTenderPdf({
      tenderNumber: tender.tenderNumber,
      tenderName: tender.tenderName,
      department: tender.department,
      createdAt: tender.createdAt,
      clientName: tender.client?.name,
      items: tender.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        description: item.description,
        imageUrl: item.imageUrl,
        showImageOnQuote: item.showImageOnQuote,
      })),
      subTotal: tender.subTotal,
      branding,
      invoiceSettings,
      preparedBy,
      preparedBySignature,
      watermarkText: tender.status === "cancelled" ? "CANCELLED" : undefined,
      autoSave: false,
      groupedByCategory: orderedGroupedByCategory,
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

    doc.save(`tender-${tender.tenderNumber}.pdf`);
  };

  if (loading) return <PageLoadingSkeleton title="Loading tenders" rows={8} />;

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
              Tenders
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Tender dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, track, and convert tender applications into invoices.
            </p>
            {pendingApprovalTenders.length > 0 ? (
              <Badge
                variant="outline"
                className="mt-2 rounded-full border-amber-200 bg-amber-50 text-amber-800"
              >
                Pending requests {pendingApprovalTenders.length}
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
              onClick={() => (showCreate ? resetForm() : setShowCreate(true))}
            >
              {showCreate ? "Close" : "Create Tender"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total tenders
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
                placeholder="Tender no, tender name, department, client or owner"
                value={searchInput}
                onChange={(event) => setTenderSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setTenderSearch(searchInput);
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
                  <SelectValue placeholder="Sort tenders" />
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
                onClick={() => setTenderSearch(searchInput)}
              >
                Apply search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTenderId ? "Edit Tender" : "Create Tender"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Tender Name</Label>
                <Input
                  placeholder="e.g. Supply of Office Furniture"
                  value={tenderName}
                  onChange={(event) => setTenderName(event.target.value)}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  placeholder="e.g. Procurement Department"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                />
              </div>
            </div>

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

            <p className="text-xs text-muted-foreground">
              Client details below are kept for internal records and for the
              eventual invoice — they will not appear on the printed tender
              application header.
            </p>

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
                <Label>Tender Owner</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={tenderOwnerId}
                  onChange={(event) => {
                    setTenderOwnerId(event.target.value);
                    setBranchHint("");
                  }}
                >
                  <option value="">-- Select who this tender is for --</option>
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
                      value={tenderBranchId}
                      onChange={(event) =>
                        setTenderBranchId(event.target.value)
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

            {/* ── Bulk Add by Department/Category ─────────────────────────── */}
            <div className="rounded-md border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">
                  Add All Products by Department / Category
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a category to preview its in-stock products and add
                  them all at once. Each category added is grouped with a
                  separator line in the items table.
                </p>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Select Category / Department</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={bulkCategoryId}
                    onChange={(e) => setBulkCategoryId(e.target.value)}
                  >
                    <option value="">-- Select a category --</option>
                    {productCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  onClick={addProductsByCategory}
                  disabled={!bulkCategoryId}
                >
                  Add Department
                </Button>
              </div>
              {bulkCategoryId && bulkCategoryProducts.length > 0 && (
                <div className="rounded border bg-background">
                  <div className="border-b bg-muted/30 px-3 py-2 text-sm font-semibold mb-2 flex items-center justify-between">
                    <span>
                      {
                        productCategories.find((c) => c.id === bulkCategoryId)
                          ?.name
                      }{" "}
                      — {bulkCategoryProducts.length} product(s) in stock
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      (Sorted: Expensive → Cheapest)
                    </span>
                  </div>
                  <div className="divide-y max-h-56 overflow-y-auto">
                    {bulkCategoryProducts.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Stock: {product.currentQuantity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            KES{" "}
                            {Number(product.sellingPrice || 0).toLocaleString(
                              "en-KE",
                              { minimumFractionDigits: 2 },
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bulkCategoryId && bulkCategoryProducts.length === 0 && (
                <p className="text-xs text-destructive">
                  No in-stock products found for this category.
                </p>
              )}
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <p className="text-sm font-medium">Add Individual Product</p>
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
                  <Label>Section / Category (optional)</Label>
                  <Input
                    placeholder="e.g. Furniture, Installation, Civil Works"
                    value={itemCategoryGroup}
                    onChange={(event) =>
                      setItemCategoryGroup(event.target.value)
                    }
                    className="mt-1"
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
                  {productSuggestions.length > 0 && (
                    <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Matching Products</span>
                      <span className="font-medium text-primary">
                        Sorted: Expensive → Cheapest
                      </span>
                    </div>
                  )}
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
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        Quotation section order
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Move categories up or down to decide which sections
                        appear first in the quotation.
                      </p>
                    </div>
                  </div>
                  {categoryOrder.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {categoryOrder.map((category, index) => (
                        <div
                          key={category}
                          className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
                        >
                          <span className="font-medium">{category}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              type="button"
                              variant="outline"
                              className="h-7 w-7 px-0"
                              onClick={() => moveCategoryOrder(index, -1)}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              size="sm"
                              type="button"
                              variant="outline"
                              className="h-7 w-7 px-0"
                              onClick={() => moveCategoryOrder(index, 1)}
                              disabled={index === categoryOrder.length - 1}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Add a section/category to each item to arrange quote
                      sections here.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reorder rows with ↑/↓ to change the quote output order, or
                  duplicate a row to place the same product in another
                  section/category.
                </p>
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2">Qty</th>
                        <th className="py-2 px-2">Product Price</th>
                        <th className="py-2 px-2">Sold Price (Editable)</th>
                        <th className="py-2 px-2">Section</th>
                        <th className="py-2 px-2">Outsourced</th>
                        <th className="py-2 px-2">Total</th>
                        <th className="py-2 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const renderedGroups = new Set<string>();
                        return items.flatMap((item, index) => {
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
                          const soldPrice =
                            item.soldUnitPrice ?? item.unitPrice;
                          const group = item.categoryGroup || "";
                          const showGroupHeader =
                            group && !renderedGroups.has(group);
                          if (showGroupHeader) renderedGroups.add(group);

                          const rows = [];
                          if (showGroupHeader) {
                            rows.push(
                              <tr key={`group-header-${group}-${index}`}>
                                <td colSpan={7} className="px-2 pt-4 pb-1">
                                  <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="rounded-full border bg-muted px-3 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                                      {group}
                                    </span>
                                    <div className="h-px flex-1 bg-border" />
                                  </div>
                                </td>
                              </tr>,
                            );
                          }

                          rows.push(
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
                                              ? {
                                                  ...it,
                                                  showImageOnQuote: !!val,
                                                }
                                              : it,
                                          ),
                                        );
                                      }}
                                    />
                                    <span>Show image on tender PDF</span>
                                  </label>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    );
                                    setItems((prev) =>
                                      prev.map((it, idx) =>
                                        idx === index
                                          ? { ...it, quantity: qty }
                                          : it,
                                      ),
                                    );
                                  }}
                                  className="h-8 w-20"
                                />
                              </td>
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
                                <Input
                                  value={item.categoryGroup || ""}
                                  onChange={(e) =>
                                    updateDraftItemCategoryGroup(
                                      index,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. Furniture"
                                  className="h-8 min-w-[140px]"
                                />
                              </td>
                              <td className="py-2 px-2">
                                {item.isOutsourced ? "Yes" : "No"}
                              </td>
                              <td className="py-2 px-2">
                                {(item.quantity * soldPrice).toFixed(2)}
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    className="h-8 w-8 px-0"
                                    onClick={() => moveDraftItem(index, -1)}
                                    disabled={index === 0}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    className="h-8 w-8 px-0"
                                    onClick={() => moveDraftItem(index, 1)}
                                    disabled={index === items.length - 1}
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    onClick={() => duplicateDraftItem(index)}
                                  >
                                    Duplicate
                                  </Button>
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="destructive"
                                    onClick={() => removeDraftItem(index)}
                                  >
                                    Drop
                                  </Button>
                                </div>
                              </td>
                            </tr>,
                          );
                          return rows;
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={createOrUpdateTender}
                disabled={savingTender}
              >
                {savingTender
                  ? "Saving..."
                  : editingTenderId
                    ? "Update Tender"
                    : "Generate Tender"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
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
              {pendingApprovalTenders.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingApprovalTenders.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              No pending approvals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full table-fixed text-[13px]">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-medium w-[13%]">Tender No</th>
                    <th className="px-3 py-3 font-medium w-[18%]">
                      Tender Name
                    </th>
                    <th className="px-3 py-3 font-medium w-[14%]">
                      Department
                    </th>
                    <th className="px-3 py-3 font-medium w-[15%]">Owner</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Branch</th>
                    <th className="px-3 py-3 font-medium w-[10%]">Amount</th>
                    <th className="px-3 py-3 font-medium w-[18%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovalTenders.map((tender, index) => (
                    <tr
                      key={tender._id}
                      className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                    >
                      <td className="px-3 py-2 align-top">
                        <div
                          className="truncate font-medium"
                          title={tender.tenderNumber}
                        >
                          {tender.tenderNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Pending approval
                        </div>
                      </td>
                      <td
                        className="px-3 py-2 align-top truncate"
                        title={tender.tenderName}
                      >
                        {tender.tenderName || "-"}
                      </td>
                      <td
                        className="px-3 py-2 align-top truncate"
                        title={tender.department}
                      >
                        {tender.department || "-"}
                      </td>
                      <td
                        className="px-3 py-2 align-top truncate"
                        title={getSellerName(tender)}
                      >
                        {getSellerName(tender)}
                      </td>
                      <td
                        className="px-3 py-2 align-top truncate"
                        title={tender.branchName || "-"}
                      >
                        {tender.branchName || "-"}
                      </td>
                      <td className="px-3 py-2 align-top font-medium">
                        KES{" "}
                        {tender.subTotal.toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadTenderPdf(tender)}
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditTender(tender)}
                          >
                            Edit
                          </Button>
                          {canApprove ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveTender(tender._id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectTender(tender._id)}
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
              <CardTitle className="text-base">Tender list</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {sortedTenders.length} of {filteredTenders.length}{" "}
                tenders
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Compact view for faster scanning.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full table-fixed text-[13px]">
              <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr className="border-b">
                  <th className="px-3 py-3 font-medium w-[12%]">Tender No</th>
                  <th className="px-3 py-3 font-medium w-[16%]">Tender Name</th>
                  <th className="px-3 py-3 font-medium w-[12%]">Department</th>
                  <th className="px-3 py-3 font-medium w-[12%]">Owner</th>
                  <th className="px-3 py-3 font-medium w-[10%]">Branch</th>
                  <th className="px-3 py-3 font-medium w-[7%]">Items</th>
                  <th className="px-3 py-3 font-medium w-[10%]">Amount</th>
                  <th className="px-3 py-3 font-medium w-[9%]">Status</th>
                  <th className="px-3 py-3 font-medium w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedTenders.map((tender, index) => (
                  <tr
                    key={tender._id}
                    className={`border-b align-top transition-colors hover:bg-muted/40 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                  >
                    <td className="px-3 py-2 align-top">
                      <div
                        className="truncate font-medium"
                        title={tender.tenderNumber}
                      >
                        {tender.tenderNumber}
                      </div>
                    </td>
                    <td
                      className="px-3 py-2 align-top truncate"
                      title={tender.tenderName}
                    >
                      {tender.tenderName || "-"}
                    </td>
                    <td
                      className="px-3 py-2 align-top truncate"
                      title={tender.department}
                    >
                      {tender.department || "-"}
                    </td>
                    <td
                      className="px-3 py-2 align-top truncate"
                      title={getSellerName(tender)}
                    >
                      {getSellerName(tender)}
                    </td>
                    <td
                      className="px-3 py-2 align-top truncate"
                      title={tender.branchName || "-"}
                    >
                      {tender.branchName || "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {tender.items.length}
                    </td>
                    <td className="px-3 py-2 align-top font-medium">
                      KES{" "}
                      {tender.subTotal.toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                          tender.status === "converted"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : tender.status === "pending_approval"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : tender.status === "draft"
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {tender.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadTenderPdf(tender)}
                        >
                          PDF
                        </Button>
                        {tender.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditTender(tender)}
                          >
                            Edit
                          </Button>
                        )}
                        {tender.status === "draft" ? (
                          <Button
                            size="sm"
                            onClick={() => convertToInvoice(tender._id)}
                          >
                            Convert
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground self-center">
                            Converted
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
          {sortedTenders.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, sortedTenders.length)} of{" "}
                {sortedTenders.length}
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
