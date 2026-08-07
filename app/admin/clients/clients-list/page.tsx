"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api, { stockApi } from "@/lib/api";
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
import API_URL from "@/lib/apiBase";
import { getToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateStatementOfAccountPdf } from "@/lib/stock-document-pdf";
import {
  Download,
  FileText,
  MapPin,
  MessageSquare,
  Pencil,
  PhoneCall,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";

interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
}

interface ClientActivity {
  type: "quotation" | "invoice" | "payment" | "sale";
  reference: string;
  amount: number;
  date: string;
  status?: string;
  paymentMethod?: string;
  paidAmount?: number;
  debtAmount?: number;
  externalReference?: string;
}

interface ClientContact {
  role: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

interface ClientGroup {
  _id: string;
  name: string;
  description?: string;
  memberKeys?: string[];
}

interface AccountsClientRow {
  key: string;
  client: {
    name: string;
    number: string;
    location: string;
    contactPerson?: string;
    email?: string;
  };
  quotationsCount: number;
  quotationsValue: number;
  pendingQuotationsCount?: number;
  invoicesCount: number;
  purchasesValue: number;
  paidAmount: number;
  debtAmount: number;
  salesCount: number;
  salesValue: number;
  lastActivityAt?: string;
  activities: ClientActivity[];
  contacts?: ClientContact[];
  groupIds?: string[];
}

interface SavedClientRow extends AccountsClientRow {
  isSavedClient?: boolean;
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

/** Prefer explicitly active contacts; fall back to legacy contactPerson. */
function getActiveContacts(row: SavedClientRow): ClientContact[] {
  const actives = (row.contacts || []).filter((c) => c.isActive);
  if (actives.length > 0) return actives;
  if (row.client.contactPerson) {
    return [
      {
        role: "Contact",
        name: row.client.contactPerson,
        phone: undefined,
        email: row.client.email,
        isActive: true,
      },
    ];
  }
  return (row.contacts || []).slice(0, 1);
}

function pendingQuotationsFor(row: SavedClientRow) {
  if (typeof row.pendingQuotationsCount === "number") {
    return row.pendingQuotationsCount;
  }
  return (row.activities || []).filter(
    (a) =>
      a.type === "quotation" &&
      (a.status === "draft" || a.status === "pending_approval"),
  ).length;
}

export default function AccountsClientsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [locationFilter, setLocationFilter] = useState("all");
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedClientKeys, setSelectedClientKeys] = useState<string[]>([]);
  const [rows, setRows] = useState<SavedClientRow[]>([]);
  const [selectedClientKey, setSelectedClientKey] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [savingCrm, setSavingCrm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    number: "",
    location: "",
    contactPerson: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingClients, setUploadingClients] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [addToGroupId, setAddToGroupId] = useState("");
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [showManageGroupsDialog, setShowManageGroupsDialog] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupDescription, setEditingGroupDescription] = useState("");
  const [showCountyDownloadPanel, setShowCountyDownloadPanel] = useState(false);
  const [countyDownload, setCountyDownload] = useState("");
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [editClientForm, setEditClientForm] = useState({
    name: "",
    number: "",
    location: "",
    contactPerson: "",
    email: "",
  });
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [contactRoles, setContactRoles] = useState<string[]>([
    "Doctor",
    "Lab Technician",
    "Nurse",
    "Procurement",
    "Facility Manager",
    "Accountant",
    "Reception",
    "Other",
  ]);
  const [contactsDraft, setContactsDraft] = useState<ClientContact[]>([]);
  const [contactForm, setContactForm] = useState({
    role: "Doctor",
    customRole: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
    isActive: false,
  });
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [callForm, setCallForm] = useState({
    note: "",
    status: "Interested",
    followUpDate: "",
  });
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementStartDate, setStatementStartDate] = useState("");
  const [statementEndDate, setStatementEndDate] = useState("");
  const [exportingStatement, setExportingStatement] = useState(false);

  const handleExportStatement = async () => {
    if (!selectedClient) return;
    setExportingStatement(true);
    try {
      const response = await fetch(`${API_URL}/api/stock/invoices`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      let invoices = data.data || [];

      invoices = invoices.filter(
        (inv: any) =>
          inv.client.name === selectedClient.client.name &&
          inv.client.number === selectedClient.client.number,
      );

      if (statementStartDate) {
        const start = new Date(statementStartDate).getTime();
        invoices = invoices.filter(
          (inv: any) => new Date(inv.createdAt).getTime() >= start,
        );
      }
      if (statementEndDate) {
        const end = new Date(statementEndDate).getTime() + 86400000;
        invoices = invoices.filter(
          (inv: any) => new Date(inv.createdAt).getTime() < end,
        );
      }

      const summariesPromises = invoices.map((inv: any) =>
        stockApi
          .getInvoiceLifecycle(inv._id)
          .catch(() => ({
            data: {
              paymentSummary: { paidAmount: 0, balanceRemaining: inv.subTotal },
            },
          })),
      );
      const summariesResults = await Promise.all(summariesPromises);

      const mappedInvoices = invoices.map((inv: any, i: number) => {
        // The lifecycle endpoint returns: { data: { paymentSummary: { paidAmount, balanceRemaining }, ... } }
        const paymentSummary =
          (summariesResults[i] as any)?.data?.paymentSummary || {};
        return {
          invoiceNumber: inv.invoiceNumber,
          createdAt: inv.createdAt,
          items: inv.items,
          subTotal: inv.subTotal,
          paidAmount: Number(paymentSummary.paidAmount ?? 0),
          balanceRemaining: Number(
            paymentSummary.balanceRemaining ?? inv.subTotal,
          ),
        };
      });


      let periodStr = "All Time";
      if (statementStartDate && statementEndDate)
        periodStr = `${statementStartDate} to ${statementEndDate}`;
      else if (statementStartDate) periodStr = `From ${statementStartDate}`;
      else if (statementEndDate) periodStr = `Until ${statementEndDate}`;

      generateStatementOfAccountPdf({
        client: selectedClient.client,
        invoices: mappedInvoices,
        branding,
        periodStr,
        autoSave: true,
      });

      setStatementModalOpen(false);
    } catch (e: any) {
      window.alert("Export Error: " + e.message);
    } finally {
      setExportingStatement(false);
    }
  };

  // Controls whether the "Create New Client" and "Bulk Upload" panels are shown.
  const [showAddClientPanel, setShowAddClientPanel] = useState(false);
  const [showBulkUploadPanel, setShowBulkUploadPanel] = useState(false);

  const [branding, setBranding] = useState<TenantBranding>({});
  const primaryColor = branding.primaryColor || "#0f766e";
  const secondaryColor = branding.secondaryColor || "#0ea5e9";
  const primarySoftColor = hexToRgba(primaryColor, 0.08);
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08);
  const primaryBorderColor = hexToRgba(primaryColor, 0.18);

  const loadData = async (opts?: SilentLoadOptions) => {
    try {
      await runDataLoad(
        setLoading,
        async () => {
          const [
            accountsResponse,
            clientsResponse,
            groupsResponse,
            rolesResponse,
            brandingResult,
          ] =
            await Promise.all([
              stockApi.getAccountsClients(),
              stockApi.getSavedClients(),
              stockApi
                .getClientGroups()
                .catch(() => ({ success: false, data: [] })),
              stockApi
                .getClientContactRoles()
                .catch(() => ({ success: false, data: [] })),
              fetch(`${API_URL}/api/company/branding`, {
                headers: { Authorization: `Bearer ${getToken()}` },
              }).catch(() => null),
            ]);

          if (brandingResult) {
            try {
              const brandingJson = await brandingResult.json();
              setBranding(brandingJson.data || {});
            } catch {
              setBranding({});
            }
          }

          setClientGroups((groupsResponse?.data || []) as ClientGroup[]);
          if (
            Array.isArray(rolesResponse?.data) &&
            rolesResponse.data.length > 0
          ) {
            setContactRoles(rolesResponse.data);
          }

          const accountsRows = (accountsResponse.data || []) as AccountsClientRow[];
          const savedClients = (clientsResponse.data ||
            clientsResponse ||
            []) as Array<{
            name: string;
            number: string;
            location: string;
            contactPerson?: string;
            email?: string;
            contacts?: ClientContact[];
            groupIds?: string[];
          }>;

          const mergedMap = new Map<string, SavedClientRow>();

          for (const row of accountsRows) {
            mergedMap.set(row.key, {
              ...row,
              contacts: row.contacts || [],
              groupIds: row.groupIds || [],
              isSavedClient: false,
            });
          }

          for (const client of savedClients) {
            const key =
              (client as any).key ||
              [
                String(client.name || "")
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, " "),
                String(client.number || "")
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, " "),
                String(client.location || "")
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, " "),
              ].join("|");
            if (!key || key === "||") continue;

            if (mergedMap.has(key)) {
              const existing = mergedMap.get(key)!;
              mergedMap.set(key, {
                ...existing,
                client: {
                  ...existing.client,
                  contactPerson:
                    client.contactPerson || existing.client.contactPerson,
                  email: client.email || existing.client.email,
                },
                contacts:
                  (client.contacts && client.contacts.length > 0
                    ? client.contacts
                    : existing.contacts) || [],
                groupIds: client.groupIds || existing.groupIds || [],
                isSavedClient: true,
              });
              continue;
            }

            mergedMap.set(key, {
              key,
              client: {
                name: String(client.name || "").trim(),
                number: String(client.number || "").trim(),
                location: String(client.location || "").trim(),
                contactPerson: client.contactPerson,
                email: client.email,
              },
              quotationsCount: 0,
              quotationsValue: 0,
              pendingQuotationsCount: 0,
              invoicesCount: 0,
              purchasesValue: 0,
              paidAmount: 0,
              debtAmount: 0,
              salesCount: 0,
              salesValue: 0,
              lastActivityAt: undefined,
              activities: [],
              contacts: client.contacts || [],
              groupIds: client.groupIds || [],
              isSavedClient: true,
            });
          }

          const data = Array.from(mergedMap.values());
          setRows(data);
          if (!selectedClientKey && data.length > 0)
            setSelectedClientKey(data[0].key);
        },
        opts,
        setRefreshing,
      );
    } catch (error: any) {
      window.alert(error?.message || "Failed to load accounts clients");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const loc = String(row.client?.location || "").trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = [...rows];

    if (groupFilter !== "all") {
      if (groupFilter === "ungrouped") {
        const groupedKeys = new Set(
          clientGroups.flatMap((group) => group.memberKeys || []).map(String),
        );
        result = result.filter((row) => !groupedKeys.has(row.key));
      } else {
        const group = clientGroups.find(
          (candidate) => String(candidate._id) === groupFilter,
        );
        const memberKeys = new Set((group?.memberKeys || []).map(String));
        result = result.filter((row) => memberKeys.has(row.key));
      }
    }

    if (locationFilter !== "all") {
      result = result.filter(
        (row) =>
          String(row.client.location || "").trim().toLowerCase() ===
          locationFilter.toLowerCase(),
      );
    }

    if (q) {
      result = result.filter(
        (row) =>
          [
            row.client?.name,
            row.client?.number,
            row.client?.location,
            row.client?.contactPerson,
            row.client?.email,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)) ||
          (row.contacts || []).some((contact) =>
            [contact.name, contact.role, contact.phone, contact.email]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(q)),
          ),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name_desc") {
        return b.client.name.localeCompare(a.client.name);
      }
      if (sortBy === "location") {
        const loc = a.client.location.localeCompare(b.client.location);
        return loc !== 0 ? loc : a.client.name.localeCompare(b.client.name);
      }
      if (sortBy === "group") {
        const groupName = (row: SavedClientRow) => {
          const names = clientGroups
            .filter((group) => (group.memberKeys || []).includes(row.key))
            .map((group) => group.name)
            .sort((left, right) => left.localeCompare(right));
          return names[0] || "zzz_ungrouped";
        };
        const groupCompare = groupName(a).localeCompare(groupName(b));
        return groupCompare !== 0
          ? groupCompare
          : a.client.name.localeCompare(b.client.name);
      }
      if (sortBy === "pending_quotations") {
        const diff = pendingQuotationsFor(b) - pendingQuotationsFor(a);
        return diff !== 0 ? diff : a.client.name.localeCompare(b.client.name);
      }
      if (sortBy === "debt") {
        const diff = Number(b.debtAmount || 0) - Number(a.debtAmount || 0);
        return diff !== 0 ? diff : a.client.name.localeCompare(b.client.name);
      }
      if (sortBy === "quotations") {
        const diff =
          Number(b.quotationsCount || 0) - Number(a.quotationsCount || 0);
        return diff !== 0 ? diff : a.client.name.localeCompare(b.client.name);
      }
      return a.client.name.localeCompare(b.client.name);
    });
    return result;
  }, [rows, search, sortBy, groupFilter, locationFilter, clientGroups]);

  const selectedClient = useMemo(
    () => rows.find((row) => row.key === selectedClientKey) || null,
    [rows, selectedClientKey],
  );

  const toggleClientSelected = (key: string) => {
    setSelectedClientKeys((current) =>
      current.includes(key)
        ? current.filter((candidate) => candidate !== key)
        : [...current, key],
    );
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      window.alert("Group name is required");
      return;
    }
    try {
      setSavingCrm(true);
      const response = await stockApi.createClientGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        memberKeys: selectedClientKeys,
      });
      if (response?.data) {
        setClientGroups((current) => [response.data, ...current]);
      } else {
        await loadData({ silent: true });
      }
      setRows((current) =>
        current.map((row) =>
          selectedClientKeys.includes(row.key) && response?.data?._id
            ? {
                ...row,
                groupIds: Array.from(
                  new Set([...(row.groupIds || []), String(response.data._id)]),
                ),
              }
            : row,
        ),
      );
      setSelectedClientKeys([]);
      setNewGroupName("");
      setNewGroupDescription("");
      setShowCreateGroupDialog(false);
    } catch (error: any) {
      window.alert(error?.message || "Failed to create group");
    } finally {
      setSavingCrm(false);
    }
  };

  const addClientsToGroup = async (groupId: string, keys: string[]) => {
    if (!groupId || keys.length === 0) return;
    try {
      setSavingCrm(true);
      const response = await stockApi.addClientsToGroup(groupId, keys);
      if (response?.data) {
        setClientGroups((current) =>
          current.map((group) =>
            String(group._id) === groupId ? response.data : group,
          ),
        );
        setRows((current) =>
          current.map((row) =>
            keys.includes(row.key)
              ? {
                  ...row,
                  groupIds: Array.from(
                    new Set([...(row.groupIds || []), groupId]),
                  ),
                }
              : row,
          ),
        );
      } else {
        await loadData({ silent: true });
      }
      setSelectedClientKeys([]);
      setAddToGroupId("");
    } catch (error: any) {
      window.alert(error?.message || "Failed to add clients to group");
    } finally {
      setSavingCrm(false);
    }
  };

  const openContactsDialog = (row: SavedClientRow) => {
    setSelectedClientKey(row.key);
    setContactsDraft(
      row.contacts?.length
        ? row.contacts.map((contact) => ({
            ...contact,
            isActive: Boolean(contact.isActive),
          }))
        : row.client.contactPerson
          ? [
              {
                role: "Facility Manager",
                name: row.client.contactPerson,
                phone: undefined,
                email: row.client.email,
                isActive: true,
              },
            ]
          : [],
    );
    setContactForm({
      role: "Doctor",
      customRole: "",
      name: "",
      phone: "",
      email: "",
      notes: "",
      isActive: false,
    });
    setShowContactsDialog(true);
  };

  const addContactToDraft = () => {
    const role =
      contactForm.role === "Other"
        ? contactForm.customRole.trim()
        : contactForm.role;
    if (!role || !contactForm.name.trim()) {
      window.alert("Role and name are required");
      return;
    }
    const nextContact: ClientContact = {
      role,
      name: contactForm.name.trim(),
      phone: contactForm.phone.trim() || undefined,
      email: contactForm.email.trim() || undefined,
      notes: contactForm.notes.trim() || undefined,
      isActive: contactForm.isActive,
    };
    setContactsDraft((current) => [...current, nextContact]);
    if (!contactRoles.includes(role)) {
      setContactRoles((current) => [...current, role]);
    }
    setContactForm({
      role: "Doctor",
      customRole: "",
      name: "",
      phone: "",
      email: "",
      notes: "",
      isActive: false,
    });
  };

  const setDraftContactActive = (index: number, active: boolean) => {
    setContactsDraft((current) =>
      current.map((contact, i) =>
        i === index ? { ...contact, isActive: active } : contact,
      ),
    );
  };

  const saveContacts = async () => {
    if (!selectedClient) return;

    const pendingRole =
      contactForm.role === "Other"
        ? contactForm.customRole.trim()
        : contactForm.role;
    let draft = [...contactsDraft];
    if (contactForm.name.trim()) {
      if (!pendingRole) {
        window.alert("Role and name are required for the new contact");
        return;
      }
      const pending: ClientContact = {
        role: pendingRole,
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        notes: contactForm.notes.trim() || undefined,
        isActive: contactForm.isActive,
      };
      draft = [...draft, pending];
      setContactsDraft(draft);
    }

    if (draft.length === 0) {
      window.alert("Add at least one contact before saving");
      return;
    }

    const sourceName = String(selectedClient.client.name || "").trim();
    const sourceNumber = String(selectedClient.client.number || "").trim();
    const sourceLocation = String(selectedClient.client.location || "").trim();
    if (!sourceName || !sourceNumber || !sourceLocation) {
      window.alert(
        "This client is missing a name, phone number, or location — contacts cannot be saved until those are set.",
      );
      return;
    }

    try {
      setSavingCrm(true);
      const res = await stockApi.saveClientContacts({
        sourceName,
        sourceNumber,
        sourceLocation,
        legalName: sourceName,
        contacts: draft.map((contact) => ({
          role: contact.role,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          notes: contact.notes,
          isActive: Boolean(contact.isActive),
        })),
      });
      if (res && (res as any).success === false) {
        throw new Error((res as any).message || "Failed to save contacts");
      }

      const savedContacts =
        Array.isArray((res as any)?.data?.contacts) &&
        (res as any).data.contacts.length > 0
          ? ((res as any).data.contacts as ClientContact[])
          : draft;

      setContactsDraft(savedContacts);
      setContactForm({
        role: "Doctor",
        customRole: "",
        name: "",
        phone: "",
        email: "",
        notes: "",
        isActive: false,
      });
      setRows((current) =>
        current.map((row) =>
          row.key === selectedClient.key
            ? {
                ...row,
                contacts: savedContacts,
                isSavedClient: true,
                client: {
                  ...row.client,
                  contactPerson:
                    savedContacts
                      .filter((c) => c.isActive)
                      .map((c) => c.name)
                      .join("; ") ||
                    savedContacts[0]?.name ||
                    row.client.contactPerson,
                  email:
                    savedContacts.find((c) => c.isActive)?.email ||
                    savedContacts[0]?.email ||
                    row.client.email,
                },
              }
            : row,
        ),
      );
      setShowContactsDialog(false);
    } catch (error: any) {
      window.alert(error?.message || "Failed to save contacts");
    } finally {
      setSavingCrm(false);
    }
  };

  const openCallDialog = (quoteRequested = false) => {
    setCallForm({
      note: quoteRequested ? "Client requested a quotation." : "",
      status: quoteRequested ? "Quote Requested" : "Interested",
      followUpDate: "",
    });
    setShowCallDialog(true);
  };

  const saveCall = async () => {
    if (!selectedClient || !callForm.note.trim()) return;
    try {
      setSavingCrm(true);
      await api.crm.createConversation({
        roomName: "Telesales",
        note: callForm.note.trim(),
        status: callForm.status,
        followUpDate: callForm.followUpDate || undefined,
        clientName: selectedClient.client.name,
        clientPhone: selectedClient.client.number,
      });
      setShowCallDialog(false);
    } catch (error: any) {
      window.alert(error?.message || "Failed to log call");
    } finally {
      setSavingCrm(false);
    }
  };

  const openHistoryDialog = async () => {
    if (!selectedClient) return;
    setClientHistory([]);
    setShowHistoryDialog(true);
    setLoadingHistory(true);
    try {
      const response = await api.crm.getConversations({
        clientName: selectedClient.client.name,
      });
      setClientHistory(response?.data || []);
    } catch (error: any) {
      window.alert(error?.message || "Failed to load client history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExportClientReport = () => {
    downloadClientWorkbook(filteredRows, "Client_Directory_Report");
  };

  const handleExportCountyReport = () => {
    const groupId = countyDownload.trim();
    if (!groupId) {
      window.alert("Choose a county (group) to download");
      return;
    }
    const group = clientGroups.find(
      (candidate) => String(candidate._id) === groupId,
    );
    if (!group) {
      window.alert("Selected county group was not found");
      return;
    }
    const memberKeys = new Set((group.memberKeys || []).map(String));
    const countyRows = rows.filter((row) => memberKeys.has(row.key));
    if (countyRows.length === 0) {
      window.alert(`No clients found in ${group.name}`);
      return;
    }
    const safeName = String(group.name || "county").replace(/[^\w\-]+/g, "_");
    downloadClientWorkbook(countyRows, `Clients_${safeName}`);
  };

  const downloadClientWorkbook = (
    rowsToExport: SavedClientRow[],
    filePrefix: string,
  ) => {
    const headers = [
      "Client Name",
      "Client Number",
      "Region/Location",
      "Contact Role",
      "Contact Name",
      "Contact Phone",
      "Contact Email",
      "Active",
      "Groups",
      "Source",
    ];

    const aoa: (string | number)[][] = [headers];
    const merges: XLSX.Range[] = [];

    for (const row of rowsToExport) {
      const memberships = clientGroups
        .filter((group) => (group.memberKeys || []).includes(row.key))
        .map((group) => group.name)
        .join("; ");
      const source = row.isSavedClient ? "Saved Client" : "From Accounts";

      const contacts = (
        (row.contacts || []).length > 0
          ? row.contacts!
          : row.client.contactPerson
            ? [
                {
                  role: "Contact",
                  name: row.client.contactPerson,
                  phone: undefined,
                  email: row.client.email,
                  isActive: true,
                },
              ]
            : []
      ).filter((contact) => contact?.role && contact?.name);

      const startRow = aoa.length;

      if (contacts.length === 0) {
        aoa.push([
          row.client.name,
          row.client.number,
          row.client.location,
          "",
          "",
          "",
          "",
          "",
          memberships,
          source,
        ]);
        continue;
      }

      contacts.forEach((contact, index) => {
        const isFirst = index === 0;
        aoa.push([
          isFirst ? row.client.name : "",
          isFirst ? row.client.number : "",
          isFirst ? row.client.location : "",
          contact.role || "",
          contact.name || "",
          contact.phone || "",
          contact.email || "",
          contact.isActive ? "yes" : "no",
          isFirst ? memberships : "",
          isFirst ? source : "",
        ]);
      });

      if (contacts.length > 1) {
        const endRow = startRow + contacts.length - 1;
        for (const col of [0, 1, 2, 8, 9]) {
          merges.push({
            s: { r: startRow, c: col },
            e: { r: endRow, c: col },
          });
        }
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet["!merges"] = merges;
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 8 },
      { wch: 20 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    const workbookOutput = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const url = URL.createObjectURL(
      new Blob([workbookOutput], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filePrefix}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const openEditGroupDialog = (group: ClientGroup) => {
    setEditingGroupId(String(group._id));
    setEditingGroupName(group.name);
    setEditingGroupDescription(group.description || "");
    setShowManageGroupsDialog(false);
    setShowEditGroupDialog(true);
  };

  const saveEditedGroup = async () => {
    if (!editingGroupId || !editingGroupName.trim()) {
      window.alert("Group name is required");
      return;
    }
    try {
      setSavingCrm(true);
      const response = await stockApi.updateClientGroup(editingGroupId, {
        name: editingGroupName.trim(),
        description: editingGroupDescription.trim() || undefined,
      });
      if (response?.data) {
        setClientGroups((current) =>
          current.map((group) =>
            String(group._id) === editingGroupId ? response.data : group,
          ),
        );
      } else {
        await loadData({ silent: true });
      }
      setShowEditGroupDialog(false);
      setShowManageGroupsDialog(true);
    } catch (error: any) {
      window.alert(error?.message || "Failed to rename group");
    } finally {
      setSavingCrm(false);
    }
  };

  const openEditClientDialog = (row: SavedClientRow) => {
    setEditClientForm({
      name: row.client.name || "",
      number: row.client.number || "",
      location: row.client.location || "",
      contactPerson: row.client.contactPerson || "",
      email: row.client.email || "",
    });
    setShowEditClientDialog(true);
  };

  const saveEditedClient = async () => {
    if (!selectedClient) return;
    const name = editClientForm.name.trim();
    const number = editClientForm.number.trim();
    const location = editClientForm.location.trim();
    if (!name || !number || !location) {
      window.alert("Client name, number, and location are required");
      return;
    }

    try {
      setSavingCrm(true);
      if (selectedClient.isSavedClient) {
        const response = await stockApi.updateSavedClient({
          originalSourceName: selectedClient.client.name,
          originalSourceNumber: selectedClient.client.number,
          originalSourceLocation: selectedClient.client.location,
          sourceName: name,
          sourceNumber: number,
          sourceLocation: location,
          legalName: name,
          contactPerson: editClientForm.contactPerson.trim() || undefined,
          email: editClientForm.email.trim() || undefined,
        });
        if (response?.success === false) {
          throw new Error(response?.message || "Failed to update client");
        }
      } else {
        await stockApi.saveClient({
          sourceName: name,
          sourceNumber: number,
          sourceLocation: location,
          legalName: name,
          contactPerson: editClientForm.contactPerson.trim() || undefined,
          email: editClientForm.email.trim() || undefined,
        });
      }

      const newKey = `${name.trim().toLowerCase().replace(/\s+/g, " ")}|${number
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")}|${location
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")}`;
      setSelectedClientKey(newKey);
      setShowEditClientDialog(false);
      await loadData({ silent: true });
    } catch (error: any) {
      window.alert(error?.message || "Failed to update client");
    } finally {
      setSavingCrm(false);
    }
  };

  const deleteSelectedClient = async () => {
    if (!selectedClient) return;
    const confirmed = window.confirm(
      `Delete CRM profile for "${selectedClient.client.name}"?\n\nThis removes the saved client, contacts, and group membership. Invoice/quotation history stays in accounts.`,
    );
    if (!confirmed) return;

    try {
      setSavingCrm(true);
      if (selectedClient.isSavedClient) {
        await stockApi.deleteSavedClient({
          sourceName: selectedClient.client.name,
          sourceNumber: selectedClient.client.number,
          sourceLocation: selectedClient.client.location,
        });
      } else {
        window.alert(
          "This client only exists from invoices/quotations and has no saved CRM profile to delete.",
        );
        return;
      }
      setSelectedClientKey("");
      setSelectedClientKeys((current) =>
        current.filter((key) => key !== selectedClient.key),
      );
      await loadData({ silent: true });
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete client");
    } finally {
      setSavingCrm(false);
    }
  };

  const handleAddClient = async () => {
    const name = newClient.name.trim();
    const number = newClient.number.trim();
    const location = newClient.location.trim();
    if (!name || !number || !location) {
      window.alert("Client name, phone number, and location are required");
      return;
    }

    try {
      setSavingClient(true);
      await stockApi.saveClient({
        sourceName: name,
        sourceNumber: number,
        sourceLocation: location,
        legalName: name,
        contactPerson: newClient.contactPerson.trim() || undefined,
      });

      setNewClient({
        name: "",
        number: "",
        location: "",
        contactPerson: "",
      });

      await loadData({ silent: true });
      window.alert("Client saved successfully");
      setShowAddClientPanel(false);
    } catch (error: any) {
      window.alert(error?.message || "Failed to save client");
    } finally {
      setSavingClient(false);
    }
  };

  if (loading) return <PageLoadingSkeleton title="Loading clients" rows={8} />;

  return (
    <div className="space-y-6">
      {/* Branded header, echoing the Invoices page's gradient header but kept minimal */}
      <div
        className="rounded-2xl border px-4 py-4 shadow-sm"
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
              Accounts & CRM
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Client CRM
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage the client directory, contacts, calls, groups, and
              financial activity in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={showBulkUploadPanel ? "default" : "outline"}
              onClick={() => {
                setShowBulkUploadPanel((prev) => !prev);
                setShowAddClientPanel(false);
                setShowCountyDownloadPanel(false);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowManageGroupsDialog(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit groups
            </Button>
            <Button
              size="sm"
              variant={showAddClientPanel ? "default" : "outline"}
              onClick={() => {
                setShowAddClientPanel((prev) => !prev);
                setShowBulkUploadPanel(false);
                setShowCountyDownloadPanel(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Client
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateGroupDialog(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Create group
            </Button>
            <Button
              size="sm"
              variant={showCountyDownloadPanel ? "default" : "outline"}
              onClick={() => {
                setShowCountyDownloadPanel((prev) => !prev);
                setShowAddClientPanel(false);
                setShowBulkUploadPanel(false);
              }}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Download by County
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportClientReport}>
              <Download className="mr-2 h-4 w-4" />
              Export report
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={refreshing}
              onClick={() => loadData({ silent: true })}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {showAddClientPanel ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Client Name</Label>
                <Input
                  value={newClient.name}
                  onChange={(event) =>
                    setNewClient((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Client Number</Label>
                <Input
                  value={newClient.number}
                  onChange={(event) =>
                    setNewClient((prev) => ({
                      ...prev,
                      number: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Client Location</Label>
                <Input
                  value={newClient.location}
                  onChange={(event) =>
                    setNewClient((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Contact Person (optional)</Label>
                <Input
                  value={newClient.contactPerson}
                  onChange={(event) =>
                    setNewClient((prev) => ({
                      ...prev,
                      contactPerson: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowAddClientPanel(false)}
                disabled={savingClient}
              >
                Cancel
              </Button>
              <Button onClick={handleAddClient} disabled={savingClient}>
                {savingClient ? "Saving..." : "Save Client"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showBulkUploadPanel ? (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Upload Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download the sample CSV — it includes facilities with{" "}
              <strong>multiple contact people</strong>. Required on the first
              row of each facility:{" "}
              <strong>Client Name, Region/Location</strong>. Client Number is
              optional (Contact Phone is used when it is blank).
            </p>
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
              <p className="font-medium text-foreground">
                Same layout as the export report
              </p>
              <p>
                Use <strong>one row per contact</strong>. On extra contacts for
                the same facility, leave Client Name / Number / Location blank —
                they inherit from the row above (like the merged export).
              </p>
              <p>
                Contact columns:{" "}
                <code>Contact Role</code>, <code>Contact Name</code>,{" "}
                <code>Contact Phone</code>, <code>Contact Email</code>,{" "}
                <code>Active</code> (yes/no). More than one contact can be
                active.
              </p>
              <p className="text-muted-foreground">
                Example in the sample: Acme Medical has Doctor, Lab Technician,
                and Procurement on three rows.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                className="text-sm text-primary underline"
                href="/static/sample-clients.csv"
                download
              >
                Download sample CSV
              </a>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  try {
                    setUploadingClients(true);
                    const res = await stockApi.bulkUploadClients(file);
                    if (!res?.success)
                      throw new Error(res?.message || "Upload failed");
                    const detailErrors = Array.isArray(res?.data?.errors)
                      ? res.data.errors.filter(Boolean)
                      : [];
                    const summary =
                      res?.message ||
                      `Upload complete: ${res?.data?.createdCount || 0} created, ${res?.data?.updatedCount || 0} updated`;
                    window.alert(
                      detailErrors.length > 0
                        ? `${summary}\n\nFirst issues:\n- ${detailErrors.slice(0, 8).join("\n- ")}`
                        : summary,
                    );
                    await loadData({ silent: true });
                    setShowBulkUploadPanel(false);
                  } catch (err: any) {
                    window.alert(err?.message || "Upload failed");
                  } finally {
                    setUploadingClients(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingClients}
                size="sm"
              >
                {uploadingClients ? "Uploading..." : "Upload CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showCountyDownloadPanel ? (
        <Card>
          <CardHeader>
            <CardTitle>Download by County</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export clients that belong to a county group (for example Homabay
              County or Kisii County). Multi-contact rows stay merged like the
              full report.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Label>County</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={countyDownload}
                  onChange={(event) => setCountyDownload(event.target.value)}
                >
                  <option value="">Choose county…</option>
                  {clientGroups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name} ({group.memberKeys?.length || 0})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                disabled={!countyDownload}
                onClick={handleExportCountyReport}
              >
                <Download className="mr-2 h-4 w-4" />
                Download county file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input
                placeholder="Search facility, contact, phone or location"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort clients"
                >
                  <option value="name_asc">Name: A–Z</option>
                  <option value="name_desc">Name: Z–A</option>
                  <option value="group">Group name only</option>
                  <option value="location">Location / County</option>
                  <option value="pending_quotations">
                    Pending quotations
                  </option>
                  <option value="quotations">Quotations count</option>
                  <option value="debt">Outstanding debt</option>
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  aria-label="Filter by location"
                >
                  <option value="all">All locations / counties</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2"
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                  aria-label="Filter clients by group"
                >
                  <option value="all">All groups</option>
                  <option value="ungrouped">Ungrouped only</option>
                  {clientGroups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name} ({group.memberKeys?.length || 0})
                    </option>
                  ))}
                </select>
              </div>
              {selectedClientKeys.length > 0 ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                  <span className="text-xs font-medium">
                    {selectedClientKeys.length} selected
                  </span>
                  <select
                    className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
                    value={addToGroupId}
                    onChange={(event) => setAddToGroupId(event.target.value)}
                  >
                    <option value="">Choose group…</option>
                    {clientGroups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!addToGroupId || savingCrm}
                    onClick={() =>
                      void addClientsToGroup(addToGroupId, selectedClientKeys)
                    }
                  >
                    Add
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="max-h-[560px] overflow-auto space-y-2">
              {filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clients found.
                </p>
              ) : (
                filteredRows.map((row) => {
                  const actives = getActiveContacts(row);
                  const pending = pendingQuotationsFor(row);
                  const activeLabel = actives
                    .map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`)
                    .join(", ");
                  const groupNames = clientGroups
                    .filter((group) =>
                      (group.memberKeys || []).includes(row.key),
                    )
                    .map((group) => group.name);
                  return (
                    <div
                      key={row.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedClientKey(row.key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelectedClientKey(row.key);
                        }
                      }}
                      className={`w-full cursor-pointer rounded border p-3 text-left transition hover:bg-muted/50 ${
                        selectedClientKey === row.key
                          ? "border-primary bg-muted/40"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedClientKeys.includes(row.key)}
                          onCheckedChange={() => toggleClientSelected(row.key)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select ${row.client.name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {row.client.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {row.client.location || "No location"}
                            {activeLabel ? ` · ${activeLabel}` : ""}
                          </div>
                          {groupNames.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {groupNames.map((name) => (
                                <Badge
                                  key={name}
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {pending > 0 ? (
                            <p className="mt-1 text-[11px] text-amber-700">
                              {pending} pending quotation
                              {pending === 1 ? "" : "s"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Client Activities</CardTitle>
              {selectedClient && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setStatementModalOpen(true)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Statement of Account
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedClient ? (
              <p className="text-sm text-muted-foreground">
                Select a client to view details.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCallDialog(false)}
                  >
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Log Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCallDialog(true)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Request Quote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openContactsDialog(selectedClient)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Add Contacts
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add to group
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {clientGroups.length === 0 ? (
                        <DropdownMenuItem
                          onClick={() => setShowCreateGroupDialog(true)}
                        >
                          Create a group first…
                        </DropdownMenuItem>
                      ) : (
                        clientGroups.map((group) => (
                          <DropdownMenuItem
                            key={group._id}
                            onClick={() =>
                              void addClientsToGroup(String(group._id), [
                                selectedClient.key,
                              ])
                            }
                          >
                            {group.name}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void openHistoryDialog()}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditClientDialog(selectedClient)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit client
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={savingCrm || !selectedClient.isSavedClient}
                    onClick={() => void deleteSelectedClient()}
                    title={
                      selectedClient.isSavedClient
                        ? "Delete saved CRM profile"
                        : "Save this client first to enable delete"
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border bg-muted/30 p-3 text-sm space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Facility & contact
                    </p>
                    <p>
                      <span className="font-medium">Facility:</span>{" "}
                      {selectedClient.client.name}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{" "}
                      {selectedClient.client.location || "—"}
                    </p>
                    {(() => {
                      const actives = getActiveContacts(selectedClient);
                      if (actives.length === 0) {
                        return (
                          <p className="text-muted-foreground">
                            No active contact set — use Add Contacts.
                          </p>
                        );
                      }
                      return (
                        <div className="space-y-2 pt-1">
                          <p className="font-medium">
                            Active contact{actives.length === 1 ? "" : "s"}:
                          </p>
                          {actives.map((active, index) => (
                            <div
                              key={`${active.role}-${active.name}-${index}`}
                              className="rounded border bg-background/60 px-2 py-1.5 text-sm"
                            >
                              <p>
                                {active.name}
                                {active.role ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {active.role}
                                  </span>
                                ) : null}
                              </p>
                              {active.phone ? (
                                <p className="text-muted-foreground">
                                  {active.phone}
                                </p>
                              ) : null}
                              {active.email ? (
                                <p className="text-muted-foreground">
                                  {active.email}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="rounded border bg-muted/30 p-3 text-sm space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Business activity
                    </p>
                    <p>
                      <span className="font-medium">Total purchases:</span>{" "}
                      {selectedClient.purchasesValue.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Total paid:</span>{" "}
                      {selectedClient.paidAmount.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Outstanding debt:</span>{" "}
                      {selectedClient.debtAmount.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Quotations:</span>{" "}
                      {selectedClient.quotationsCount} (
                      {selectedClient.quotationsValue.toFixed(2)})
                    </p>
                    <p>
                      <span className="font-medium">Pending quotations:</span>{" "}
                      {pendingQuotationsFor(selectedClient)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2">Date</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Reference</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Details</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedClient.activities || []).length === 0 ? (
                        <tr>
                          <td className="py-2" colSpan={6}>
                            No activities found.
                          </td>
                        </tr>
                      ) : (
                        selectedClient.activities.map((activity, index) => (
                          <tr
                            key={`${activity.type}-${activity.reference}-${index}`}
                            className="border-b"
                          >
                            <td className="py-2">
                              {new Date(activity.date).toLocaleString()}
                            </td>
                            <td className="py-2 capitalize">{activity.type}</td>
                            <td className="py-2">
                              {activity.reference || "-"}
                            </td>
                            <td className="py-2">
                              {Number(activity.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {activity.type === "invoice"
                                ? `Paid ${Number(activity.paidAmount || 0).toFixed(2)} · Debt ${Number(activity.debtAmount || 0).toFixed(2)}`
                                : activity.type === "payment"
                                  ? `${String(activity.paymentMethod || "").toUpperCase()}${activity.externalReference ? ` · ${activity.externalReference}` : ""}`
                                  : activity.status || "-"}
                            </td>
                            <td className="py-2">
                              {activity.type === "invoice" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = `/admin/stock/invoices?q=${encodeURIComponent(activity.reference || "")}`;
                                  }}
                                >
                                  Open Invoice
                                </Button>
                              ) : activity.type === "quotation" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = `/admin/stock/quotations?q=${encodeURIComponent(activity.reference || "")}`;
                                  }}
                                >
                                  Open Quotation
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Log Call — {selectedClient?.client.name || "Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Outcome / Notes</Label>
              <Input
                value={callForm.note}
                onChange={(event) =>
                  setCallForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="What was discussed?"
              />
            </div>
            <div className="space-y-1">
              <Label>Next Action Status</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={callForm.status}
                onChange={(event) =>
                  setCallForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="Interested">Interested</option>
                <option value="Follow-up Needed">Follow-up Needed</option>
                <option value="Pending">Pending</option>
                <option value="Quote Requested">Quote Requested</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Follow-up Date (optional)</Label>
              <Input
                type="date"
                value={callForm.followUpDate}
                onChange={(event) =>
                  setCallForm((current) => ({
                    ...current,
                    followUpDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCallDialog(false)}
              disabled={savingCrm}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void saveCall()}
              disabled={savingCrm || !callForm.note.trim()}
            >
              {savingCrm ? "Saving…" : "Save Call Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Interaction History — {selectedClient?.client.name || "Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {loadingHistory ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Loading history…
              </p>
            ) : clientHistory.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No logged interactions yet.
              </p>
            ) : (
              clientHistory.map((item, index) => (
                <div
                  key={item._id || index}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {item.roomName || "Telesales"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <p className="mt-2">{item.note || "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.status ? (
                      <Badge variant="outline">{item.status}</Badge>
                    ) : null}
                    {item.followUpDate ? (
                      <Badge variant="secondary">
                        Follow-up:{" "}
                        {new Date(item.followUpDate).toLocaleDateString()}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Contacts — {selectedClient?.client.name || "Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {contactsDraft.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              contactsDraft.map((contact, index) => (
                <div
                  key={`${contact.role}-${contact.name}-${index}`}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-medium">
                        {contact.role}: {contact.name}
                        {contact.isActive ? (
                          <Badge className="ml-2" variant="secondary">
                            Active
                          </Badge>
                        ) : null}
                      </p>
                      {contact.phone ? (
                        <p className="text-muted-foreground">{contact.phone}</p>
                      ) : null}
                      {contact.email ? (
                        <p className="text-muted-foreground">{contact.email}</p>
                      ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={Boolean(contact.isActive)}
                        onCheckedChange={(checked) =>
                          setDraftContactActive(index, checked === true)
                        }
                      />
                      Active contact (more than one allowed)
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setContactsDraft((current) =>
                        current.filter((_, candidateIndex) => candidateIndex !== index),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Add contact</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Role</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={contactForm.role}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                  >
                    {contactRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                {contactForm.role === "Other" ? (
                  <div>
                    <Label>Custom role</Label>
                    <Input
                      value={contactForm.customRole}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          customRole: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
                <div>
                  <Label>Name</Label>
                  <Input
                    value={contactForm.name}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={contactForm.phone}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={contactForm.isActive}
                      onCheckedChange={(checked) =>
                        setContactForm((current) => ({
                          ...current,
                          isActive: checked === true,
                        }))
                      }
                    />
                    Set as active contact (more than one allowed)
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={contactForm.notes}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addContactToDraft}
              >
                Add to list
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: click <strong>Add to list</strong> for each person, then{" "}
                <strong>Save contacts</strong>. If you leave a name filled in
                and click Save, that person is included automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContactsDialog(false)}
              disabled={savingCrm}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveContacts()} disabled={savingCrm}>
              {savingCrm ? "Saving…" : "Save contacts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create client group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selected clients ({selectedClientKeys.length}) will be added
            automatically.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Group name</Label>
              <Input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="e.g. Private"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={newGroupDescription}
                onChange={(event) => setNewGroupDescription(event.target.value)}
                placeholder="Private hospitals and clinics"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateGroupDialog(false)}
              disabled={savingCrm}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void createGroup()}
              disabled={savingCrm || !newGroupName.trim()}
            >
              {savingCrm ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showManageGroupsDialog}
        onOpenChange={setShowManageGroupsDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit groups</DialogTitle>
          </DialogHeader>
          {clientGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No groups yet. Create a group first.
            </p>
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {clientGroups.map((group) => (
                <div
                  key={group._id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.memberKeys?.length || 0} member
                      {(group.memberKeys?.length || 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditGroupDialog(group)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManageGroupsDialog(false)}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowManageGroupsDialog(false);
                setShowCreateGroupDialog(true);
              }}
            >
              Create group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditGroupDialog} onOpenChange={setShowEditGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit group name</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Group name</Label>
              <Input
                value={editingGroupName}
                onChange={(event) => setEditingGroupName(event.target.value)}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={editingGroupDescription}
                onChange={(event) =>
                  setEditingGroupDescription(event.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditGroupDialog(false)}
              disabled={savingCrm}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void saveEditedGroup()}
              disabled={savingCrm || !editingGroupName.trim()}
            >
              {savingCrm ? "Saving…" : "Save group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditClientDialog}
        onOpenChange={setShowEditClientDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit client details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client name</Label>
              <Input
                value={editClientForm.name}
                onChange={(event) =>
                  setEditClientForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Client number</Label>
              <Input
                value={editClientForm.number}
                onChange={(event) =>
                  setEditClientForm((current) => ({
                    ...current,
                    number: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Location / county</Label>
              <Input
                value={editClientForm.location}
                onChange={(event) =>
                  setEditClientForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Contact person (optional)</Label>
              <Input
                value={editClientForm.contactPerson}
                onChange={(event) =>
                  setEditClientForm((current) => ({
                    ...current,
                    contactPerson: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input
                type="email"
                value={editClientForm.email}
                onChange={(event) =>
                  setEditClientForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditClientDialog(false)}
              disabled={savingCrm}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveEditedClient()} disabled={savingCrm}>
              {savingCrm ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statementModalOpen} onOpenChange={setStatementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Statement of Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Start Date (optional)</Label>
              <Input
                type="date"
                value={statementStartDate}
                onChange={(e) => setStatementStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={statementEndDate}
                onChange={(e) => setStatementEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatementModalOpen(false)}
              disabled={exportingStatement}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportStatement}
              disabled={exportingStatement}
            >
              {exportingStatement ? "Generating..." : "Generate PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
