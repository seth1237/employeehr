"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import API_URL from "@/lib/apiBase";
import { getToken, getUser } from "@/lib/auth";
import { fetchJson, parseResponse } from "@/lib/fetchUtils";
import { finishDataLoad, startDataLoad } from "@/lib/silent-load";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import dynamic from "next/dynamic";
import type {
  InvoiceDocumentSettings,
  TenantBranding,
} from "@/lib/stock-document-pdf";
import { STOCK_VIEW_FETCHES } from "@/lib/stock-view-fetch";

const WarehouseManagement = dynamic(() => import("./warehouse-management"), {
  ssr: false,
});

const CategoriesManager = dynamic(
  () =>
    import("./categories-manager").then((m) => ({
      default: m.CategoriesManager,
    })),
  { loading: () => <div className="py-8 text-sm text-muted-foreground">Loading categories…</div> },
);

const ProductsManager = dynamic(
  () =>
    import("./products-manager").then((m) => ({
      default: m.ProductsManager,
    })),
  { loading: () => <div className="py-8 text-sm text-muted-foreground">Loading products…</div> },
);

const ProductTrendChart = dynamic(
  () =>
    import("./analytics-charts").then((m) => ({
      default: m.ProductTrendChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded bg-muted" />,
  },
);

const ProductComparisonChart = dynamic(
  () =>
    import("./analytics-charts").then((m) => ({
      default: m.ProductComparisonChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded bg-muted" />,
  },
);

type StockView =
  | "add-inventory"
  | "sales"
  | "wms"
  | "status"
  | "analytics"
  | "history"
  | "outsourced"
  | "services";

interface Category {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  level?: number;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  category: string;
  startingPrice: number;
  sellingPrice: number;
  minAlertQuantity: number;
  currentQuantity: number;
  assignedUsers: string[];
  isOutsourced?: boolean;
  expiryEnabled?: boolean;
  expiryDate?: string | null;
  expiryReminderDays?: number;
  categoryDetails?: { _id: string; name: string };
  productType?: "physical" | "service";
  isRecurring?: boolean;
  intervalDays?: number;
  imageUrl?: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Sale {
  _id: string;
  quantitySold: number;
  soldPrice: number;
  remainingQuantity: number;
  receiptNumber?: string;
  buyerName?: string;
  buyerNumber?: string;
  buyerLocation?: string;
  isWalkInClient?: boolean;
  createdAt: string;
  invoiceId?: string;
  product?: { _id: string; name: string };
  soldByUser?: { firstName: string; lastName: string; email: string };
  salesEmployee?: { firstName: string; lastName: string; email: string };
}

interface StockEntry {
  _id: string;
  productId: string;
  branchId?: string;
  quantityAdded: number;
  isOutsourced?: boolean;
  outsourcedCompany?: string;
  addedBy: string;
  note?: string;
  entryDate?: string;
  createdAt: string;
}

interface QuotationItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isOutsourced?: boolean;
  imageUrl?: string;
  showImageOnQuote?: boolean;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  status: "draft" | "converted" | "cancelled";
  items: QuotationItem[];
  subTotal: number;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  deliveryNoteNumber?: string;
  quotationNumber?: string;
  quotationId?: string;
  client?: { name: string; number: string; location: string };
  items: QuotationItem[];
  subTotal: number;
  status?: "issued" | "paid" | "cancelled";
  createdAt: string;
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

interface ClientSuggestion {
  name: string;
  number: string;
  location: string;
  contactPerson?: string;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized))
    return `rgba(15, 118, 110, ${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StockManagerContent({ view }: { view: StockView }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusTab, setStatusTab] = useState<
    "overview" | "categories" | "products"
  >("overview");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });
  const [categoryMode, setCategoryMode] = useState<"main" | "sub">("main");
  const [categoryParentId, setCategoryParentId] = useState("none");
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    startingPrice: "",
    sellingPrice: "",
    minAlertQuantity: "",
    currentQuantity: "0",
    assignedUsers: [] as string[],
    isOutsourced: false,
    expiryEnabled: false,
    expiryDate: "",
    expiryReminderDays: "7",
    productType: "physical" as "physical" | "service",
    isRecurring: false,
    intervalDays: "",
    manufacturer: "none",
    description: "",
  });
  const [stockForm, setStockForm] = useState({
    productId: "",
    quantityAdded: "",
    note: "",
    outsourcedOnly: false,
    isOutsourced: false,
    outsourcedCompany: "",
    expiryEnabled: false,
    expiryDate: "",
    expiryReminderDays: "7",
    branchId: "",
    backdateEnabled: false,
    entryDate: "",
  });
  const [saleForm, setSaleForm] = useState({
    productId: "",
    quantitySold: "",
    soldPrice: "",
    isSalesCompany: false,
    salesEmployeeId: "",
    isWalkInClient: false,
    buyerName: "",
    buyerNumber: "",
    buyerLocation: "",
  });
  const [saleItems, setSaleItems] = useState<QuotationItem[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const productsFileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingProducts, setUploadingProducts] = useState(false);
  const [bulkProductBranchId, setBulkProductBranchId] = useState("");
  const [productBranchId, setProductBranchId] = useState("");
  const filteredClientSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const q = clientSearch.trim().toLowerCase();
    return clients
      .map((c) => ({
        name: c.name || "",
        number: c.number || "",
        location: c.location || "",
        contactPerson: c.contactPerson,
      }))
      .filter((c) => {
        const key = `${c.name}|${c.number}|${c.location}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.number || "").toLowerCase().includes(q) ||
          (c.location || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [clients, clientSearch]);
  const clientSelected = Boolean(
    saleForm.isWalkInClient ||
    (saleForm.buyerName.trim() &&
      saleForm.buyerNumber.trim() &&
      saleForm.buyerLocation.trim() &&
      !showNewClientForm),
  );
  const [saleProductSearch, setSaleProductSearch] = useState("");
  const saleProductInputRef = useRef<HTMLInputElement | null>(null);
  const [saleProductOptionsOpen, setSaleProductOptionsOpen] = useState(true);
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [productAreaCollapsed, setProductAreaCollapsed] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryBranchFilter, setInventoryBranchFilter] = useState("all");
  const [selectedAnalyticsProductId, setSelectedAnalyticsProductId] =
    useState("");
  const [analyticsDateStart, setAnalyticsDateStart] = useState("");
  const [analyticsDateEnd, setAnalyticsDateEnd] = useState("");
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<
    | "date-desc"
    | "date-asc"
    | "product-asc"
    | "product-desc"
    | "qty-desc"
    | "qty-asc"
    | "buyer-asc"
    | "buyer-desc"
  >("date-desc");
  const [historyPage, setHistoryPage] = useState(1);
  const [outsourcedSearchInput, setOutsourcedSearchInput] = useState("");
  const [outsourcedSearch, setOutsourcedSearch] = useState("");
  const [outsourcedSort, setOutsourcedSort] = useState<
    | "value-desc"
    | "value-asc"
    | "quantity-desc"
    | "quantity-asc"
    | "name-asc"
    | "name-desc"
  >("value-desc");
  const [outsourcedPage, setOutsourcedPage] = useState(1);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceDocumentSettings>({});

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

  const fetchAll = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing);
    try {
      const plan = STOCK_VIEW_FETCHES[view];
      const needed = new Set(plan.keys);

      const fetchers: Record<string, () => Promise<any>> = {
        categories: () =>
          fetchJson(`${API_URL}/api/stock/categories`, { headers }),
        products: () =>
          fetchJson(
            `${API_URL}/api/stock/products${plan.productsLite ? "?lite=1" : ""}`,
            { headers },
          ),
        branding: () =>
          fetchJson(`${API_URL}/api/company/branding`, { headers }),
        users: () => fetchJson(`${API_URL}/api/users`, { headers }),
        branches: () => fetchJson(`${API_URL}/api/branches`, { headers }),
        sales: () => fetchJson(`${API_URL}/api/stock/sales`, { headers }),
        invoices: () => fetchJson(`${API_URL}/api/stock/invoices`, { headers }),
        quotations: () =>
          fetchJson(`${API_URL}/api/stock/quotations`, { headers }),
        clients: () => fetchJson(`${API_URL}/api/stock/clients`, { headers }),
        entries: () => fetchJson(`${API_URL}/api/stock/entries`, { headers }),
        manufacturers: () =>
          fetchJson(`${API_URL}/api/stock/manufacturers`, { headers }),
        warehouseLocations: () =>
          fetchJson(`${API_URL}/api/stock/warehouse-locations`, { headers }),
      };

      const keys = [...needed];
      const results = await Promise.all(keys.map((k) => fetchers[k]()));

      const resultsObj: Record<string, any> = {};
      keys.forEach((k, i) => {
        if (results[i].errorMessage) {
          throw new Error(results[i].errorMessage);
        }
        resultsObj[k] = results[i].data?.data;
      });

      if (resultsObj.categories) setCategories(resultsObj.categories);
      if (resultsObj.products) setProducts(resultsObj.products);
      if (resultsObj.users) {
        setEmployees(
          (resultsObj.users || []).filter((user: Employee) =>
            ["employee", "manager", "hr", "company_admin"].includes(user.role),
          )
        );
      }
      if (resultsObj.sales) setSales(resultsObj.sales);
      if (resultsObj.entries) setEntries(resultsObj.entries);
      if (resultsObj.quotations) setQuotations(resultsObj.quotations);
      if (resultsObj.invoices) setInvoices(resultsObj.invoices);
      if (resultsObj.branches) {
        setBranches(
          (resultsObj.branches || []).filter((branch: any) => branch.isActive)
        );
      }
      if (resultsObj.warehouseLocations) setWarehouseLocations(resultsObj.warehouseLocations);
      if (resultsObj.clients) {
        setClients(
          (resultsObj.clients || []).filter(
            (client: ClientSuggestion) =>
              client.name && client.number && client.location,
          )
        );
      }
      if (resultsObj.branding) setBranding(resultsObj.branding);
      if (resultsObj.manufacturers) setManufacturers(resultsObj.manufacturers);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!selectedAnalyticsProductId && products.length > 0) {
      setSelectedAnalyticsProductId(products[0]._id);
    }
  }, [products, selectedAnalyticsProductId]);

  useEffect(() => {
    if (!analyticsDateStart && !analyticsDateEnd) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 11);
      setAnalyticsDateStart(start.toISOString().slice(0, 10));
      setAnalyticsDateEnd(end.toISOString().slice(0, 10));
    }
  }, [analyticsDateStart, analyticsDateEnd]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historySort]);

  useEffect(() => {
    setOutsourcedPage(1);
  }, [outsourcedSearch, outsourcedSort]);

  const lowStockProducts = products.filter(
    (product) => product.currentQuantity <= product.minAlertQuantity,
  );
  const totalInventoryUnits = products.reduce(
    (sum, product) => sum + (product.currentQuantity || 0),
    0,
  );
  const totalStockValue = products.reduce(
    (sum, product) =>
      sum + (product.currentQuantity || 0) * (product.sellingPrice || 0),
    0,
  );
  const totalSalesValue = sales.reduce(
    (sum, sale) => sum + (sale.quantitySold || 0) * (sale.soldPrice || 0),
    0,
  );
  const productNameById = new Map(
    products.map((product) => [product._id, product.name]),
  );
  const categoryNameById = new Map(
    categories.map((category) => [category._id, category.name]),
  );
  const branchNameById = new Map(
    branches.map((branch) => [branch._id, `${branch.name} (${branch.code})`]),
  );
  const branchStockByProductId = new Map<string, Map<string, number>>();
  const unassignedStockByProductId = new Map<string, number>();

  entries.forEach((entry) => {
    const productStocks =
      branchStockByProductId.get(entry.productId) || new Map<string, number>();
    const branchKey = entry.branchId ? String(entry.branchId) : "none";
    productStocks.set(
      branchKey,
      (productStocks.get(branchKey) || 0) + Number(entry.quantityAdded || 0),
    );
    branchStockByProductId.set(entry.productId, productStocks);

    if (!entry.branchId) {
      unassignedStockByProductId.set(
        entry.productId,
        (unassignedStockByProductId.get(entry.productId) || 0) +
          Number(entry.quantityAdded || 0),
      );
    }
  });

  const branchLabelForId = (branchId: string) =>
    branchNameById.get(branchId) || branchId;

  const getBranchStock = (productId: string, branchId: string) => {
    const productStocks = branchStockByProductId.get(productId);
    return Number(productStocks?.get(branchId) || 0);
  };

  const getDisplayedBranchStock = (productId: string) => {
    if (inventoryBranchFilter === "none")
      return Number(unassignedStockByProductId.get(productId) || 0);
    if (inventoryBranchFilter !== "all")
      return getBranchStock(productId, inventoryBranchFilter);

    const productStocks = branchStockByProductId.get(productId);
    if (!productStocks) return 0;
    return Array.from(productStocks.values()).reduce(
      (sum, qty) => sum + Number(qty || 0),
      0,
    );
  };

  const getDisplayedBranchSummary = (productId: string) => {
    if (inventoryBranchFilter === "none") {
      return `No branch: ${getDisplayedBranchStock(productId)}`;
    }

    if (inventoryBranchFilter !== "all") {
      return `${branchLabelForId(inventoryBranchFilter)}: ${getDisplayedBranchStock(productId)}`;
    }

    const productStocks = branchStockByProductId.get(productId);
    if (!productStocks) return "-";

    const parts = Array.from(productStocks.entries()).map(([branchId, qty]) => {
      const label =
        branchId === "none" ? "No branch" : branchLabelForId(branchId);
      return `${label}: ${qty}`;
    });

    return parts.length > 0 ? parts.join(" | ") : "-";
  };

  const warehouseBranchSummaries = branches.map((branch) => {
    let totalUnits = 0;
    let stockedProducts = 0;

    products.forEach((product) => {
      const qty = getBranchStock(product._id, branch._id);
      if (qty > 0) {
        totalUnits += qty;
        stockedProducts += 1;
      }
    });

    return {
      branchId: branch._id,
      branchLabel:
        branchNameById.get(branch._id) || `${branch.name} (${branch.code})`,
      totalUnits,
      stockedProducts,
    };
  });

  const unassignedWarehouseUnits = products.reduce(
    (sum, product) => sum + (unassignedStockByProductId.get(product._id) || 0),
    0,
  );
  const unassignedWarehouseProducts = products.filter(
    (product) => (unassignedStockByProductId.get(product._id) || 0) > 0,
  ).length;

  const visibleBranchColumns =
    inventoryBranchFilter === "all"
      ? branches
      : inventoryBranchFilter === "none"
        ? []
        : branches.filter((branch) => branch._id === inventoryBranchFilter);

  const shouldIncludeUnassignedColumn =
    inventoryBranchFilter === "all" || inventoryBranchFilter === "none";
  const visibleStockColumnCount =
    visibleBranchColumns.length + (shouldIncludeUnassignedColumn ? 1 : 0);

  const getCategoryById = (categoryId: string) =>
    categories.find((category) => category._id === categoryId);

  const getCategoryPath = (categoryId: string) => {
    const path: string[] = [];
    let currentCategory = getCategoryById(categoryId);

    while (currentCategory) {
      path.unshift(currentCategory.name);
      currentCategory = currentCategory.parentId
        ? getCategoryById(currentCategory.parentId)
        : undefined;
    }

    return path.length > 0 ? path.join(" / ") : "Uncategorized";
  };

  const getCreatableParentCategories = () => {
    return categories.filter(
      (category) => !category.level || category.level < 3,
    );
  };

  const normalizedSalesSearch = salesSearch.trim().toLowerCase();
  const normalizedInventorySearch = inventorySearch.trim().toLowerCase();

  const matchesProductAndCategory = (product: Product, query: string) => {
    if (!query) return true;
    const categoryName =
      product.categoryDetails?.name ||
      categoryNameById.get(product.category) ||
      "";
    return (
      product.name.toLowerCase().includes(query) ||
      categoryName.toLowerCase().includes(query)
    );
  };

  const filteredProductsForSales = products.filter((product) =>
    matchesProductAndCategory(product, normalizedSalesSearch),
  );

  // Helper function to get category name from product
  const getCategoryNameForProduct = (product: Product) =>
    product.categoryDetails?.name ||
    categoryNameById.get(product.category) ||
    "Uncategorized";

  // Helper function to group products by category for display
  const getGroupedProductsWithCategories = (
    productsToGroup: Product[],
  ): Array<{
    type: "category" | "product";
    category?: string;
    product?: Product;
  }> => {
    const grouped = new Map<string, Product[]>();
    productsToGroup.forEach((product) => {
      const categoryId = product.category || "uncategorized";
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(product);
    });

    const result: Array<{
      type: "category" | "product";
      category?: string;
      product?: Product;
    }> = [];
    Array.from(grouped.entries())
      .sort(([catIdA], [catIdB]) => {
        const nameA =
          catIdA === "uncategorized"
            ? "ZZZ"
            : categoryNameById.get(catIdA) || "";
        const nameB =
          catIdB === "uncategorized"
            ? "ZZZ"
            : categoryNameById.get(catIdB) || "";
        return nameA.localeCompare(nameB);
      })
      .forEach(([categoryId, categoryProducts]) => {
        // Add category header
        result.push({
          type: "category",
          category: categoryNameById.get(categoryId) || "Uncategorized",
        });
        // Add products sorted by price (highest to lowest)
        categoryProducts
          .sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0))
          .forEach((product) => {
            result.push({ type: "product", product });
          });
      });
    return result;
  };

  const filteredProductsForSalePicker = useMemo(() => {
    const baseProducts = saleProductSearch.trim()
      ? products
      : filteredProductsForSales;
    const query = saleProductSearch.trim().toLowerCase();
    const filtered = baseProducts.filter((product) => {
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        (product.sku || "").toLowerCase().includes(query)
      );
    });

    // Group by category and sort by price (expensive to cheapest) within each category
    const grouped = new Map<string, Product[]>();
    filtered.forEach((product) => {
      const categoryId = product.category || "uncategorized";
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(product);
    });

    // Sort products within each category by price (highest to lowest)
    const sorted = Array.from(grouped.entries())
      .map(([, categoryProducts]) =>
        categoryProducts.sort(
          (a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0),
        ),
      )
      .flat()
      .slice(0, 50);

    return sorted;
  }, [products, filteredProductsForSales, saleProductSearch, categoryNameById]);

  const shouldShowSaleProductOptions =
    saleProductSearch.trim().length > 0 && saleProductOptionsOpen;

  const filteredSales = sales.filter((sale) => {
    if (!normalizedSalesSearch) return true;
    const productName = (sale.product?.name || "").toLowerCase();
    const productCategory =
      (sale.product as any)?.categoryDetails?.name?.toLowerCase?.() ||
      categoryNameById
        .get((sale.product as any)?.category || "")
        ?.toLowerCase() ||
      "";
    return (
      productName.includes(normalizedSalesSearch) ||
      productCategory.includes(normalizedSalesSearch)
    );
  });
  const salesPageSize = 10;
  const salesTotalPages = Math.max(
    1,
    Math.ceil(filteredSales.length / salesPageSize),
  );
  const salesPageRows = filteredSales.slice(
    (salesPage - 1) * salesPageSize,
    salesPage * salesPageSize,
  );

  useEffect(() => {
    setSalesPage(1);
  }, [salesSearch]);

  useEffect(() => {
    setSalesPage((current) => Math.min(current, salesTotalPages));
  }, [salesTotalPages]);

  const filteredProductsForInventory = products.filter((product) => {
    if (!matchesProductAndCategory(product, normalizedInventorySearch))
      return false;
    if (inventoryBranchFilter === "all") return true;
    return getDisplayedBranchStock(product._id) > 0;
  });
  const filteredLowStockProducts = filteredProductsForInventory.filter(
    (product) =>
      getDisplayedBranchStock(product._id) <= product.minAlertQuantity,
  );
  const filteredOutOfStockProducts = filteredProductsForInventory.filter(
    (product) => getDisplayedBranchStock(product._id) <= 0,
  );
  const inventoryScopedProducts =
    inventoryBranchFilter === "all"
      ? products
      : products.filter((product) => getDisplayedBranchStock(product._id) > 0);
  const inventoryScopedUnits = inventoryScopedProducts.reduce(
    (sum, product) => sum + getDisplayedBranchStock(product._id),
    0,
  );
  const inventoryScopedLowStockCount = inventoryScopedProducts.filter(
    (product) =>
      getDisplayedBranchStock(product._id) <= product.minAlertQuantity,
  ).length;
  const filteredEntries = entries.filter((entry) => {
    const matchesBranchFilter =
      inventoryBranchFilter === "all" ||
      (inventoryBranchFilter === "none"
        ? !entry.branchId
        : entry.branchId === inventoryBranchFilter);

    if (!matchesBranchFilter) return false;

    if (!normalizedInventorySearch) return true;

    const productName = (
      productNameById.get(entry.productId) || ""
    ).toLowerCase();
    const branchName = (
      branchNameById.get(entry.branchId || "") || ""
    ).toLowerCase();
    return (
      productName.includes(normalizedInventorySearch) ||
      branchName.includes(normalizedInventorySearch)
    );
  });

  const avgSellingPrice =
    products.length > 0
      ? products.reduce(
          (sum, product) => sum + Number(product.sellingPrice || 0),
          0,
        ) / products.length
      : 0;

  const avgMarginPercent =
    products.length > 0
      ? products.reduce((sum, product) => {
          const start = Number(product.startingPrice || 0);
          const sell = Number(product.sellingPrice || 0);
          if (start <= 0) return sum;
          return sum + ((sell - start) / start) * 100;
        }, 0) / products.length
      : 0;

  const topStockValueProducts = products
    .map((product) => ({
      ...product,
      stockValue:
        Number(product.currentQuantity || 0) *
        Number(product.sellingPrice || 0),
    }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 8);

  const salesByProduct = useMemo(() => {
    const map = new Map<
      string,
      { productName: string; quantitySold: number; salesValue: number }
    >();
    sales.forEach((sale) => {
      const productId = String(sale.product?._id || "");
      if (!productId) return;
      const existing = map.get(productId) || {
        productName: sale.product?.name || "Unknown",
        quantitySold: 0,
        salesValue: 0,
      };
      existing.quantitySold += Number(sale.quantitySold || 0);
      existing.salesValue +=
        Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0);
      map.set(productId, existing);
    });
    return Array.from(map.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantitySold - a.quantitySold);
  }, [sales]);

  const selectedAnalyticsProduct = useMemo(
    () =>
      products.find((product) => product._id === selectedAnalyticsProductId) ||
      null,
    [products, selectedAnalyticsProductId],
  );

  const selectedProductSales = useMemo(() => {
    if (!selectedAnalyticsProductId) return [];
    return sales.filter(
      (sale) => String(sale.product?._id || "") === selectedAnalyticsProductId,
    );
  }, [sales, selectedAnalyticsProductId]);

  const selectedProductSalesInRange = useMemo(() => {
    if (!selectedProductSales.length) return [];

    const start = analyticsDateStart
      ? new Date(`${analyticsDateStart}T00:00:00.000`)
      : null;
    const end = analyticsDateEnd
      ? new Date(`${analyticsDateEnd}T23:59:59.999`)
      : null;

    return selectedProductSales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;
      return true;
    });
  }, [analyticsDateEnd, analyticsDateStart, selectedProductSales]);

  const selectedProductAnalytics = useMemo(() => {
    const allSalesTotalQty = sales.reduce(
      (sum, sale) => sum + Number(sale.quantitySold || 0),
      0,
    );
    const allSalesTotalRevenue = totalSalesValue;

    const totalQuantitySold = selectedProductSalesInRange.reduce(
      (sum, sale) => sum + Number(sale.quantitySold || 0),
      0,
    );
    const totalRevenueGenerated = selectedProductSalesInRange.reduce(
      (sum, sale) =>
        sum + Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0),
      0,
    );
    const totalCostBasis = selectedProductSalesInRange.reduce(
      (sum, sale) =>
        sum +
        Number(sale.quantitySold || 0) *
          Number(selectedAnalyticsProduct?.startingPrice || 0),
      0,
    );
    const grossProfit = totalRevenueGenerated - totalCostBasis;
    const grossMarginPercent =
      totalRevenueGenerated > 0
        ? (grossProfit / totalRevenueGenerated) * 100
        : 0;
    const averageSoldPrice =
      selectedProductSalesInRange.length > 0
        ? totalRevenueGenerated / totalQuantitySold
        : 0;
    const lowestSoldPrice =
      selectedProductSalesInRange.length > 0
        ? Math.min(
            ...selectedProductSalesInRange.map((sale) =>
              Number(sale.soldPrice || 0),
            ),
          )
        : 0;
    const highestSoldPrice =
      selectedProductSalesInRange.length > 0
        ? Math.max(
            ...selectedProductSalesInRange.map((sale) =>
              Number(sale.soldPrice || 0),
            ),
          )
        : 0;

    const clientMap = new Map<
      string,
      {
        name: string;
        number: string;
        location: string;
        units: number;
        revenue: number;
        visits: number;
      }
    >();

    const priceMap = new Map<
      number,
      { price: number; units: number; revenue: number; salesCount: number }
    >();

    selectedProductSalesInRange.forEach((sale) => {
      const clientName = sale.isWalkInClient
        ? "Walk-in Client"
        : sale.buyerName || "Unknown";
      const clientNumber = sale.buyerNumber || "";
      const clientLocation = sale.buyerLocation || "";
      const clientKey = `${clientName}|${clientNumber}|${clientLocation}`;
      const qty = Number(sale.quantitySold || 0);
      const revenue = qty * Number(sale.soldPrice || 0);

      const existingClient = clientMap.get(clientKey) || {
        name: clientName,
        number: clientNumber,
        location: clientLocation,
        units: 0,
        revenue: 0,
        visits: 0,
      };
      existingClient.units += qty;
      existingClient.revenue += revenue;
      existingClient.visits += 1;
      clientMap.set(clientKey, existingClient);

      const price = Number(sale.soldPrice || 0);
      const existingPrice = priceMap.get(price) || {
        price,
        units: 0,
        revenue: 0,
        salesCount: 0,
      };
      existingPrice.units += qty;
      existingPrice.revenue += revenue;
      existingPrice.salesCount += 1;
      priceMap.set(price, existingPrice);
    });

    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const priceBreakdown = Array.from(priceMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const productRankByRevenue = [...salesByProduct].sort(
      (a, b) => b.salesValue - a.salesValue,
    );
    const productRankByQuantity = [...salesByProduct].sort(
      (a, b) => b.quantitySold - a.quantitySold,
    );
    const revenueRank =
      productRankByRevenue.findIndex(
        (row) => row.productId === selectedAnalyticsProductId,
      ) + 1;
    const quantityRank =
      productRankByQuantity.findIndex(
        (row) => row.productId === selectedAnalyticsProductId,
      ) + 1;
    const revenueShare =
      allSalesTotalRevenue > 0
        ? (totalRevenueGenerated / allSalesTotalRevenue) * 100
        : 0;
    const quantityShare =
      allSalesTotalQty > 0 ? (totalQuantitySold / allSalesTotalQty) * 100 : 0;

    const comparisonRows = productRankByRevenue.slice(0, 5).map((row) => ({
      name: row.productName,
      revenue: Number(row.salesValue || 0),
      quantity: Number(row.quantitySold || 0),
      isSelected: row.productId === selectedAnalyticsProductId,
    }));

    return {
      totalQuantitySold,
      totalRevenueGenerated,
      totalCostBasis,
      grossProfit,
      grossMarginPercent,
      averageSoldPrice,
      lowestSoldPrice,
      highestSoldPrice,
      revenueShare,
      quantityShare,
      revenueRank: revenueRank || null,
      quantityRank: quantityRank || null,
      topClients,
      priceBreakdown,
      comparisonRows,
    };
  }, [
    sales,
    selectedAnalyticsProductId,
    selectedProductSalesInRange,
    salesByProduct,
    totalSalesValue,
    selectedAnalyticsProduct,
  ]);

  const selectedProductHistory = useMemo(() => {
    return [...selectedProductSalesInRange]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 12);
  }, [selectedProductSalesInRange]);

  const selectedProductTrendData = useMemo(() => {
    const monthlyMap = new Map<
      string,
      { month: string; units: number; revenue: number; profit: number }
    >();
    selectedProductSalesInRange.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleString(undefined, {
        month: "short",
        year: "numeric",
      });
      const qty = Number(sale.quantitySold || 0);
      const revenue = qty * Number(sale.soldPrice || 0);
      const profit =
        qty *
        (Number(sale.soldPrice || 0) -
          Number(selectedAnalyticsProduct?.startingPrice || 0));

      const existing = monthlyMap.get(key) || {
        month: monthLabel,
        units: 0,
        revenue: 0,
        profit: 0,
      };
      existing.units += qty;
      existing.revenue += revenue;
      existing.profit += profit;
      monthlyMap.set(key, existing);
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => ({
        month: value.month,
        units: value.units,
        revenue: Number(value.revenue.toFixed(2)),
        profit: Number(value.profit.toFixed(2)),
      }));
  }, [selectedAnalyticsProduct?.startingPrice, selectedProductSalesInRange]);

  const projectionRows = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 30);

    const salesWindowMap = new Map<string, number>();
    sales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      if (saleDate < windowStart || saleDate > now) return;
      const productId = String(sale.product?._id || "");
      if (!productId) return;
      salesWindowMap.set(
        productId,
        (salesWindowMap.get(productId) || 0) + Number(sale.quantitySold || 0),
      );
    });

    return products
      .map((product) => {
        const sold30 = salesWindowMap.get(product._id) || 0;
        const projected30Demand = sold30;
        const projectedAfter30 =
          Number(product.currentQuantity || 0) - projected30Demand;
        const dailyRate = sold30 / 30;
        const daysOfCover =
          dailyRate > 0
            ? Number(product.currentQuantity || 0) / dailyRate
            : null;

        return {
          productId: product._id,
          productName: product.name,
          currentStock: Number(product.currentQuantity || 0),
          sold30,
          projected30Demand,
          projectedAfter30,
          daysOfCover,
        };
      })
      .sort((a, b) => a.projectedAfter30 - b.projectedAfter30)
      .slice(0, 10);
  }, [products, sales]);

  const outsourcedStats = useMemo(() => {
    const productMeta = new Map(
      products.map((product) => [
        product._id,
        {
          name: product.name,
          sellingPrice: Number(product.sellingPrice || 0),
          currentQuantity: Number(product.currentQuantity || 0),
          isOutsourced: Boolean(product.isOutsourced),
        },
      ]),
    );

    const outsourcedProductIds = new Set(
      products
        .filter((product) => Boolean(product.isOutsourced))
        .map((product) => product._id),
    );

    const isOutsourcedItem = (item: {
      productId?: string;
      productName?: string;
      isOutsourced?: boolean;
    }) => {
      if (item.isOutsourced) return true;
      const matchedProduct = item.productId
        ? productMeta.get(String(item.productId))
        : undefined;
      return Boolean(matchedProduct?.isOutsourced);
    };

    const outsourcedEntries = entries.filter((entry) =>
      Boolean(
        entry.isOutsourced || String(entry.outsourcedCompany || "").trim(),
      ),
    );
    const outsourcedSuppliers = new Set(
      outsourcedEntries
        .map((entry) => String(entry.outsourcedCompany || "").trim())
        .filter(Boolean),
    );

    const supplierBreakdown = new Map<
      string,
      { company: string; entries: number; quantity: number }
    >();
    outsourcedEntries.forEach((entry) => {
      const company =
        String(entry.outsourcedCompany || "").trim() || "Unspecified";
      const current = supplierBreakdown.get(company) || {
        company,
        entries: 0,
        quantity: 0,
      };
      current.entries += 1;
      current.quantity += Number(entry.quantityAdded || 0);
      supplierBreakdown.set(company, current);
    });

    const outsourcedQuotationItems = quotations.flatMap((quotation) =>
      (quotation.items || [])
        .filter((item) => isOutsourcedItem(item))
        .map((item) => ({
          ...item,
          quotationId: quotation._id,
          status: quotation.status,
        })),
    );

    const outsourcedInvoiceItems = invoices.flatMap((invoice) =>
      (invoice.items || [])
        .filter((item) => isOutsourcedItem(item))
        .map((item) => ({ ...item, invoiceId: invoice._id })),
    );

    const productMap = new Map<
      string,
      { name: string; quantity: number; value: number }
    >();

    const outsourcedSalesMap = new Map<
      string,
      { name: string; quantitySold: number; salesValue: number }
    >();
    sales.forEach((sale) => {
      const productId = String(sale.product?._id || "");
      if (!productId || !outsourcedProductIds.has(productId)) return;
      const current = outsourcedSalesMap.get(productId) || {
        name: sale.product?.name || "Unknown",
        quantitySold: 0,
        salesValue: 0,
      };
      current.quantitySold += Number(sale.quantitySold || 0);
      current.salesValue +=
        Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0);
      outsourcedSalesMap.set(productId, current);
    });

    outsourcedEntries.forEach((entry) => {
      const key = entry.productId || "unknown";
      const product = productMeta.get(String(entry.productId));
      const existing = productMap.get(key) || {
        name: product?.name || String(entry.productId),
        quantity: 0,
        value: 0,
      };
      const qty = Number(entry.quantityAdded || 0);
      existing.quantity += qty;
      existing.value += qty * Number(product?.sellingPrice || 0);
      productMap.set(key, existing);
    });

    outsourcedQuotationItems.forEach((item) => {
      const key = item.productId || item.productName || "unknown";
      const existing = productMap.get(key) || {
        name: item.productName || "Unknown",
        quantity: 0,
        value: 0,
      };
      existing.quantity += Number(item.quantity || 0);
      existing.value += Number(item.lineTotal || 0);
      productMap.set(key, existing);
    });

    const topOutsourcedProducts = Array.from(productMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const outsourcedSalesRows = Array.from(outsourcedSalesMap.entries())
      .map(([productId, row]) => ({ productId, ...row }))
      .sort((a, b) => b.salesValue - a.salesValue);

    const outsourcedSalesValue = outsourcedSalesRows.reduce(
      (sum, row) => sum + row.salesValue,
      0,
    );
    const outsourcedSalesUnits = outsourcedSalesRows.reduce(
      (sum, row) => sum + row.quantitySold,
      0,
    );
    const contributionToTotalSalesPercent =
      totalSalesValue > 0 ? (outsourcedSalesValue / totalSalesValue) * 100 : 0;

    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const sales30Map = new Map<string, number>();
    sales.forEach((sale) => {
      const productId = String(sale.product?._id || "");
      if (!productId || !outsourcedProductIds.has(productId)) return;
      const saleDate = new Date(sale.createdAt);
      if (saleDate < start30 || saleDate > now) return;
      sales30Map.set(
        productId,
        (sales30Map.get(productId) || 0) + Number(sale.quantitySold || 0),
      );
    });

    const importRecommendations = Array.from(outsourcedProductIds)
      .map((productId) => {
        const info = productMeta.get(productId);
        if (!info) return null;
        const sold30 = sales30Map.get(productId) || 0;
        const projectedAfter30 = info.currentQuantity - sold30;
        const dailyRate = sold30 / 30;
        const daysOfCover =
          dailyRate > 0 ? info.currentQuantity / dailyRate : null;

        const shouldRecommend =
          sold30 >= 3 &&
          (projectedAfter30 < 0 || (daysOfCover !== null && daysOfCover < 20));
        if (!shouldRecommend) return null;

        const reason =
          projectedAfter30 < 0
            ? "Demand exceeds projected stock in 30 days"
            : "Low stock cover for current demand";

        return {
          productId,
          name: info.name,
          sold30,
          currentStock: info.currentQuantity,
          projectedAfter30,
          daysOfCover,
          reason,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => a.projectedAfter30 - b.projectedAfter30)
      .slice(0, 8);

    return {
      outsourcedStockEntriesCount: outsourcedEntries.length,
      outsourcedUnitsAdded: outsourcedEntries.reduce(
        (sum, entry) => sum + Number(entry.quantityAdded || 0),
        0,
      ),
      outsourcedSuppliersCount: outsourcedSuppliers.size,
      outsourcedProductsCount: outsourcedProductIds.size,
      quotationsWithOutsourced: quotations.filter((q) =>
        (q.items || []).some((i) => isOutsourcedItem(i)),
      ).length,
      outsourcedQuotationItemsCount: outsourcedQuotationItems.length,
      outsourcedInvoiceItemsCount: outsourcedInvoiceItems.length,
      outsourcedValue: outsourcedQuotationItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0,
      ),
      outsourcedSalesValue,
      outsourcedSalesUnits,
      contributionToTotalSalesPercent,
      leadingOutsourcedProduct: outsourcedSalesRows[0] || null,
      importRecommendations,
      supplierBreakdown: Array.from(supplierBreakdown.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
      topOutsourcedProducts,
    };
  }, [entries, invoices, products, quotations, sales, totalSalesValue]);

  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredHistoryEntries = filteredEntries.filter((entry) => {
    if (!normalizedHistorySearch) return true;
    const productName = (
      productNameById.get(entry.productId) ||
      entry.productId ||
      ""
    ).toLowerCase();
    const branchName = (
      branchNameById.get(entry.branchId || "") ||
      entry.branchId ||
      ""
    ).toLowerCase();
    const note = String(entry.note || "").toLowerCase();
    const company = String(entry.outsourcedCompany || "").toLowerCase();
    return (
      productName.includes(normalizedHistorySearch) ||
      branchName.includes(normalizedHistorySearch) ||
      note.includes(normalizedHistorySearch) ||
      company.includes(normalizedHistorySearch)
    );
  });
  const filteredHistorySales = filteredSales.filter((sale) => {
    if (!normalizedHistorySearch) return true;
    const productName = (sale.product?.name || "").toLowerCase();
    const buyer = (
      sale.isWalkInClient ? "Walk-in Client" : sale.buyerName || ""
    ).toLowerCase();
    const soldBy = sale.soldByUser
      ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`.toLowerCase()
      : "";
    const receipt = String(sale.receiptNumber || "").toLowerCase();
    return (
      productName.includes(normalizedHistorySearch) ||
      buyer.includes(normalizedHistorySearch) ||
      soldBy.includes(normalizedHistorySearch) ||
      receipt.includes(normalizedHistorySearch)
    );
  });
  const sortedHistoryEntries = useMemo(() => {
    return [...filteredHistoryEntries].sort((a, b) => {
      const aDate = new Date(a.entryDate || a.createdAt).getTime();
      const bDate = new Date(b.entryDate || b.createdAt).getTime();
      const aProduct = (
        productNameById.get(a.productId) || a.productId
      ).toLowerCase();
      const bProduct = (
        productNameById.get(b.productId) || b.productId
      ).toLowerCase();
      const aQty = Number(a.quantityAdded || 0);
      const bQty = Number(b.quantityAdded || 0);
      const aBuyer = String(a.note || "").toLowerCase();
      const bBuyer = String(b.note || "").toLowerCase();
      switch (historySort) {
        case "date-asc":
          return aDate - bDate;
        case "product-asc":
          return aProduct.localeCompare(bProduct);
        case "product-desc":
          return bProduct.localeCompare(aProduct);
        case "qty-asc":
          return aQty - bQty;
        case "qty-desc":
          return bQty - aQty;
        case "buyer-asc":
          return aBuyer.localeCompare(bBuyer);
        case "buyer-desc":
          return bBuyer.localeCompare(aBuyer);
        case "date-desc":
        default:
          return bDate - aDate;
      }
    });
  }, [filteredHistoryEntries, historySort, productNameById]);
  const sortedHistorySales = useMemo(() => {
    return [...filteredHistorySales].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      const aProduct = (a.product?.name || "").toLowerCase();
      const bProduct = (b.product?.name || "").toLowerCase();
      const aQty = Number(a.quantitySold || 0);
      const bQty = Number(b.quantitySold || 0);
      const aBuyer = (
        a.isWalkInClient ? "Walk-in Client" : a.buyerName || ""
      ).toLowerCase();
      const bBuyer = (
        b.isWalkInClient ? "Walk-in Client" : b.buyerName || ""
      ).toLowerCase();
      switch (historySort) {
        case "date-asc":
          return aDate - bDate;
        case "product-asc":
          return aProduct.localeCompare(bProduct);
        case "product-desc":
          return bProduct.localeCompare(aProduct);
        case "qty-asc":
          return aQty - bQty;
        case "qty-desc":
          return bQty - aQty;
        case "buyer-asc":
          return aBuyer.localeCompare(bBuyer);
        case "buyer-desc":
          return bBuyer.localeCompare(aBuyer);
        case "date-desc":
        default:
          return bDate - aDate;
      }
    });
  }, [filteredHistorySales, historySort]);
  const historyPageSize = 10;
  const historyTotalPages = Math.max(
    1,
    Math.ceil(
      Math.max(sortedHistoryEntries.length, sortedHistorySales.length) /
        historyPageSize,
    ),
  );
  const historyEntriesPage = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return sortedHistoryEntries.slice(start, start + historyPageSize);
  }, [historyPage, sortedHistoryEntries]);
  const historySalesPage = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return sortedHistorySales.slice(start, start + historyPageSize);
  }, [historyPage, sortedHistorySales]);
  const normalizedOutsourcedSearch = outsourcedSearch.trim().toLowerCase();
  const filteredOutsourcedProducts =
    outsourcedStats.topOutsourcedProducts.filter((product) => {
      if (!normalizedOutsourcedSearch) return true;
      return product.name.toLowerCase().includes(normalizedOutsourcedSearch);
    });
  const filteredOutsourcedRecommendations =
    outsourcedStats.importRecommendations.filter((item) => {
      if (!normalizedOutsourcedSearch) return true;
      return (
        item.name.toLowerCase().includes(normalizedOutsourcedSearch) ||
        item.reason.toLowerCase().includes(normalizedOutsourcedSearch)
      );
    });
  const filteredOutsourcedSuppliers = outsourcedStats.supplierBreakdown.filter(
    (supplier) => {
      if (!normalizedOutsourcedSearch) return true;
      return supplier.company
        .toLowerCase()
        .includes(normalizedOutsourcedSearch);
    },
  );
  const sortedOutsourcedProducts = useMemo(() => {
    return [...filteredOutsourcedProducts].sort((a, b) => {
      switch (outsourcedSort) {
        case "value-asc":
          return a.value - b.value;
        case "quantity-desc":
          return b.quantity - a.quantity;
        case "quantity-asc":
          return a.quantity - b.quantity;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "value-desc":
        default:
          return b.value - a.value;
      }
    });
  }, [filteredOutsourcedProducts, outsourcedSort]);
  const outsourcedPageSize = 8;
  const outsourcedTotalPages = Math.max(
    1,
    Math.ceil(
      Math.max(
        sortedOutsourcedProducts.length,
        filteredOutsourcedRecommendations.length,
        filteredOutsourcedSuppliers.length,
      ) / outsourcedPageSize,
    ),
  );
  const outsourcedProductsPage = useMemo(() => {
    const start = (outsourcedPage - 1) * outsourcedPageSize;
    return sortedOutsourcedProducts.slice(start, start + outsourcedPageSize);
  }, [outsourcedPage, sortedOutsourcedProducts]);
  const outsourcedRecommendationsPage = useMemo(() => {
    const start = (outsourcedPage - 1) * outsourcedPageSize;
    return filteredOutsourcedRecommendations.slice(
      start,
      start + outsourcedPageSize,
    );
  }, [filteredOutsourcedRecommendations, outsourcedPage]);
  const outsourcedSuppliersPage = useMemo(() => {
    const start = (outsourcedPage - 1) * outsourcedPageSize;
    return filteredOutsourcedSuppliers.slice(start, start + outsourcedPageSize);
  }, [filteredOutsourcedSuppliers, outsourcedPage]);

  const escapeCsv = (value: string | number | null | undefined) => {
    const stringValue = String(value ?? "");
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportAsCsv = (
    fileName: string,
    headersRow: string[],
    rows: Array<Array<string | number | null | undefined>>,
  ) => {
    const csv = [
      headersRow.join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizeInputValue = (value?: string) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ");

  const createCategory = async () => {
    const cleanedName = normalizeInputValue(categoryForm.name);
    const cleanedDescription = normalizeInputValue(categoryForm.description);

    if (!cleanedName) {
      toast({
        title: "Category Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (categoryMode === "sub" && categoryParentId === "none") {
      toast({
        title: "Category Error",
        description: "Please select a parent category for the sub category",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/stock/categories`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...categoryForm,
          name: cleanedName,
          description: cleanedDescription || undefined,
          parentId:
            categoryMode === "sub" && categoryParentId !== "none"
              ? categoryParentId
              : null,
        }),
      });

      const result = await parseResponse<{
        success: boolean;
        message?: string;
      }>(response);
      if (!result.response.ok) {
        toast({
          title: "Category Error",
          description: result.errorMessage || "Failed to create category",
          variant: "destructive",
        });
        return;
      }

      setCategoryForm({ name: "", description: "" });
      setCategoryMode("main");
      setCategoryParentId("none");
      toast({ title: "Success", description: "Category created successfully" });
      await fetchAll({ silent: true });
    } catch (error: any) {
      toast({
        title: "Category Error",
        description: error?.message || "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const createProduct = async () => {
    if (
      branches.length > 0 &&
      Number(productForm.currentQuantity || 0) > 0 &&
      !productBranchId
    ) {
      toast({
        title: "Branch required",
        description: "Select the branch for initial stock.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();

    // Explicitly add fields to avoid double-appending from productForm
    formData.append("name", productForm.name);
    formData.append("category", productForm.category);
    formData.append("buyingPrice", String(productForm.startingPrice));
    formData.append("sellingPrice", String(productForm.sellingPrice));
    formData.append("minAlertQuantity", String(productForm.minAlertQuantity));
    formData.append(
      "currentQuantity",
      String(productForm.currentQuantity || 0),
    );
    formData.append("isOutsourced", String(productForm.isOutsourced));
    formData.append("expiryEnabled", String(productForm.expiryEnabled));
    formData.append("expiryDate", productForm.expiryDate || "");
    formData.append(
      "expiryReminderDays",
      String(productForm.expiryReminderDays || 0),
    );
    formData.append("productType", productForm.productType);
    formData.append("isRecurring", String(productForm.isRecurring));
    formData.append("intervalDays", String(productForm.intervalDays || 0));
    formData.append("manufacturer", productForm.manufacturer || "");
    formData.append("branchId", productBranchId || "");
    formData.append("description", productForm.description || "");

    if (productForm.assignedUsers?.length > 0) {
      productForm.assignedUsers.forEach((userId) =>
        formData.append("assignedUsers[]", userId),
      );
    }

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    const response = await fetch(`${API_URL}/api/stock/products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const result = await parseResponse<{ success: boolean; message?: string }>(
      response,
    );
    if (!result.response.ok) {
      toast({
        title: "Product Error",
        description: result.errorMessage || "Failed to create product",
        variant: "destructive",
      });
      return;
    }
    setProductForm({
      name: "",
      category: "",
      startingPrice: "",
      sellingPrice: "",
      minAlertQuantity: "",
      currentQuantity: "0",
      assignedUsers: [],
      isOutsourced: false,
      expiryEnabled: false,
      expiryDate: "",
      expiryReminderDays: "7",
      productType: "physical",
      isRecurring: false,
      intervalDays: "",
      manufacturer: "none",
      description: "",
    });
    setSelectedImage(null);
    setProductBranchId("");
    toast({ title: "Success", description: "Product created" });
    fetchAll({ silent: true });
  };

  const addStock = async () => {
    const response = await fetch(`${API_URL}/api/stock/add`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: stockForm.productId,
        quantityAdded: Number(stockForm.quantityAdded),
        note: stockForm.note,
        isOutsourced: stockForm.isOutsourced,
        outsourcedCompany: stockForm.isOutsourced
          ? stockForm.outsourcedCompany
          : undefined,
        expiryEnabled: stockForm.expiryEnabled,
        expiryDate: stockForm.expiryEnabled ? stockForm.expiryDate : undefined,
        expiryReminderDays: Number(stockForm.expiryReminderDays || 0),
        branchId: stockForm.branchId || undefined,
        entryDate:
          stockForm.backdateEnabled && stockForm.entryDate
            ? stockForm.entryDate
            : undefined,
      }),
    });
    const result = await parseResponse<{ success: boolean; message?: string }>(
      response,
    );
    if (!result.response.ok) {
      toast({
        title: "Stock Error",
        description: result.errorMessage || "Failed to add stock",
        variant: "destructive",
      });
      return;
    }
    setStockForm({
      productId: "",
      quantityAdded: "",
      note: "",
      outsourcedOnly: false,
      isOutsourced: false,
      outsourcedCompany: "",
      expiryEnabled: false,
      expiryDate: "",
      expiryReminderDays: "7",
      branchId: "",
      backdateEnabled: false,
      entryDate: "",
    });
    toast({ title: "Success", description: "Stock added" });
    fetchAll({ silent: true });
  };

  const addSaleItem = () => {
    if (!saleForm.productId) {
      toast({
        title: "Item Error",
        description: "Select a product before adding",
        variant: "destructive",
      });
      return;
    }
    const qty = Number(saleForm.quantitySold || 0);
    const price = Number(saleForm.soldPrice || 0);
    if (!qty || qty <= 0) {
      toast({
        title: "Item Error",
        description: "Enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast({
        title: "Item Error",
        description: "Enter a valid price",
        variant: "destructive",
      });
      return;
    }
    const product = products.find((p) => p._id === saleForm.productId);
    const item: QuotationItem = {
      productId: saleForm.productId,
      productName: productNameById.get(saleForm.productId) || "",
      quantity: qty,
      unitPrice: price,
      lineTotal: qty * price,
      imageUrl: product?.imageUrl,
      showImageOnQuote: false,
    };
    setSaleItems((prev) => [...prev, item]);
    setSaleForm((prev) => ({
      ...prev,
      productId: "",
      quantitySold: "",
      soldPrice: "",
    }));
    setSaleProductSearch("");
    setSaleProductOptionsOpen(false);
    setProductAreaCollapsed(true);
    setTimeout(() => saleProductInputRef.current?.focus(), 30);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSaleItem = (index: number, fields: Partial<QuotationItem>) => {
    setSaleItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const updated = { ...it, ...fields };
        const qty = Number(updated.quantity || 0);
        const price = Number(updated.unitPrice || 0);
        return { ...updated, lineTotal: qty * price };
      }),
    );
  };

  const startNewItem = () => {
    setSaleForm((prev) => ({
      ...prev,
      productId: "",
      quantitySold: "",
      soldPrice: "",
    }));
    setSaleProductSearch("");
    setSaleProductOptionsOpen(false);
    setTimeout(() => saleProductInputRef.current?.focus(), 30);
  };

  const saleSubTotal = saleItems.reduce(
    (sum, it) => sum + Number(it.lineTotal || 0),
    0,
  );

  const recordSale = async () => {
    const itemsToRecord =
      saleItems.length > 0
        ? saleItems
        : saleForm.productId
          ? [
              {
                productId: saleForm.productId,
                quantity: Number(saleForm.quantitySold || 0),
                unitPrice: Number(saleForm.soldPrice || 0),
                productName: "",
                lineTotal: 0,
              },
            ]
          : [];

    if (itemsToRecord.length === 0) {
      toast({
        title: "Sale Error",
        description: "Add at least one product to record a sale",
        variant: "destructive",
      });
      return;
    }

    try {
      const invoiceItems = itemsToRecord.map((item) => ({
        productId: item.productId,
        productName: productNameById.get(item.productId) || "",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.quantity || 0) * Number(item.unitPrice || 0),
        isOutsourced: item.isOutsourced || false,
      }));

      const subTotal = invoiceItems.reduce(
        (s, it) => s + Number(it.lineTotal || 0),
        0,
      );

      const invoiceClient = saleForm.isWalkInClient
        ? { name: "Walk-in Client", number: "WALK-IN", location: "Walk-in" }
        : {
            name: saleForm.buyerName.trim() || "Customer",
            number: saleForm.buyerNumber.trim() || "N/A",
            location: saleForm.buyerLocation.trim() || "N/A",
          };

      const invoicePayload = {
        clientName: invoiceClient.name,
        clientNumber: invoiceClient.number,
        clientLocation: invoiceClient.location,
        client: invoiceClient,
        items: invoiceItems,
        subTotal,
      };

      const invRes = await fetch(`${API_URL}/api/stock/invoices/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(invoicePayload),
      });
      const invJson = await invRes.json();
      if (invRes.ok) {
        toast({
          title: "Invoice Created",
          description: `Invoice ${invJson.data?.invoiceNumber || "created"}`,
        });
        setSaleForm({
          productId: "",
          quantitySold: "",
          soldPrice: "",
          isSalesCompany: false,
          salesEmployeeId: "",
          isWalkInClient: false,
          buyerName: "",
          buyerNumber: "",
          buyerLocation: "",
        });
        setSaleItems([]);
        setSaleProductSearch("");
        setSaleProductOptionsOpen(true);
        setProductAreaCollapsed(false);
        setSaleFormOpen(false);
        fetchAll({ silent: true });
      } else {
        toast({
          title: "Invoice Error",
          description: invJson.message || "Failed to create invoice",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Invoice Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const downloadInvoicePdf = async (invoice: Invoice) => {
    if (!invoice.client || !invoice.invoiceNumber) {
      toast({
        title: "Error",
        description: "Invoice data is incomplete",
        variant: "destructive",
      });
      return;
    }

    try {
      const brandingRes = await fetch(`${API_URL}/api/company/branding`, {
        headers,
      });
      if (brandingRes.ok) {
        const brandingData = await brandingRes.json();
        setBranding(brandingData.data || {});
      }

      const settingsRes = await fetch(
        `${API_URL}/api/company/invoice-settings`,
        { headers },
      );
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setInvoiceSettings(settingsData.data || {});
      }

      const { generateInvoicePdf } = await import("@/lib/stock-document-pdf");

      const doc = generateInvoicePdf({
        invoiceNumber: invoice.invoiceNumber,
        deliveryNoteNumber: invoice.deliveryNoteNumber || "",
        createdAt: invoice.createdAt,
        client: invoice.client,
        items: invoice.items,
        subTotal: invoice.subTotal,
        branding,
        invoiceSettings,
        preparedBy: "System",
        watermarkText:
          invoice.status === "paid"
            ? "PAID"
            : invoice.status === "cancelled"
              ? "CANCELLED"
              : undefined,
        autoSave: false,
      });

      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
      toast({ title: "Success", description: "Invoice downloaded" });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
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

  interface StampOption {
    _id: string;
    name: string;
  }

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

  const handleDownloadInvoicePdfWithStamp = async (invoice: Invoice) => {
    const { preparedBy, preparedBySignature, stampPref } =
      await resolvePreparedBy();
    const stampSelection = stampPref ? await promptStampSelection() : null;

    if (!branding.primaryColor) {
      const brandingRes = await fetch(`${API_URL}/api/company/branding`, {
        headers,
      });
      if (brandingRes.ok) {
        const brandingData = await brandingRes.json();
        setBranding(brandingData.data || {});
      }
    }

    if (!invoiceSettings || Object.keys(invoiceSettings).length === 0) {
      const settingsRes = await fetch(
        `${API_URL}/api/company/invoice-settings`,
        { headers },
      );
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setInvoiceSettings(settingsData.data || {});
      }
    }

    const { generateInvoicePdf, applyStampToPdf } = await import(
      "@/lib/stock-document-pdf"
    );

    const doc = generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      deliveryNoteNumber: invoice.deliveryNoteNumber || "",
      quotationNumber: invoice.quotationNumber || "",
      createdAt: invoice.createdAt,
      client: invoice.client || { name: "Unknown", number: "", location: "" },
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
    toast({ title: "Success", description: "Invoice downloaded" });
  };

  const downloadSaleInvoice = async (sale: Sale) => {
    try {
      if (sale.invoiceId) {
        const invoiceRes = await fetch(
          `${API_URL}/api/stock/invoices/${sale.invoiceId}`,
          { headers },
        );
        if (invoiceRes.ok) {
          const invoiceData = await invoiceRes.json();
          const invoice = invoiceData.data || invoiceData;
          if (invoice) {
            await handleDownloadInvoicePdfWithStamp(invoice);
            return;
          }
        }
      }

      const invoicesRes = await fetch(`${API_URL}/api/stock/invoices`, {
        headers,
      });
      if (!invoicesRes.ok) {
        toast({
          title: "Error",
          description: "Failed to fetch invoices",
          variant: "destructive",
        });
        return;
      }

      const invoicesData = await invoicesRes.json();
      const allInvoices: Invoice[] = invoicesData.data || [];

      const clientName = sale.isWalkInClient
        ? "Walk-in Client"
        : sale.buyerName || "Walk-in Client";
      const clientNumber = sale.isWalkInClient ? "" : sale.buyerNumber || "";
      const clientLocation = sale.isWalkInClient
        ? ""
        : sale.buyerLocation || "";

      const matchingInvoice = allInvoices.find((invoice) => {
        if (!invoice.client) return false;

        const nameMatch = invoice.client.name === clientName;
        const numberMatch = invoice.client.number === clientNumber;
        const locationMatch = invoice.client.location === clientLocation;
        const invoiceDate = new Date(invoice.createdAt).getTime();
        const saleDate = new Date(sale.createdAt).getTime();
        const dateWithin24Hours =
          Math.abs(invoiceDate - saleDate) < 24 * 60 * 60 * 1000;

        return nameMatch && numberMatch && locationMatch && dateWithin24Hours;
      });

      if (matchingInvoice) {
        await handleDownloadInvoicePdfWithStamp(matchingInvoice);
      } else {
        toast({
          title: "Not Found",
          description:
            "Invoice for this sale not found. It may not have been created yet.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoadingSkeleton title="Loading inventory manager" rows={8} />;
  }

  return (
    <div className="space-y-6">
      {view === "add-inventory" && (
        <>
          <h1 className="text-2xl font-bold">Add Inventory</h1>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={categoryMode === "main" ? "default" : "outline"}
                    onClick={() => {
                      setCategoryMode("main");
                      setCategoryParentId("none");
                    }}
                  >
                    Add Category
                  </Button>
                  <Button
                    type="button"
                    variant={categoryMode === "sub" ? "default" : "outline"}
                    onClick={() => setCategoryMode("sub")}
                  >
                    Add a Sub Category
                  </Button>
                </div>
                {categoryMode === "sub" && (
                  <div className="space-y-2">
                    <Label>Parent Category</Label>
                    <Select
                      value={categoryParentId}
                      onValueChange={setCategoryParentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Select a parent category
                        </SelectItem>
                        {getCreatableParentCategories().map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {getCategoryPath(category._id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={createCategory}>
                  {categoryMode === "sub"
                    ? "Create Sub Category"
                    : "Add Category"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Product</Label>
                  <Select
                    value={stockForm.productId}
                    onValueChange={(value) =>
                      setStockForm((prev) => ({ ...prev, productId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter((product) =>
                          stockForm.outsourcedOnly
                            ? Boolean(product.isOutsourced)
                            : true,
                        )
                        .map((product) => (
                          <SelectItem key={product._id} value={product._id}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.outsourcedOnly}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        outsourcedOnly: Boolean(value),
                        productId: "",
                      }))
                    }
                  />
                  <span>Outsourced products only</span>
                </label>
                <div>
                  <Label>Quantity Added</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stockForm.quantityAdded}
                    onChange={(event) =>
                      setStockForm((prev) => ({
                        ...prev,
                        quantityAdded: event.target.value,
                      }))
                    }
                  />
                </div>
                {branches.length > 0 && (
                  <div>
                    <Label>Branch (Optional)</Label>
                    <Select
                      value={stockForm.branchId}
                      onValueChange={(value) =>
                        setStockForm((prev) => ({
                          ...prev,
                          branchId: value === "none" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          -- No specific branch --
                        </SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch._id} value={branch._id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Note</Label>
                  <Input
                    value={stockForm.note}
                    onChange={(event) =>
                      setStockForm((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.backdateEnabled}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        backdateEnabled: Boolean(value),
                        entryDate: value ? prev.entryDate : "",
                      }))
                    }
                  />
                  <span>Backdate this stock entry</span>
                </label>
                {stockForm.backdateEnabled && (
                  <div>
                    <Label>Backdate</Label>
                    <Input
                      type="date"
                      value={stockForm.entryDate}
                      onChange={(event) =>
                        setStockForm((prev) => ({
                          ...prev,
                          entryDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.isOutsourced}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        isOutsourced: Boolean(value),
                        outsourcedCompany: value ? prev.outsourcedCompany : "",
                      }))
                    }
                  />
                  <span>This stock entry is outsourced</span>
                </label>
                {stockForm.isOutsourced && (
                  <div>
                    <Label>Outsourced From Company</Label>
                    <Input
                      placeholder="Enter supplier / local company"
                      value={stockForm.outsourcedCompany}
                      onChange={(event) =>
                        setStockForm((prev) => ({
                          ...prev,
                          outsourcedCompany: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.expiryEnabled}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        expiryEnabled: Boolean(value),
                        expiryDate: value ? prev.expiryDate : "",
                      }))
                    }
                  />
                  <span>Expiry checker for this stock entry</span>
                </label>
                {stockForm.expiryEnabled && (
                  <>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={stockForm.expiryDate}
                        onChange={(event) =>
                          setStockForm((prev) => ({
                            ...prev,
                            expiryDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Reminder Days Before Expiry</Label>
                      <Input
                        type="number"
                        min="0"
                        value={stockForm.expiryReminderDays}
                        onChange={(event) =>
                          setStockForm((prev) => ({
                            ...prev,
                            expiryReminderDays: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                <Button onClick={addStock}>Add Stock Entry</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Download sample CSV, fill rows and upload. Required columns:{" "}
                <strong>
                  name, category, buyingPrice, sellingPrice, currentQuantity
                </strong>
                .
                {branches.length > 0
                  ? " Select a branch below when uploading stock quantities."
                  : ""}
              </p>
              {branches.length > 0 ? (
                <div className="max-w-sm">
                  <Label>Branch for uploaded stock</Label>
                  <Select
                    value={bulkProductBranchId || "none"}
                    onValueChange={(value) =>
                      setBulkProductBranchId(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <a
                  className="text-sm text-primary underline"
                  href="/static/sample-products.csv"
                  download
                >
                  Download sample CSV
                </a>
                <input
                  ref={productsFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    if (branches.length > 0 && !bulkProductBranchId) {
                      toast({
                        title: "Branch required",
                        description:
                          "Select the branch where this stock should be recorded.",
                        variant: "destructive",
                      });
                      if (productsFileRef.current)
                        productsFileRef.current.value = "";
                      return;
                    }
                    try {
                      setUploadingProducts(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      if (bulkProductBranchId)
                        formData.append("branchId", bulkProductBranchId);
                      const response = await fetch(
                        `${API_URL}/api/stock/products/bulk`,
                        {
                          method: "POST",
                          headers: { Authorization: `Bearer ${getToken()}` },
                          body: formData,
                        },
                      );
                      const res = await parseResponse<{
                        success: boolean;
                        message?: string;
                      }>(response);
                      if (!res.response.ok)
                        throw new Error(res.errorMessage || "Upload failed");
                      toast({ title: res.data?.message || "Upload complete" });
                      await fetchAll({ silent: true });
                    } catch (err: any) {
                      toast({
                        title: "Upload failed",
                        description: err?.message || String(err),
                        variant: "destructive",
                      });
                    } finally {
                      setUploadingProducts(false);
                      if (productsFileRef.current)
                        productsFileRef.current.value = "";
                    }
                  }}
                />
                <Button
                  onClick={() => productsFileRef.current?.click()}
                  disabled={uploadingProducts}
                  size="sm"
                >
                  {uploadingProducts ? "Uploading..." : "Upload CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2 lg:col-span-3 pb-3 border-b mb-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground mb-3 block">
                    Category Type
                  </Label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${productForm.productType === "physical" ? "border-primary" : "border-muted-foreground"}`}
                      >
                        {productForm.productType === "physical" && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <input
                        type="radio"
                        className="hidden"
                        checked={productForm.productType === "physical"}
                        onChange={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            productType: "physical",
                          }))
                        }
                      />
                      <span
                        className={`text-sm font-medium ${productForm.productType === "physical" ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        Physical Product
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${productForm.productType === "service" ? "border-primary" : "border-muted-foreground"}`}
                      >
                        {productForm.productType === "service" && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <input
                        type="radio"
                        className="hidden"
                        checked={productForm.productType === "service"}
                        onChange={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            productType: "service",
                          }))
                        }
                      />
                      <span
                        className={`text-sm font-medium ${productForm.productType === "service" ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        Professional Service
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label>Name</Label>
                  <Input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={productForm.category}
                    onValueChange={(value) =>
                      setProductForm((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {getCategoryPath(category._id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Buying Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={productForm.startingPrice}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        startingPrice: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Selling Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={productForm.sellingPrice}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        sellingPrice: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Minimum Product Alert</Label>
                  <Input
                    type="number"
                    min="0"
                    value={productForm.minAlertQuantity}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        minAlertQuantity: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Initial Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={productForm.currentQuantity}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        currentQuantity: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Label>Product Description / Scope of Work (Optional)</Label>
                  <Textarea
                    placeholder="Enter detailed description or bullet points for this product/service..."
                    value={productForm.description || ""}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Product Image (Optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setSelectedImage(e.target.files?.[0] || null)
                    }
                  />
                </div>
                {branches.length > 0 &&
                Number(productForm.currentQuantity || 0) > 0 ? (
                  <div>
                    <Label>Branch for initial stock</Label>
                    <Select
                      value={productBranchId || "none"}
                      onValueChange={(value) =>
                        setProductBranchId(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select branch</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch._id} value={branch._id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div>
                  <Label>Manufacturer / Source</Label>
                  <Select
                    value={productForm.manufacturer || ""}
                    onValueChange={(val) =>
                      setProductForm((prev) => ({ ...prev, manufacturer: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {manufacturers.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.companyName} ({m.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {productForm.productType === "service" && (
                  <div className="md:col-span-2 lg:col-span-3 bg-muted/30 p-3 rounded-md border flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={productForm.isRecurring}
                        onCheckedChange={(value) =>
                          setProductForm((prev) => ({
                            ...prev,
                            isRecurring: !!value,
                          }))
                        }
                      />
                      <span className="text-sm font-medium">
                        Recurring Service (Maintenance/Renewing)
                      </span>
                    </label>
                    {productForm.isRecurring && (
                      <div className="flex items-center gap-2">
                        <Label className="mt-0">Renew Every:</Label>
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="Days"
                          value={productForm.intervalDays}
                          onChange={(e) =>
                            setProductForm((prev) => ({
                              ...prev,
                              intervalDays: e.target.value,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          Days
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 border rounded-md p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={productForm.isOutsourced}
                    onCheckedChange={(value) =>
                      setProductForm((prev) => ({
                        ...prev,
                        isOutsourced: Boolean(value),
                      }))
                    }
                  />
                  <span>Mark product as outsourced</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={productForm.expiryEnabled}
                    onCheckedChange={(value) =>
                      setProductForm((prev) => ({
                        ...prev,
                        expiryEnabled: Boolean(value),
                        expiryDate: value ? prev.expiryDate : "",
                      }))
                    }
                  />
                  <span>Enable expiry checker for this product</span>
                </label>

                {productForm.expiryEnabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={productForm.expiryDate}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            expiryDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Reminder Days Before Expiry</Label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.expiryReminderDays}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            expiryReminderDays: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={createProduct}>Create Product</Button>
            </CardContent>
          </Card>
        </>
      )}

      {view === "sales" && (
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
                  Sales Management
                </p>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Track & record sales
                </h1>
                <p className="text-sm text-muted-foreground">
                  Record sales, monitor revenue, and track customer purchases in
                  real time.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setSaleFormOpen((prev) => !prev)}
                  style={{
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  }}
                  className="text-white hover:opacity-90"
                >
                  {saleFormOpen ? "Close Sale Form" : "Create New Sale"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportAsCsv(
                      "sales-data.csv",
                      [
                        "Date",
                        "Receipt",
                        "Product",
                        "Category",
                        "Qty Sold",
                        "Sold Price",
                        "Buyer",
                        "Buyer Number",
                        "Buyer Location",
                        "Sold By",
                        "Sales Company Employee",
                        "Remaining",
                      ],
                      filteredSales.map((sale) => {
                        const categoryName =
                          (sale.product as any)?.categoryDetails?.name ||
                          categoryNameById.get(
                            (sale.product as any)?.category || "",
                          ) ||
                          "";
                        return [
                          new Date(sale.createdAt).toISOString(),
                          sale.receiptNumber || "",
                          sale.product?.name || "",
                          categoryName,
                          sale.quantitySold,
                          sale.soldPrice,
                          sale.isWalkInClient
                            ? "Walk-in Client"
                            : sale.buyerName || "",
                          sale.buyerNumber || "",
                          sale.buyerLocation || "",
                          sale.soldByUser
                            ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`
                            : "",
                          sale.salesEmployee
                            ? `${sale.salesEmployee.firstName} ${sale.salesEmployee.lastName}`
                            : "",
                          sale.remainingQuantity,
                        ];
                      }),
                    )
                  }
                >
                  Export Sales (Excel)
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Sales
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {sales.length}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {filteredSales.length} filtered
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Revenue
                  </div>
                  <div
                    className="mt-1 text-xl font-semibold"
                    style={{ color: secondaryColor }}
                  >
                    KES{" "}
                    {sales
                      .reduce(
                        (sum, sale) =>
                          sum +
                          Number(sale.quantitySold || 0) *
                            Number(sale.soldPrice || 0),
                        0,
                      )
                      .toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Units Sold
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {sales.reduce(
                      (sum, sale) => sum + Number(sale.quantitySold || 0),
                      0,
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Today's Sales
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {
                      sales.filter((s) => {
                        const saleDate = new Date(s.createdAt);
                        const today = new Date();
                        return saleDate.toDateString() === today.toDateString();
                      }).length
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label>Search products or categories</Label>
                  <Input
                    placeholder="Search by product or category name..."
                    value={salesSearch}
                    onChange={(event) => setSalesSearch(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {saleFormOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]">
              <div className="mx-auto mt-6 w-[96vw] max-w-6xl px-2 pb-6 sm:mt-8 sm:px-4">
                <Card className="shadow-2xl border bg-background">
                  <CardHeader className="border-b bg-muted/30 pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Record New Sale
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Fill in sale details and save
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSaleFormOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-[78vh] overflow-y-auto grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-6">
                    <div>
                      <Label>Product</Label>
                      <Input
                        ref={saleProductInputRef}
                        placeholder="Search product to add"
                        value={saleProductSearch}
                        onChange={(e) => {
                          setSaleProductSearch(e.target.value);
                          setSaleProductOptionsOpen(
                            e.target.value.trim().length > 0,
                          );
                        }}
                      />
                      {saleForm.productId && (
                        <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">Selected product</p>
                              <p className="text-muted-foreground">
                                {productNameById.get(saleForm.productId) ||
                                  "Unknown product"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSaleForm((prev) => ({
                                  ...prev,
                                  productId: "",
                                  quantitySold: "",
                                  soldPrice: "",
                                }));
                                setSaleProductSearch("");
                                setSaleProductOptionsOpen(false);
                                setTimeout(
                                  () => saleProductInputRef.current?.focus(),
                                  30,
                                );
                              }}
                            >
                              Clear
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSaleForm((prev) => ({
                                  ...prev,
                                  productId: "",
                                  quantitySold: "",
                                  soldPrice: "",
                                }));
                                setSaleProductSearch("");
                                setSaleProductOptionsOpen(false);
                                setTimeout(
                                  () => saleProductInputRef.current?.focus(),
                                  30,
                                );
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                      )}
                      {shouldShowSaleProductOptions && (
                        <div className="mt-2">
                          <div className="max-h-40 overflow-auto rounded border">
                            {getGroupedProductsWithCategories(
                              filteredProductsForSalePicker,
                            ).map((item, idx) =>
                              item.type === "category" ? (
                                <div
                                  key={`category-${idx}`}
                                  className="sticky top-0 bg-muted px-3 py-2 font-semibold text-sm border-b"
                                >
                                  {item.category}
                                </div>
                              ) : (
                                <button
                                  key={item.product?._id}
                                  type="button"
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${saleForm.productId === item.product?._id ? "bg-blue-100" : ""}`}
                                  onClick={() => {
                                    setSaleForm((prev) => ({
                                      ...prev,
                                      productId: item.product?._id || "",
                                      soldPrice: String(
                                        item.product?.sellingPrice || 0,
                                      ),
                                    }));
                                    setSaleProductSearch("");
                                    setSaleProductOptionsOpen(false);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="truncate">
                                      {item.product?.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      KES{" "}
                                      {item.product?.sellingPrice?.toFixed(2)}
                                    </div>
                                  </div>
                                </button>
                              ),
                            )}
                            {filteredProductsForSalePicker.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No products match your search
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Quantity Sold</Label>
                      <Input
                        type="number"
                        min="1"
                        value={saleForm.quantitySold}
                        onChange={(event) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            quantitySold: event.target.value,
                          }))
                        }
                        placeholder={
                          saleForm.productId
                            ? "Enter quantity for selected product"
                            : "Select a product first"
                        }
                      />
                    </div>
                    <div>
                      <Label>Sold Price</Label>
                      <Input
                        type="number"
                        min="0"
                        value={saleForm.soldPrice}
                        onChange={(event) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            soldPrice: event.target.value,
                          }))
                        }
                        placeholder={
                          saleForm.productId
                            ? "Price for selected product"
                            : "Select a product first"
                        }
                      />
                      <div className="mt-2">
                        <Button type="button" onClick={addSaleItem}>
                          Add Item
                        </Button>
                      </div>
                    </div>
                    {saleItems.length > 0 && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label>Items</Label>
                        <div className="space-y-2 rounded border p-3">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startNewItem}
                            >
                              Add another item
                            </Button>
                          </div>
                          {saleItems.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-medium">
                                  {it.productName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={String(it.quantity)}
                                    onChange={(e) =>
                                      updateSaleItem(idx, {
                                        quantity: Number(e.target.value),
                                      })
                                    }
                                    className="w-28"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    value={String(it.unitPrice)}
                                    onChange={(e) =>
                                      updateSaleItem(idx, {
                                        unitPrice: Number(e.target.value),
                                      })
                                    }
                                    className="w-28"
                                  />
                                  <div className="text-muted-foreground">
                                    KES {Number(it.lineTotal).toFixed(2)}
                                  </div>
                                </div>
                                {it.imageUrl && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Checkbox
                                      id={`show-img-${idx}`}
                                      checked={it.showImageOnQuote}
                                      onCheckedChange={(val) =>
                                        updateSaleItem(idx, {
                                          showImageOnQuote: !!val,
                                        })
                                      }
                                    />
                                    <Label
                                      htmlFor={`show-img-${idx}`}
                                      className="text-xs text-muted-foreground cursor-pointer"
                                    >
                                      Show image on quote
                                    </Label>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSaleItem(idx)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="font-medium">Subtotal</div>
                            <div className="font-semibold">
                              KES {saleSubTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label>Find client</Label>
                      {clientSelected ? (
                        <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {saleForm.isWalkInClient
                                ? "Walk-in client"
                                : saleForm.buyerName}
                            </div>
                            {saleForm.buyerNumber && (
                              <div className="text-xs text-muted-foreground">
                                {saleForm.buyerNumber} ·{" "}
                                {saleForm.buyerLocation}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSaleForm((prev) => ({
                                  ...prev,
                                  buyerName: "",
                                  buyerNumber: "",
                                  buyerLocation: "",
                                }));
                                setShowNewClientForm(false);
                                setClientSearch("");
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="Search existing clients..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                          />
                          {filteredClientSuggestions.length > 0 && (
                            <div className="mt-2 max-h-32 overflow-auto rounded border bg-white">
                              {filteredClientSuggestions.map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                  onClick={() => {
                                    setSaleForm((prev) => ({
                                      ...prev,
                                      buyerName: c.name,
                                      buyerNumber: c.number,
                                      buyerLocation: c.location,
                                    }));
                                    setClientSearch("");
                                    setShowNewClientForm(false);
                                  }}
                                >
                                  <div className="text-sm font-medium">
                                    {c.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {c.number} · {c.location}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowNewClientForm((p) => !p)}
                            >
                              {showNewClientForm
                                ? "Cancel New Client"
                                : "New client"}
                            </Button>
                          </div>
                          {showNewClientForm && (
                            <div className="mt-2 space-y-2">
                              <div>
                                <Label>Name</Label>
                                <Input
                                  value={saleForm.buyerName}
                                  onChange={(e) =>
                                    setSaleForm((prev) => ({
                                      ...prev,
                                      buyerName: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <Label>Number</Label>
                                <Input
                                  value={saleForm.buyerNumber}
                                  onChange={(e) =>
                                    setSaleForm((prev) => ({
                                      ...prev,
                                      buyerNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <Label>Location</Label>
                                <Input
                                  value={saleForm.buyerLocation}
                                  onChange={(e) =>
                                    setSaleForm((prev) => ({
                                      ...prev,
                                      buyerLocation: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <Button
                                  onClick={() => setShowNewClientForm(false)}
                                >
                                  Use client
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm md:col-span-2 lg:col-span-3">
                      <Checkbox
                        checked={saleForm.isWalkInClient}
                        onCheckedChange={(value) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            isWalkInClient: Boolean(value),
                          }))
                        }
                      />
                      <span>Walk-in client (no buyer details)</span>
                    </label>
                    {!saleForm.isWalkInClient && (
                      <>
                        <div>
                          <Label>Buyer Name</Label>
                          <Input
                            value={saleForm.buyerName}
                            onChange={(event) =>
                              setSaleForm((prev) => ({
                                ...prev,
                                buyerName: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Buyer Number</Label>
                          <Input
                            value={saleForm.buyerNumber}
                            onChange={(event) =>
                              setSaleForm((prev) => ({
                                ...prev,
                                buyerNumber: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Buyer Location</Label>
                          <Input
                            value={saleForm.buyerLocation}
                            onChange={(event) =>
                              setSaleForm((prev) => ({
                                ...prev,
                                buyerLocation: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                    <label className="flex items-center gap-2 text-sm md:col-span-2 lg:col-span-3">
                      <Checkbox
                        checked={saleForm.isSalesCompany}
                        onCheckedChange={(value) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            isSalesCompany: Boolean(value),
                          }))
                        }
                      />
                      <span>Is sales company?</span>
                    </label>
                    {saleForm.isSalesCompany && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label>Select employee whose sale this is</Label>
                        <Select
                          value={saleForm.salesEmployeeId}
                          onValueChange={(value) =>
                            setSaleForm((prev) => ({
                              ...prev,
                              salesEmployeeId: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem
                                key={employee._id}
                                value={employee._id}
                              >
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={recordSale}
                          disabled={
                            saleItems.length === 0 && !saleForm.productId
                          }
                        >
                          Save Sale
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-base">Sales History</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredSales.length} of {sales.length} sales
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSales.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      No sales recorded yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Record your first sale above to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1400px] w-full table-fixed text-[13px]">
                      <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                        <tr className="border-b">
                          <th className="px-3 py-3 font-medium w-[12%]">
                            Date
                          </th>
                          <th className="px-3 py-3 font-medium w-[10%]">
                            Receipt #
                          </th>
                          <th className="px-3 py-3 font-medium w-[16%]">
                            Product
                          </th>
                          <th className="px-3 py-3 font-medium w-[10%]">Qty</th>
                          <th className="px-3 py-3 font-medium w-[12%]">
                            Price
                          </th>
                          <th className="px-3 py-3 font-medium w-[14%]">
                            Buyer
                          </th>
                          <th className="px-3 py-3 font-medium w-[12%]">
                            Sold By
                          </th>
                          <th className="px-3 py-3 font-medium w-[8%]">
                            Remaining
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesPageRows.map((sale, index) => (
                          <tr
                            key={sale._id}
                            className={`border-b align-top transition-colors hover:bg-muted/40 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                          >
                            <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                              <div>
                                {new Date(sale.createdAt).toLocaleDateString(
                                  "en-KE",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "2-digit",
                                  },
                                )}
                              </div>
                              <div className="mt-0.5 text-[10px]">
                                {new Date(sale.createdAt).toLocaleTimeString(
                                  "en-KE",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top font-medium">
                              {sale.receiptNumber || "-"}
                            </td>
                            <td className="px-3 py-2 align-top min-w-0">
                              <div
                                className="truncate font-medium text-foreground"
                                title={sale.product?.name || "-"}
                              >
                                {sale.product?.name || "-"}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {(sale.product as any)?.categoryDetails?.name ||
                                  "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top font-medium">
                              {sale.quantitySold}
                            </td>
                            <td
                              className="px-3 py-2 align-top font-medium"
                              style={{ color: primaryColor }}
                            >
                              KES {Number(sale.soldPrice || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 align-top text-muted-foreground">
                              <div
                                className="truncate"
                                title={
                                  sale.isWalkInClient
                                    ? "Walk-in Client"
                                    : sale.buyerName || "-"
                                }
                              >
                                {sale.isWalkInClient
                                  ? "Walk-in Client"
                                  : sale.buyerName || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top text-muted-foreground">
                              {sale.soldByUser
                                ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 align-top font-medium">
                              {sale.remainingQuantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredSales.length > salesPageSize && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(salesPage - 1) * salesPageSize + 1}–
                        {Math.min(
                          salesPage * salesPageSize,
                          filteredSales.length,
                        )}{" "}
                        of {filteredSales.length}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={salesPage === 1}
                          onClick={() =>
                            setSalesPage((current) => Math.max(1, current - 1))
                          }
                        >
                          Prev
                        </Button>
                        {Array.from(
                          { length: Math.min(5, salesTotalPages) },
                          (_, index) => index + 1,
                        ).map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            variant={
                              pageNumber === salesPage ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setSalesPage(pageNumber)}
                            className="min-w-9"
                          >
                            {pageNumber}
                          </Button>
                        ))}
                        {salesTotalPages > 5 && (
                          <span className="px-1 text-sm text-muted-foreground">
                            ...
                          </span>
                        )}
                        {salesTotalPages > 5 && (
                          <Button
                            variant={
                              salesPage === salesTotalPages
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setSalesPage(salesTotalPages)}
                            className="min-w-9"
                          >
                            {salesTotalPages}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={salesPage === salesTotalPages}
                          onClick={() =>
                            setSalesPage((current) =>
                              Math.min(salesTotalPages, current + 1),
                            )
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
        </div>
      )}

      {view === "status" && (
        <>
          <div
            className="mb-6 rounded-2xl border px-4 py-4 shadow-sm"
            style={{
              borderColor: primaryBorderColor,
              background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
            }}
          >
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: primaryColor }}
            >
              Stock Management
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Inventory Status
            </h1>
            <p className="text-sm text-muted-foreground">
              View stock health, manage category structure, and review products
              in one place.
            </p>
          </div>

          <Tabs
            value={statusTab}
            onValueChange={(value) =>
              setStatusTab(value as "overview" | "categories" | "products")
            }
            className="w-full space-y-6"
          >
            <div
              className="rounded-xl border bg-card p-2 shadow-sm"
              style={{ borderColor: primaryBorderColor }}
            >
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="overview"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Categories
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Products
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Search & Export</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:max-w-md space-y-3">
                    <div>
                      <Label>Search products, categories, or branches</Label>
                      <Input
                        placeholder="Search by product, category, or branch"
                        value={inventorySearch}
                        onChange={(event) =>
                          setInventorySearch(event.target.value)
                        }
                      />
                    </div>
                    {branches.length > 0 && (
                      <div>
                        <Label>Branch filter</Label>
                        <Select
                          value={inventoryBranchFilter}
                          onValueChange={setInventoryBranchFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by branch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All branches</SelectItem>
                            <SelectItem value="none">
                              No branch assigned
                            </SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch._id} value={branch._id}>
                                {branch.name} ({branch.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportAsCsv(
                        "inventory-status.csv",
                        [
                          "Product",
                          "Category",
                          "Branch Stock",
                          "Total Stock",
                          "Min Alert",
                          "Selling Price",
                        ],
                        filteredProductsForInventory.map((product) => [
                          product.name,
                          product.categoryDetails?.name ||
                            categoryNameById.get(product.category) ||
                            "",
                          getDisplayedBranchSummary(product._id),
                          product.currentQuantity,
                          product.minAlertQuantity,
                          product.sellingPrice,
                        ]),
                      )
                    }
                  >
                    Export Inventory (Excel)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="out-of-stock" className="border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-red-500 font-semibold text-lg">
                          Products Out of Stock (
                          {filteredOutOfStockProducts.length})
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {filteredOutOfStockProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No products are currently out of stock.
                          </p>
                        ) : (
                          <ul className="space-y-2 text-sm max-h-[300px] overflow-y-auto pr-2">
                            {filteredOutOfStockProducts.map((product) => (
                              <li
                                key={product._id}
                                className="border border-red-100 bg-red-50/50 rounded p-3 flex justify-between items-center"
                              >
                                <span className="font-medium text-red-600">
                                  {product.name}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {product.categoryDetails?.name
                                    ? getCategoryPath(product.category)
                                    : "-"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Products Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2">Product</th>
                          <th className="py-2">Category</th>
                          {shouldIncludeUnassignedColumn && (
                            <th className="py-2">No Branch</th>
                          )}
                          {visibleBranchColumns.map((branch) => (
                            <th key={branch._id} className="py-2">
                              {branch.name}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {branch.code}
                              </span>
                            </th>
                          ))}
                          <th className="py-2">Total Stock</th>
                          <th className="py-2">Min Alert</th>
                          <th className="py-2">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProductsForInventory.map((product) => (
                          <tr key={product._id} className="border-b">
                            <td className="py-2">{product.name}</td>
                            <td className="py-2">
                              {product.categoryDetails?.name
                                ? getCategoryPath(product.category)
                                : "-"}
                            </td>
                            {shouldIncludeUnassignedColumn && (
                              <td className="py-2">
                                {getBranchStock(product._id, "none")}
                              </td>
                            )}
                            {visibleBranchColumns.map((branch) => (
                              <td key={branch._id} className="py-2">
                                {getBranchStock(product._id, branch._id)}
                              </td>
                            ))}
                            <td className="py-2">{product.currentQuantity}</td>
                            <td className="py-2">{product.minAlertQuantity}</td>
                            <td className="py-2">{product.sellingPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <CategoriesManager
                categories={categories.map((c) => ({
                  id: c._id,
                  name: c.name,
                  description: c.description,
                }))}
                products={products.map((p) => ({
                  id: p._id,
                  name: p.name,
                  sku: p.sku,
                  category: p.category,
                }))}
                onRefresh={() => fetchAll({ silent: true })}
              />
            </TabsContent>

            <TabsContent value="products">
              <ProductsManager
                products={products.map((p) => ({
                  id: p._id,
                  name: p.name,
                  categoryId: p.category,
                  category: p.category,
                  description: p.categoryDetails?.name,
                  sku: p.sku,
                  unitPrice: p.sellingPrice,
                  quantity: p.currentQuantity,
                  reorderLevel: p.minAlertQuantity,
                }))}
                categories={categories.map((c) => ({
                  id: c._id,
                  name: c.name,
                }))}
                onRefresh={() => fetchAll({ silent: true })}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {view === "wms" && (
        <WarehouseManagement
          branches={branches}
          products={products}
          warehouseLocations={warehouseLocations}
          onRefreshLocations={() => fetchAll({ silent: true })}
        />
      )}

      {view === "analytics" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Inventory analytics
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                  Single product performance
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Pick a product, review its sales history, pricing, margins,
                  and compare it against the rest of the catalogue.
                </p>
              </div>
              {selectedAnalyticsProduct && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Revenue</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedProductAnalytics.totalRevenueGenerated.toFixed(
                        2,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Qty sold</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedProductAnalytics.totalQuantitySold}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Margin</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedProductAnalytics.grossMarginPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Rank</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      #{selectedProductAnalytics.revenueRank || "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/80">
              <CardTitle className="text-base font-semibold text-slate-900">
                Single Product Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5 md:p-6">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <Label>Select product</Label>
                  <Select
                    value={selectedAnalyticsProductId}
                    onValueChange={setSelectedAnalyticsProductId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground md:text-right">
                  {selectedAnalyticsProduct ? (
                    <>
                      <p className="font-medium text-foreground">
                        {selectedAnalyticsProduct.name}
                      </p>
                      <p>
                        {selectedAnalyticsProduct.categoryDetails?.name ||
                          categoryNameById.get(
                            selectedAnalyticsProduct.category,
                          ) ||
                          "Uncategorized"}
                      </p>
                      <p>
                        Current stock:{" "}
                        {selectedAnalyticsProduct.currentQuantity}
                      </p>
                    </>
                  ) : (
                    <p>Select a product to see analytics.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={analyticsDateStart}
                    onChange={(e) => setAnalyticsDateStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={analyticsDateEnd}
                    onChange={(e) => setAnalyticsDateEnd(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setMonth(start.getMonth() - 11);
                    setAnalyticsDateStart(start.toISOString().slice(0, 10));
                    setAnalyticsDateEnd(end.toISOString().slice(0, 10));
                  }}
                >
                  Reset range
                </Button>
              </div>

              {selectedAnalyticsProduct && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: "Avg sold price",
                        value:
                          selectedProductAnalytics.averageSoldPrice.toFixed(2),
                      },
                      {
                        label: "Stock left",
                        value: selectedAnalyticsProduct.currentQuantity,
                      },
                      {
                        label: "Gross profit",
                        value: selectedProductAnalytics.grossProfit.toFixed(2),
                      },
                      {
                        label: "Cost basis",
                        value:
                          selectedProductAnalytics.totalCostBasis.toFixed(2),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: "Price range",
                        value: `${selectedProductAnalytics.lowestSoldPrice.toFixed(2)} - ${selectedProductAnalytics.highestSoldPrice.toFixed(2)}`,
                      },
                      {
                        label: "Profit margin",
                        value: `${selectedProductAnalytics.grossMarginPercent.toFixed(1)}%`,
                      },
                      {
                        label: "Revenue share",
                        value: `${selectedProductAnalytics.revenueShare.toFixed(1)}%`,
                      },
                      {
                        label: "Quantity share",
                        value: `${selectedProductAnalytics.quantityShare.toFixed(1)}%`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                      >
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/70">
                        <CardTitle className="text-base">
                          Monthly trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-80 p-4">
                        {selectedProductTrendData.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No trend data in this date range.
                          </p>
                        ) : (
                          <ProductTrendChart data={selectedProductTrendData} />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/70">
                        <CardTitle className="text-base">
                          Profit margin by product
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {salesByProduct.slice(0, 8).map((item) => {
                            const product = products.find(
                              (p) => p._id === item.productId,
                            );
                            const productRevenue = Number(item.salesValue || 0);
                            const costBasis =
                              Number(item.quantitySold || 0) *
                              Number(product?.startingPrice || 0);
                            const profit = productRevenue - costBasis;
                            const margin =
                              productRevenue > 0
                                ? (profit / productRevenue) * 100
                                : 0;
                            return (
                              <div
                                key={item.productId}
                                className={`rounded border px-3 py-2 text-sm ${item.productId === selectedAnalyticsProductId ? "border-blue-500 bg-blue-50/50" : ""}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium">
                                      {item.productName}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Qty {item.quantitySold} · Revenue{" "}
                                      {productRevenue.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {margin.toFixed(1)}%
                                    </p>
                                    <p className="text-muted-foreground">
                                      Profit {profit.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/70">
                        <CardTitle className="text-base">
                          Product vs top products
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-80 p-4">
                        {selectedProductAnalytics.comparisonRows.length ===
                        0 ? (
                          <p className="text-sm text-muted-foreground">
                            No comparison data yet.
                          </p>
                        ) : (
                          <ProductComparisonChart
                            data={selectedProductAnalytics.comparisonRows}
                          />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/70">
                        <CardTitle className="text-base">
                          Price breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {selectedProductAnalytics.priceBreakdown.length ===
                        0 ? (
                          <p className="text-sm text-muted-foreground">
                            No price history yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedProductAnalytics.priceBreakdown.map(
                              (row) => (
                                <div
                                  key={row.price}
                                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {row.price.toFixed(2)}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {row.salesCount} sale(s)
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      Qty {row.units}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Revenue {row.revenue.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/70">
                        <CardTitle className="text-base">Top clients</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {selectedProductAnalytics.topClients.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No client history yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedProductAnalytics.topClients.map(
                              (client) => (
                                <div
                                  key={`${client.name}-${client.number}-${client.location}`}
                                  className="rounded border px-3 py-2 text-sm"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-medium">
                                        {client.name}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {client.number || "-"}{" "}
                                        {client.location
                                          ? `· ${client.location}`
                                          : ""}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        {client.revenue.toFixed(2)}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {client.units} unit(s)
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/70">
                        <CardTitle className="text-base">
                          Sales history
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {selectedProductHistory.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No sales history for this product.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left border-b">
                                  <th className="py-2">Date</th>
                                  <th className="py-2">Receipt</th>
                                  <th className="py-2">Qty</th>
                                  <th className="py-2">Price</th>
                                  <th className="py-2">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedProductHistory.map((sale) => {
                                  const revenue =
                                    Number(sale.quantitySold || 0) *
                                    Number(sale.soldPrice || 0);
                                  return (
                                    <tr key={sale._id} className="border-b">
                                      <td className="py-2">
                                        {new Date(
                                          sale.createdAt,
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="py-2">
                                        {sale.receiptNumber || "-"}
                                      </td>
                                      <td className="py-2">
                                        {sale.quantitySold}
                                      </td>
                                      <td className="py-2">
                                        {Number(sale.soldPrice || 0).toFixed(2)}
                                      </td>
                                      <td className="py-2">
                                        {revenue.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Total products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">
                  {inventoryScopedProducts.length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Inventory units
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">
                  {inventoryScopedUnits}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Low stock items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">
                  {inventoryScopedLowStockCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Sales value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900">
                  {totalSalesValue.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Estimated inventory value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-slate-900">
                  {totalStockValue.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Average selling price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-slate-900">
                  {avgSellingPrice.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Average margin %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-slate-900">
                  {avgMarginPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/70">
                <CardTitle className="text-base">
                  Top products by stock value
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  {topStockValueProducts.map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <span className="text-slate-700">{product.name}</span>
                      <span className="font-medium text-slate-900">
                        {product.stockValue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/70">
                <CardTitle className="text-base">
                  Top selling products
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  {salesByProduct.slice(0, 8).map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <span className="text-slate-700">{item.productName}</span>
                      <span className="font-medium text-slate-900">
                        {item.quantitySold} sold
                      </span>
                    </div>
                  ))}
                  {salesByProduct.length === 0 && (
                    <p className="text-sm text-slate-500">No sales yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/70">
              <CardTitle className="text-base">
                30-day stock projection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Product</th>
                      <th className="py-2">Current Stock</th>
                      <th className="py-2">Sold (30d)</th>
                      <th className="py-2">Projected Demand (30d)</th>
                      <th className="py-2">Projected Stock After 30d</th>
                      <th className="py-2">Stock Cover (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectionRows.map((row) => (
                      <tr key={row.productId} className="border-b">
                        <td className="py-2">{row.productName}</td>
                        <td className="py-2">{row.currentStock}</td>
                        <td className="py-2">{row.sold30}</td>
                        <td className="py-2">{row.projected30Demand}</td>
                        <td
                          className={`py-2 ${row.projectedAfter30 < 0 ? "text-red-600 font-semibold" : ""}`}
                        >
                          {row.projectedAfter30}
                        </td>
                        <td className="py-2">
                          {row.daysOfCover ? row.daysOfCover.toFixed(1) : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "outsourced" && (
        <>
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
                    Outsourced
                  </p>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Outsourced analytics
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Monitor suppliers, products, and import recommendations.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Entries
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {outsourcedStats.outsourcedStockEntriesCount}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Units added
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {outsourcedStats.outsourcedUnitsAdded}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Suppliers
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {outsourcedStats.outsourcedSuppliersCount}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Sales value
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {outsourcedStats.outsourcedSalesValue.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_200px] lg:items-end">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <Input
                      placeholder="Product, supplier, recommendation..."
                      value={outsourcedSearchInput}
                      onChange={(event) =>
                        setOutsourcedSearchInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter")
                          setOutsourcedSearch(outsourcedSearchInput);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort by</Label>
                    <Select
                      value={outsourcedSort}
                      onValueChange={(value) =>
                        setOutsourcedSort(value as typeof outsourcedSort)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sort products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value-desc">
                          Value: highest first
                        </SelectItem>
                        <SelectItem value="value-asc">
                          Value: lowest first
                        </SelectItem>
                        <SelectItem value="quantity-desc">
                          Quantity: highest first
                        </SelectItem>
                        <SelectItem value="quantity-asc">
                          Quantity: lowest first
                        </SelectItem>
                        <SelectItem value="name-asc">Name: A to Z</SelectItem>
                        <SelectItem value="name-desc">Name: Z to A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="w-full"
                      onClick={() => setOutsourcedSearch(outsourcedSearchInput)}
                    >
                      Apply search
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Products
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {outsourcedStats.outsourcedProductsCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Quotation value
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {outsourcedStats.outsourcedValue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Contribution %
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {outsourcedStats.contributionToTotalSalesPercent.toFixed(1)}
                    %
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Units sold
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {outsourcedStats.outsourcedSalesUnits}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  Top outsourced products
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {outsourcedProductsPage.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No outsourced products found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[600px] w-full table-fixed text-[13px]">
                      <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr className="border-b">
                          <th className="px-3 py-3 font-medium w-[60%]">
                            Product
                          </th>
                          <th className="px-3 py-3 font-medium w-[20%] text-right">
                            Quantity
                          </th>
                          <th className="px-3 py-3 font-medium w-[20%] text-right">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {outsourcedProductsPage.map((product, index) => (
                          <tr
                            key={product.name}
                            className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                          >
                            <td
                              className="px-3 py-2 align-top truncate font-medium"
                              title={product.name}
                            >
                              {product.name}
                            </td>
                            <td className="px-3 py-2 align-top text-right">
                              {product.quantity}
                            </td>
                            <td className="px-3 py-2 align-top text-right font-semibold">
                              {product.value.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30 pb-3">
                  <CardTitle className="text-base">
                    Import recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {outsourcedRecommendationsPage.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No urgent recommendations right now.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[500px] w-full table-fixed text-[13px]">
                        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b">
                            <th className="px-3 py-3 font-medium w-[40%]">
                              Product
                            </th>
                            <th className="px-3 py-3 font-medium w-[20%] text-center">
                              Sold (30d)
                            </th>
                            <th className="px-3 py-3 font-medium w-[20%] text-center">
                              Stock
                            </th>
                            <th className="px-3 py-3 font-medium w-[20%] text-center">
                              Projected
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {outsourcedRecommendationsPage.map((item, index) => (
                            <tr
                              key={item.productId}
                              className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                            >
                              <td
                                className="px-3 py-2 align-top truncate font-medium"
                                title={item.name}
                              >
                                {item.name}
                              </td>
                              <td className="px-3 py-2 align-top text-center">
                                {item.sold30}
                              </td>
                              <td className="px-3 py-2 align-top text-center">
                                {item.currentStock}
                              </td>
                              <td
                                className={`px-3 py-2 align-top text-center font-semibold ${item.projectedAfter30 < 0 ? "text-red-600" : ""}`}
                              >
                                {item.projectedAfter30}
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
                  <CardTitle className="text-base">
                    Supplier breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {outsourcedSuppliersPage.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No suppliers captured yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[500px] w-full table-fixed text-[13px]">
                        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b">
                            <th className="px-3 py-3 font-medium w-[50%]">
                              Company
                            </th>
                            <th className="px-3 py-3 font-medium w-[25%] text-center">
                              Entries
                            </th>
                            <th className="px-3 py-3 font-medium w-[25%] text-right">
                              Units
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {outsourcedSuppliersPage.map((supplier, index) => (
                            <tr
                              key={supplier.company}
                              className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                            >
                              <td
                                className="px-3 py-2 align-top truncate font-medium"
                                title={supplier.company}
                              >
                                {supplier.company}
                              </td>
                              <td className="px-3 py-2 align-top text-center">
                                {supplier.entries}
                              </td>
                              <td className="px-3 py-2 align-top text-right font-semibold">
                                {supplier.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(outsourcedPage - 1) * outsourcedPageSize + 1}–
                {Math.min(
                  outsourcedPage * outsourcedPageSize,
                  Math.max(
                    sortedOutsourcedProducts.length,
                    filteredOutsourcedRecommendations.length,
                    filteredOutsourcedSuppliers.length,
                  ),
                )}{" "}
                of{" "}
                {Math.max(
                  sortedOutsourcedProducts.length,
                  filteredOutsourcedRecommendations.length,
                  filteredOutsourcedSuppliers.length,
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={outsourcedPage === 1}
                  onClick={() =>
                    setOutsourcedPage((current) => Math.max(1, current - 1))
                  }
                >
                  Prev
                </Button>
                {Array.from(
                  { length: Math.min(8, outsourcedTotalPages) },
                  (_, index) => index + 1,
                ).map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={
                      pageNumber === outsourcedPage ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setOutsourcedPage(pageNumber)}
                    className="min-w-9"
                  >
                    {pageNumber}
                  </Button>
                ))}
                {outsourcedTotalPages > 8 && (
                  <span className="px-1 text-sm text-muted-foreground">…</span>
                )}
                {outsourcedTotalPages > 8 && (
                  <Button
                    variant={
                      outsourcedPage === outsourcedTotalPages
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setOutsourcedPage(outsourcedTotalPages)}
                    className="min-w-9"
                  >
                    {outsourcedTotalPages}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={outsourcedPage === outsourcedTotalPages}
                  onClick={() =>
                    setOutsourcedPage((current) =>
                      Math.min(outsourcedTotalPages, current + 1),
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {view === "history" && (
        <>
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
                    History
                  </p>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Inventory history
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Review entries and sales with a compact, searchable view.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportAsCsv(
                        "inventory-entries.csv",
                        [
                          "Date",
                          "Product",
                          "Branch",
                          "Quantity Added",
                          "Outsourced",
                          "Outsourced Company",
                          "Note",
                        ],
                        historyEntriesPage.map((entry) => [
                          new Date(
                            entry.entryDate || entry.createdAt,
                          ).toISOString(),
                          productNameById.get(entry.productId) ||
                            entry.productId,
                          entry.branchId
                            ? branchNameById.get(entry.branchId) ||
                              entry.branchId
                            : "",
                          entry.quantityAdded,
                          entry.isOutsourced ? "Yes" : "No",
                          entry.outsourcedCompany || "",
                          entry.note || "",
                        ]),
                      )
                    }
                  >
                    Export Entries
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportAsCsv(
                        "inventory-sales-history.csv",
                        [
                          "Date",
                          "Receipt",
                          "Product",
                          "Qty Sold",
                          "Sold Price",
                          "Buyer",
                          "Sold By",
                          "Remaining",
                        ],
                        historySalesPage.map((sale) => [
                          new Date(sale.createdAt).toISOString(),
                          sale.receiptNumber || "",
                          sale.product?.name || "",
                          sale.quantitySold,
                          sale.soldPrice,
                          sale.isWalkInClient
                            ? "Walk-in Client"
                            : sale.buyerName || "",
                          sale.soldByUser
                            ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`
                            : "",
                          sale.remainingQuantity,
                        ]),
                      )
                    }
                  >
                    Export Sales
                  </Button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_200px] lg:items-end">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <Input
                      placeholder="Product, buyer, receipt, branch, note..."
                      value={historySearchInput}
                      onChange={(event) =>
                        setHistorySearchInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter")
                          setHistorySearch(historySearchInput);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort by</Label>
                    <Select
                      value={historySort}
                      onValueChange={(value) =>
                        setHistorySort(value as typeof historySort)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sort history" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">
                          Date: newest first
                        </SelectItem>
                        <SelectItem value="date-asc">
                          Date: oldest first
                        </SelectItem>
                        <SelectItem value="product-asc">
                          Product: A to Z
                        </SelectItem>
                        <SelectItem value="product-desc">
                          Product: Z to A
                        </SelectItem>
                        <SelectItem value="qty-desc">
                          Quantity: highest first
                        </SelectItem>
                        <SelectItem value="qty-asc">
                          Quantity: lowest first
                        </SelectItem>
                        <SelectItem value="buyer-asc">
                          Buyer / note: A to Z
                        </SelectItem>
                        <SelectItem value="buyer-desc">
                          Buyer / note: Z to A
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="w-full"
                      onClick={() => setHistorySearch(historySearchInput)}
                    >
                      Apply search
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Entries
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {filteredHistoryEntries.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Sales
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {filteredHistorySales.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Units added
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {filteredHistoryEntries.reduce(
                      (sum, entry) => sum + Number(entry.quantityAdded || 0),
                      0,
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Sales value
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {filteredHistorySales
                      .reduce(
                        (sum, sale) =>
                          sum +
                          Number(sale.quantitySold || 0) *
                            Number(sale.soldPrice || 0),
                        0,
                      )
                      .toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">Export history</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportAsCsv(
                      "inventory-entries.csv",
                      [
                        "Date",
                        "Product",
                        "Branch",
                        "Quantity Added",
                        "Outsourced",
                        "Outsourced Company",
                        "Note",
                      ],
                      filteredEntries.map((entry) => [
                        new Date(
                          entry.entryDate || entry.createdAt,
                        ).toISOString(),
                        productNameById.get(entry.productId) || entry.productId,
                        entry.branchId
                          ? branchNameById.get(entry.branchId) || entry.branchId
                          : "",
                        entry.quantityAdded,
                        entry.isOutsourced ? "Yes" : "No",
                        entry.outsourcedCompany || "",
                        entry.note || "",
                      ]),
                    )
                  }
                >
                  Export Stock Entries (Excel)
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportAsCsv(
                      "inventory-sales-history.csv",
                      [
                        "Date",
                        "Receipt",
                        "Product",
                        "Qty Sold",
                        "Sold Price",
                        "Buyer",
                        "Sold By",
                        "Remaining",
                      ],
                      filteredSales.map((sale) => [
                        new Date(sale.createdAt).toISOString(),
                        sale.receiptNumber || "",
                        sale.product?.name || "",
                        sale.quantitySold,
                        sale.soldPrice,
                        sale.isWalkInClient
                          ? "Walk-in Client"
                          : sale.buyerName || "",
                        sale.soldByUser
                          ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`
                          : "",
                        sale.remainingQuantity,
                      ]),
                    )
                  }
                >
                  Export Sales History (Excel)
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">Stock entries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full table-fixed text-[13px]">
                    <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr className="border-b">
                        <th className="px-3 py-3 font-medium w-[16%]">Date</th>
                        <th className="px-3 py-3 font-medium w-[20%]">
                          Product
                        </th>
                        <th className="px-3 py-3 font-medium w-[15%]">
                          Branch
                        </th>
                        <th className="px-3 py-3 font-medium w-[10%]">Qty</th>
                        <th className="px-3 py-3 font-medium w-[10%]">
                          Outsourced
                        </th>
                        <th className="px-3 py-3 font-medium w-[16%]">
                          Company
                        </th>
                        <th className="px-3 py-3 font-medium w-[13%]">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEntriesPage.map((entry, index) => (
                        <tr
                          key={entry._id}
                          className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                        >
                          <td className="px-3 py-2 align-top text-[11px]">
                            {new Date(
                              entry.entryDate || entry.createdAt,
                            ).toLocaleString()}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={
                              productNameById.get(entry.productId) ||
                              entry.productId
                            }
                          >
                            {productNameById.get(entry.productId) ||
                              entry.productId}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={
                              entry.branchId
                                ? branchNameById.get(entry.branchId) ||
                                  entry.branchId
                                : "-"
                            }
                          >
                            {entry.branchId
                              ? branchNameById.get(entry.branchId) ||
                                entry.branchId
                              : "-"}
                          </td>
                          <td className="px-3 py-2 align-top font-medium">
                            {entry.quantityAdded}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {entry.isOutsourced ? "Yes" : "No"}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={entry.outsourcedCompany || "-"}
                          >
                            {entry.outsourcedCompany || "-"}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={entry.note || "-"}
                          >
                            {entry.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">Sales history</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full table-fixed text-[13px]">
                    <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr className="border-b">
                        <th className="px-3 py-3 font-medium w-[16%]">Date</th>
                        <th className="px-3 py-3 font-medium w-[12%]">
                          Receipt #
                        </th>
                        <th className="px-3 py-3 font-medium w-[18%]">
                          Product
                        </th>
                        <th className="px-3 py-3 font-medium w-[9%]">Qty</th>
                        <th className="px-3 py-3 font-medium w-[11%]">Price</th>
                        <th className="px-3 py-3 font-medium w-[18%]">Buyer</th>
                        <th className="px-3 py-3 font-medium w-[13%]">
                          Sold By
                        </th>
                        <th className="px-3 py-3 font-medium w-[8%]">Remain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historySalesPage.map((sale, index) => (
                        <tr
                          key={sale._id}
                          className={`border-b align-top ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                        >
                          <td className="px-3 py-2 align-top text-[11px]">
                            {new Date(sale.createdAt).toLocaleString()}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={sale.receiptNumber || "-"}
                          >
                            {sale.receiptNumber || "-"}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={sale.product?.name || "-"}
                          >
                            {sale.product?.name || "-"}
                          </td>
                          <td className="px-3 py-2 align-top font-medium">
                            {sale.quantitySold}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {sale.soldPrice}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={
                              sale.isWalkInClient
                                ? "Walk-in Client"
                                : sale.buyerName || "-"
                            }
                          >
                            {sale.isWalkInClient
                              ? "Walk-in Client"
                              : sale.buyerName || "-"}
                          </td>
                          <td
                            className="px-3 py-2 align-top truncate"
                            title={
                              sale.soldByUser
                                ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`
                                : "-"
                            }
                          >
                            {sale.soldByUser
                              ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 align-top font-medium">
                            {sale.remainingQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(historyPage - 1) * historyPageSize + 1}–
                {Math.min(
                  historyPage * historyPageSize,
                  Math.max(
                    sortedHistoryEntries.length,
                    sortedHistorySales.length,
                  ),
                )}{" "}
                of{" "}
                {Math.max(
                  sortedHistoryEntries.length,
                  sortedHistorySales.length,
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage === 1}
                  onClick={() =>
                    setHistoryPage((current) => Math.max(1, current - 1))
                  }
                >
                  Prev
                </Button>
                {Array.from(
                  { length: Math.min(8, historyTotalPages) },
                  (_, index) => index + 1,
                ).map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === historyPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHistoryPage(pageNumber)}
                    className="min-w-9"
                  >
                    {pageNumber}
                  </Button>
                ))}
                {historyTotalPages > 8 && (
                  <span className="px-1 text-sm text-muted-foreground">…</span>
                )}
                {historyTotalPages > 8 && (
                  <Button
                    variant={
                      historyPage === historyTotalPages ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setHistoryPage(historyTotalPages)}
                    className="min-w-9"
                  >
                    {historyTotalPages}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage === historyTotalPages}
                  onClick={() =>
                    setHistoryPage((current) =>
                      Math.min(historyTotalPages, current + 1),
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
