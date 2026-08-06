"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import api, { stockApi, usersApi } from "@/lib/api";
import { finishDataLoad, startDataLoad } from "@/lib/silent-load";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
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
  Plus,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  RefreshCw,
  ListChecks,
  Users,
  PhoneCall,
  MessageSquare,
  FileText,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ============================================================================
 * Types
 * ==========================================================================*/

interface InstalledMachine {
  _id: string;
  productName: string;
  serialNumber?: string;
  client?: {
    name: string;
    number?: string;
    location?: string;
    contactPerson?: string;
  };
  installationLocation?: string;
  installationDate?: string;
  warrantyUntil?: string;
  status?: string;
  nextServiceDate?: string;
  installedBy?: string;
  attendant?: string;
  attendantNumber?: string;
  isTrained?: boolean;
  notes?: string;
}

interface FacilityContact {
  role: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

function buildClientKey(name?: string, number?: string, location?: string) {
  return `${String(name || "")
    .trim()
    .toLowerCase()}|${String(number || "")
    .trim()
    .toLowerCase() || "n/a"}|${String(location || "")
    .trim()
    .toLowerCase() || "n/a"}`;
}

function namesMatch(a?: string, b?: string) {
  return (
    String(a || "")
      .trim()
      .toLowerCase() ===
    String(b || "")
      .trim()
      .toLowerCase()
  );
}

function findCustomerRowForMachine(customers: any[], machine: InstalledMachine | null) {
  if (!machine?.client?.name) return null;
  const name = machine.client.name.trim().toLowerCase();
  const number = String(machine.client.number || "")
    .trim()
    .toLowerCase();
  const key = buildClientKey(
    machine.client.name,
    machine.client.number,
    machine.client.location,
  );
  const byKey = customers.find((c) => c.key === key);
  if (byKey) return byKey;
  if (number) {
    const byNameNumber = customers.find(
      (c) =>
        String(c.client?.name || "")
          .trim()
          .toLowerCase() === name &&
        String(c.client?.number || "")
          .trim()
          .toLowerCase() === number,
    );
    if (byNameNumber) return byNameNumber;
  }
  return (
    customers.find(
      (c) =>
        String(c.client?.name || "")
          .trim()
          .toLowerCase() === name,
    ) || null
  );
}

function contactsFromCustomerRow(row: any): FacilityContact[] {
  if (Array.isArray(row?.contacts) && row.contacts.length > 0) {
    return row.contacts.map((c: any) => ({
      role: c.role || "Other",
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      notes: c.notes || "",
    }));
  }
  if (row?.client?.contactPerson) {
    return [
      {
        role: "Facility Manager",
        name: row.client.contactPerson,
        phone: row.client.number || "",
        email: row.client.email || "",
      },
    ];
  }
  return [];
}

interface Candidate {
  invoiceId: string;
  quotationId: string;
  productId: string;
  productName: string;
  category?: string;
  client?: { name: string; location?: string };
  invoiceNumber?: string;
  quantity?: number;
}

interface ServiceRecord {
  _id: string;
  machineId: string;
  isReminder?: boolean;
  machine?: {
    productName?: string;
    serialNumber?: string;
    client?: { name: string; location?: string };
  };
  serviceType?: string;
  scheduledDate?: string;
  completedDate?: string;
  technician?: string;
  cost?: number;
  notes?: string;
}

type SectionKey = "machines" | "clients" | "tickets" | "pending" | "due" | "coming-soon" | "done";
type ComingSoonPeriod = "week" | "month";

interface ServiceFormState {
  machineId: string;
  serviceType: string;
  scheduledDate: string;
  technician: string;
  notes: string;
  cost: string;
  markCompleted: boolean;
}

const EMPTY_SERVICE_FORM: ServiceFormState = {
  machineId: "",
  serviceType: "",
  scheduledDate: "",
  technician: "",
  notes: "",
  cost: "",
  markCompleted: false,
};

const SERVICE_TYPE_OPTIONS = [
  "Annual Service",
  "Breakdown",
  "QC",
  "Client Request",
  "Machine failure",
  "Routine Maintenance",
];

interface EmployeeOption {
  _id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

function getEmployeeLabel(employee: EmployeeOption) {
  if (employee.name) return employee.name;
  const first = employee.first_name?.trim();
  const last = employee.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return employee.email || "Unnamed employee";
}

/* ============================================================================
 * Theme helpers (mirrors the palette used on the Invoices dashboard)
 * ==========================================================================*/

const PRIMARY_COLOR = "#0f766e";
const SECONDARY_COLOR = "#0ea5e9";

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

const PRIMARY_SOFT = hexToRgba(PRIMARY_COLOR, 0.08);
const SECONDARY_SOFT = hexToRgba(SECONDARY_COLOR, 0.08);
const PRIMARY_BORDER = hexToRgba(PRIMARY_COLOR, 0.18);

/* ============================================================================
 * Date helpers
 * ==========================================================================*/

// Positive => in the future, 0 => today, negative => overdue
function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function toInputDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

/* ============================================================================
 * Small presentational helpers
 * ==========================================================================*/

function machineStatusTone(status?: string) {
  if (status === "maintenance") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "inactive" || status === "decommissioned") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function ServiceStatusBadge({ service }: { service: ServiceRecord }) {
  if (service.completedDate) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
      >
        Done
      </Badge>
    );
  }
  const d = daysUntil(service.scheduledDate);
  if (d === null) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
      >
        Pending
      </Badge>
    );
  }
  if (d <= 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700"
      >
        {d === 0 ? "Due today" : `Overdue ${Math.abs(d)}d`}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700"
    >
      In {d}d
    </Badge>
  );
}

function ServiceCard({
  service,
  onMarkDone,
  onEdit,
  onDelete,
}: {
  service: ServiceRecord;
  onMarkDone?: (s: ServiceRecord) => void;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (s: ServiceRecord) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {service.machine?.productName || "Unknown machine"}
          </span>
          <ServiceStatusBadge service={service} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {service.serviceType || "General service"} ·{" "}
          {service.machine?.client?.name || "—"}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {service.scheduledDate && (
            <span>Scheduled: {formatDate(service.scheduledDate)}</span>
          )}
          {service.completedDate && (
            <span>Completed: {formatDate(service.completedDate)}</span>
          )}
          {service.technician && <span>By: {service.technician}</span>}
        </div>
        {service.notes && (
          <div className="mt-2 text-xs italic text-muted-foreground">
            {service.notes}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!service.completedDate && !service.isReminder && onMarkDone && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 whitespace-nowrap text-xs"
            onClick={() => onMarkDone(service)}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Mark done
          </Button>
        )}
        {!service.isReminder && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 whitespace-nowrap">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(service)}>
                Edit service
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(service)}
              >
                Delete service
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * Page
 * ==========================================================================*/

export default function InstalledMachinesPage() {
  // Section navigation
  const [section, setSection] = useState<SectionKey>("machines");
  const [comingSoonPeriod, setComingSoonPeriod] =
    useState<ComingSoonPeriod>("week");

  // Data
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<InstalledMachine[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Add machine (from invoice candidates)
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, Candidate>>(
    {},
  );
  const [showCandidates, setShowCandidates] = useState(false);
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);

  // Clients CRM
  const [clientSearch, setClientSearch] = useState("");
  const [clientSortBy, setClientSortBy] = useState("name_asc");
  const [clientGroups, setClientGroups] = useState<any[]>([]);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [selectedClientKeys, setSelectedClientKeys] = useState<string[]>([]);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
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
  const [contactsDraft, setContactsDraft] = useState<
    Array<{ role: string; name: string; phone?: string; email?: string; notes?: string }>
  >([]);
  const [contactForm, setContactForm] = useState({
    role: "Doctor",
    customRole: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [addToGroupId, setAddToGroupId] = useState("");

  // Machine list / detail
  const [machineSearch, setMachineSearch] = useState("");
  const [machinePage, setMachinePage] = useState(1);
  const machinePageSize = 10;
  const [selectedMachine, setSelectedMachine] =
    useState<InstalledMachine | null>(null);
  const [editingMachine, setEditingMachine] = useState<InstalledMachine | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailForm, setDetailForm] = useState<Partial<InstalledMachine>>({});
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Services (log / edit)
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(
    null,
  );
  const [serviceForm, setServiceForm] =
    useState<ServiceFormState>(EMPTY_SERVICE_FORM);

  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    callerSelect: "new" as string,
    callerName: "",
    callerPhone: "",
    callerRole: "Caller",
    assignedTechnician_id: "",
  });
  const [ticketAction, setTicketAction] = useState<{
    ticket: any;
    mode: "resolve" | "escalate";
  } | null>(null);
  const [ticketActionForm, setTicketActionForm] = useState({
    resolutionNote: "",
    machineId: "",
    serviceType: "",
    scheduledDate: "",
    technician: "",
    cost: "",
    notes: "",
  });

  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [activeCRMClient, setActiveCRMClient] = useState<any>(null);
  const [callForm, setCallForm] = useState({ note: "", status: "Interested", followUpDate: "" });
  const [clientHistory, setClientHistory] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ---------------------------- Data loading ---------------------------- */

  const load = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setIsRefreshing);
    try {
      const [mRes, candRes, sRes, tRes, accountsRes, savedRes, groupsRes, rolesRes] = await Promise.all([
        stockApi.getInstalledMachines(),
        stockApi.getInstallableCandidates(),
        stockApi.getMachineServices
          ? stockApi.getMachineServices()
          : Promise.resolve({ data: [] }),
        api.crm.getTickets().catch(() => ({ success: false, data: [] })),
        stockApi.getAccountsClients().catch(() => ({ success: false, data: [] })),
        stockApi.getSavedClients().catch(() => ({ success: false, data: [] })),
        stockApi.getClientGroups().catch(() => ({ success: false, data: [] })),
        stockApi.getClientContactRoles().catch(() => ({ success: false, data: [] })),
      ]);
      let usersRes: any = null;
      try {
        usersRes = await usersApi.getAll();
      } catch (employeeErr) {
        console.error("Failed to load employees", employeeErr);
      }

      setMachines(mRes.data || []);
      if (tRes?.success) setTickets(tRes.data || []);
      setClientGroups(groupsRes?.data || []);
      if (Array.isArray(rolesRes?.data) && rolesRes.data.length > 0) {
        setContactRoles(rolesRes.data);
      }
      
      const accountsRows = accountsRes.data || [];
      const savedClients = savedRes.data || [];
      const mergedMap = new Map<string, any>();
      for (const row of accountsRows) {
        mergedMap.set(row.key, { ...row, contacts: [], groupIds: [], isSavedClient: false });
      }
      for (const client of savedClients) {
        const key = `${String(client.name || "").trim().toLowerCase()}|${String(client.number || "").trim().toLowerCase()}|${String(client.location || "").trim().toLowerCase()}`;
        if (!key) continue;
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          existing.client.contactPerson = client.contactPerson || existing.client.contactPerson;
          existing.client.email = client.email || existing.client.email;
          existing.contacts = client.contacts || [];
          existing.groupIds = client.groupIds || [];
          existing.isSavedClient = true;
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
          contacts: client.contacts || [],
          groupIds: client.groupIds || [],
          isSavedClient: true,
        });
      }
      setCustomers(Array.from(mergedMap.values()));
      
      const payload = candRes.data ||
        candRes || { categories: [], candidates: [] };
      setCategories(payload.categories || []);
      setCandidates(payload.candidates || []);
      const servicePayload = Array.isArray(sRes?.data) ? sRes.data : [];
      setServices(servicePayload);
      setEmployees(Array.isArray(usersRes?.data) ? usersRes.data : []);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to load installed machines");
    } finally {
      finishDataLoad(silent, setLoading, setIsRefreshing);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /* ------------------------------ Derived -------------------------------- */

  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return candidates;
    return candidates.filter(
      (c: any) => (c.category || "Uncategorized") === selectedCategory,
    );
  }, [candidates, selectedCategory]);

  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    if (groupFilter !== "all") {
      const group = clientGroups.find((g) => String(g._id) === groupFilter);
      const memberKeys = new Set((group?.memberKeys || []).map(String));
      result = result.filter((c: any) => memberKeys.has(c.key));
    }

    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase();
      result = result.filter((c: any) => 
        (c.client.name || "").toLowerCase().includes(q) ||
        (c.client.location || "").toLowerCase().includes(q) ||
        (c.client.number || "").toLowerCase().includes(q) ||
        (c.client.contactPerson || "").toLowerCase().includes(q) ||
        (c.client.email || "").toLowerCase().includes(q) ||
        (c.contacts || []).some(
          (p: any) =>
            String(p.name || "").toLowerCase().includes(q) ||
            String(p.role || "").toLowerCase().includes(q) ||
            String(p.phone || "").toLowerCase().includes(q) ||
            String(p.email || "").toLowerCase().includes(q),
        )
      );
    }

    result.sort((a: any, b: any) => {
      if (clientSortBy === "name_asc") {
        return (a.client.name || "").localeCompare(b.client.name || "");
      } else if (clientSortBy === "name_desc") {
        return (b.client.name || "").localeCompare(a.client.name || "");
      } else if (clientSortBy === "location") {
        return (a.client.location || "").localeCompare(b.client.location || "");
      }
      return 0;
    });

    return result;
  }, [customers, clientSearch, clientSortBy, groupFilter, clientGroups]);

  const openContactsDialog = (clientRow: any) => {
    setActiveCRMClient(clientRow);
    setContactsDraft(
      Array.isArray(clientRow.contacts) && clientRow.contacts.length > 0
        ? clientRow.contacts.map((c: any) => ({
            role: c.role || "Other",
            name: c.name || "",
            phone: c.phone || "",
            email: c.email || "",
            notes: c.notes || "",
          }))
        : clientRow.client?.contactPerson
          ? [
              {
                role: "Facility Manager",
                name: clientRow.client.contactPerson,
                phone: clientRow.client.number || "",
                email: clientRow.client.email || "",
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
    });
    setShowContactsDialog(true);
  };

  const addContactToDraft = () => {
    const role =
      contactForm.role === "Other"
        ? contactForm.customRole.trim()
        : contactForm.role;
    if (!role || !contactForm.name.trim()) {
      alert("Role and name are required");
      return;
    }
    setContactsDraft((prev) => [
      ...prev,
      {
        role,
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        notes: contactForm.notes.trim() || undefined,
      },
    ]);
    if (role === contactForm.customRole.trim() && role && !contactRoles.includes(role)) {
      setContactRoles((prev) => [...prev, role]);
    }
    setContactForm({
      role: "Doctor",
      customRole: "",
      name: "",
      phone: "",
      email: "",
      notes: "",
    });
  };

  const saveContacts = async () => {
    if (!activeCRMClient?.client) return;

    const pendingRole =
      contactForm.role === "Other"
        ? contactForm.customRole.trim()
        : contactForm.role;
    let draft = [...contactsDraft];
    if (contactForm.name.trim()) {
      if (!pendingRole) {
        alert("Role and name are required for the new contact");
        return;
      }
      const pending = {
        role: pendingRole,
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        notes: contactForm.notes.trim() || undefined,
      };
      draft = [...draft, pending];
      setContactsDraft(draft);
    }

    if (draft.length === 0) {
      alert("Add at least one contact before saving");
      return;
    }

    const sourceName = String(activeCRMClient.client.name || "").trim();
    const sourceNumber = String(activeCRMClient.client.number || "").trim();
    const sourceLocation = String(activeCRMClient.client.location || "").trim();
    if (!sourceName || !sourceNumber || !sourceLocation) {
      alert(
        "This client is missing a name, phone number, or location — contacts cannot be saved until those are set.",
      );
      return;
    }

    try {
      setSaving(true);
      const res = await stockApi.saveClientContacts({
        sourceName,
        sourceNumber,
        sourceLocation,
        legalName: sourceName,
        contacts: draft,
      });
      if (res && (res as any).success === false) {
        throw new Error((res as any).message || "Failed to save contacts");
      }
      const savedContacts =
        Array.isArray(res?.data?.contacts) && res.data.contacts.length > 0
          ? res.data.contacts
          : draft;
      const key =
        activeCRMClient.key ||
        buildClientKey(
          activeCRMClient.client.name,
          activeCRMClient.client.number,
          activeCRMClient.client.location,
        );
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.key === key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            contacts: savedContacts,
            isSavedClient: true,
            client: {
              ...next[idx].client,
              contactPerson:
                savedContacts[0]?.name || next[idx].client.contactPerson,
              email: savedContacts[0]?.email || next[idx].client.email,
            },
          };
          return next;
        }
        return [
          ...prev,
          {
            key,
            client: {
              name: sourceName,
              number: sourceNumber,
              location: sourceLocation,
              contactPerson: savedContacts[0]?.name,
              email: savedContacts[0]?.email,
            },
            contacts: savedContacts,
            groupIds: res?.data?.groupIds || [],
            isSavedClient: true,
          },
        ];
      });
      setShowContactsDialog(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save contacts");
    } finally {
      setSaving(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Group name is required");
      return;
    }
    try {
      setSaving(true);
      const res = await stockApi.createClientGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        memberKeys: selectedClientKeys,
      });
      if (res?.data) {
        setClientGroups((prev) => [res.data, ...prev]);
      } else {
        await load({ silent: true });
      }
      setShowCreateGroupDialog(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedClientKeys([]);
    } catch (err: any) {
      alert(err?.message || "Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  const addSelectedToGroup = async () => {
    if (!addToGroupId || selectedClientKeys.length === 0) {
      alert("Select clients and a group first");
      return;
    }
    try {
      setSaving(true);
      const res = await stockApi.addClientsToGroup(addToGroupId, selectedClientKeys);
      if (res?.data) {
        setClientGroups((prev) =>
          prev.map((g) => (String(g._id) === addToGroupId ? res.data : g)),
        );
        setCustomers((prev) =>
          prev.map((c) =>
            selectedClientKeys.includes(c.key)
              ? {
                  ...c,
                  groupIds: Array.from(
                    new Set([...(c.groupIds || []), addToGroupId]),
                  ),
                }
              : c,
          ),
        );
      } else {
        await load({ silent: true });
      }
      setSelectedClientKeys([]);
      setAddToGroupId("");
    } catch (err: any) {
      alert(err?.message || "Failed to add clients to group");
    } finally {
      setSaving(false);
    }
  };

  const addSingleClientToGroup = async (clientKey: string, groupId: string) => {
    try {
      setSaving(true);
      const res = await stockApi.addClientsToGroup(groupId, [clientKey]);
      if (res?.data) {
        setClientGroups((prev) =>
          prev.map((g) => (String(g._id) === groupId ? res.data : g)),
        );
        setCustomers((prev) =>
          prev.map((c) =>
            c.key === clientKey
              ? {
                  ...c,
                  groupIds: Array.from(new Set([...(c.groupIds || []), groupId])),
                }
              : c,
          ),
        );
      } else {
        await load({ silent: true });
      }
    } catch (err: any) {
      alert(err?.message || "Failed to add to group");
    } finally {
      setSaving(false);
    }
  };

  const toggleClientSelected = (key: string) => {
    setSelectedClientKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const filteredMachines = useMemo(() => {
    const query = machineSearch.trim().toLowerCase();
    if (!query) return machines;
    return machines.filter(
      (m) =>
        m.productName.toLowerCase().includes(query) ||
        m.client?.name.toLowerCase().includes(query) ||
        m.serialNumber?.toLowerCase().includes(query) ||
        m.installationLocation?.toLowerCase().includes(query),
    );
  }, [machines, machineSearch]);

  useEffect(() => {
    setMachinePage(1);
  }, [machineSearch]);

  const machineTotalPages = Math.max(
    1,
    Math.ceil(filteredMachines.length / machinePageSize),
  );

  useEffect(() => {
    if (machinePage > machineTotalPages) setMachinePage(machineTotalPages);
  }, [machinePage, machineTotalPages]);

  const pagedMachines = useMemo(() => {
    const start = (machinePage - 1) * machinePageSize;
    return filteredMachines.slice(start, start + machinePageSize);
  }, [filteredMachines, machinePage]);

  const machineVisiblePages = useMemo(() => {
    const count = Math.min(8, machineTotalPages);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [machineTotalPages]);

  const reminderServices = useMemo(() => {
    const reminders: ServiceRecord[] = [...services];

    machines.forEach((machine) => {
      if (!machine.nextServiceDate) return;

      const hasMatchingReminder = reminders.some(
        (service) =>
          service.machineId === machine._id &&
          service.scheduledDate === machine.nextServiceDate,
      );

      if (hasMatchingReminder) return;

      reminders.push({
        _id: `${machine._id}-next-service`,
        machineId: machine._id,
        isReminder: true,
        machine: {
          productName: machine.productName,
          serialNumber: machine.serialNumber,
          client: machine.client,
        },
        serviceType: "Routine Maintenance",
        scheduledDate: machine.nextServiceDate,
        completedDate: undefined,
        technician: "",
        notes: "Next service date from machine record",
        cost: 0,
      });
    });

    return reminders;
  }, [machines, services]);

  const pendingServices = useMemo(
    () => reminderServices.filter((s) => !s.completedDate),
    [reminderServices],
  );

  const dueServices = useMemo(
    () =>
      pendingServices.filter((s) => {
        const d = daysUntil(s.scheduledDate);
        return d !== null && d <= 0;
      }),
    [pendingServices],
  );

  const comingSoonServices = useMemo(() => {
    const limit = comingSoonPeriod === "week" ? 7 : 30;
    return pendingServices.filter((s) => {
      const d = daysUntil(s.scheduledDate);
      return d !== null && d > 0 && d <= limit;
    });
  }, [pendingServices, comingSoonPeriod]);

  const doneServices = useMemo(
    () =>
      [...services]
        .filter((s) => !!s.completedDate)
        .sort(
          (a, b) =>
            new Date(b.completedDate!).getTime() -
            new Date(a.completedDate!).getTime(),
        ),
    [services],
  );

  const recentDoneServices = useMemo(
    () => doneServices.slice(0, 5),
    [doneServices],
  );

  const servicesForSelectedMachine = useMemo(() => {
    if (!selectedMachine) return [];
    return reminderServices
      .filter((s) => s.machineId === selectedMachine._id)
      .sort((a, b) => {
        const da = a.scheduledDate || a.completedDate || "";
        const db = b.scheduledDate || b.completedDate || "";
        return db.localeCompare(da);
      });
  }, [reminderServices, selectedMachine]);

  const technicianOptions = useMemo(() => {
    const options = employees.map((employee) => ({
      value: getEmployeeLabel(employee),
      label: getEmployeeLabel(employee),
    }));

    if (
      serviceForm.technician &&
      !options.some((option) => option.value === serviceForm.technician)
    ) {
      options.unshift({ value: serviceForm.technician, label: serviceForm.technician });
    }

    return options;
  }, [employees, serviceForm.technician]);

  const sectionTabs: {
    key: SectionKey;
    label: string;
    icon: JSX.Element;
    count: number;
  }[] = [
    {
      key: "machines",
      label: "Machines",
      icon: <ListChecks className="h-4 w-4" />,
      count: machines.length,
    },
    {
      key: "clients",
      label: "Clients CRM",
      icon: <Users className="h-4 w-4" />,
      count: customers.length,
    },
    {
      key: "tickets",
      label: "Tickets",
      icon: <AlertTriangle className="h-4 w-4" />,
      count: tickets.filter(
        (t) =>
          t.status !== "Closed" &&
          t.status !== "Dismissed" &&
          t.status !== "Resolved",
      ).length,
    },
    {
      key: "pending",
      label: "Pending Services",
      icon: <Clock className="h-4 w-4" />,
      count: pendingServices.length,
    },
    {
      key: "due",
      label: "Due Services",
      icon: <AlertTriangle className="h-4 w-4" />,
      count: dueServices.length,
    },
    {
      key: "coming-soon",
      label: "Coming Soon",
      icon: <CalendarClock className="h-4 w-4" />,
      count: comingSoonServices.length,
    },
    {
      key: "done",
      label: "Done Services",
      icon: <CheckCircle2 className="h-4 w-4" />,
      count: doneServices.length,
    },
  ];

  const handleExportClientReport = () => {
    const header = ["Client Name", "Contact Person", "Phone", "Region/Location", "Source"];
    const rows = filteredAndSortedCustomers.map((c: any) => [
      `"${(c.client.name || "").replace(/"/g, '""')}"`,
      `"${(c.client.contactPerson || "").replace(/"/g, '""')}"`,
      `"${(c.client.number || "").replace(/"/g, '""')}"`,
      `"${(c.client.location || "").replace(/"/g, '""')}"`,
      `"${c.isSavedClient ? "Saved Client" : "From Invoices"}"`
    ]);

    const csvContent = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Client_Directory_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ticketCallerContacts = useMemo(() => {
    if (!selectedMachine) return [] as FacilityContact[];
    const row = findCustomerRowForMachine(customers, selectedMachine);
    const fromCrm = contactsFromCustomerRow(row);
    const list = [...fromCrm];
    if (
      selectedMachine.attendant &&
      !list.some((c) => namesMatch(c.name, selectedMachine.attendant))
    ) {
      list.push({
        role: "Attendant",
        name: selectedMachine.attendant,
        phone: selectedMachine.attendantNumber || "",
      });
    }
    return list;
  }, [selectedMachine, customers]);

  const openRaiseTicketDialog = (machine: InstalledMachine) => {
    setSelectedMachine(machine);
    const row = findCustomerRowForMachine(customers, machine);
    const contacts = contactsFromCustomerRow(row);
    const withAttendant = [...contacts];
    if (
      machine.attendant &&
      !withAttendant.some((c) => namesMatch(c.name, machine.attendant))
    ) {
      withAttendant.push({
        role: "Attendant",
        name: machine.attendant,
        phone: machine.attendantNumber || "",
      });
    }
    const first = withAttendant[0];
    setTicketForm({
      title: "",
      description: "",
      callerSelect: first ? "contact:0" : "new",
      callerName: first?.name || "",
      callerPhone: first?.phone || "",
      callerRole: first?.role || "Caller",
      assignedTechnician_id: "",
    });
    setShowTicketDialog(true);
  };

  const applyTicketCallerSelect = (value: string) => {
    if (value === "new") {
      setTicketForm((prev) => ({
        ...prev,
        callerSelect: "new",
        callerName: "",
        callerPhone: "",
        callerRole: "Caller",
      }));
      return;
    }
    const idx = Number(String(value).replace("contact:", ""));
    const contact = ticketCallerContacts[idx];
    if (!contact) return;
    setTicketForm((prev) => ({
      ...prev,
      callerSelect: value,
      callerName: contact.name,
      callerPhone: contact.phone || "",
      callerRole: contact.role || "Caller",
    }));
  };

  const ensureCallerAsContact = async (
    machine: InstalledMachine,
    callerName: string,
    callerPhone: string,
    callerRole: string,
  ) => {
    const name = callerName.trim();
    if (!name || !machine.client?.name) return;

    const row = findCustomerRowForMachine(customers, machine);
    const existing = contactsFromCustomerRow(row);
    const matchIdx = existing.findIndex((c) => namesMatch(c.name, name));
    const phone = callerPhone.trim();

    let nextContacts: FacilityContact[];
    if (matchIdx >= 0) {
      const current = existing[matchIdx];
      if (!phone || namesMatch(current.phone, phone)) return;
      nextContacts = existing.map((c, i) =>
        i === matchIdx ? { ...c, phone } : c,
      );
    } else {
      nextContacts = [
        ...existing,
        {
          role: (callerRole || "Caller").trim() || "Caller",
          name,
          phone: phone || undefined,
        },
      ];
    }

    const sourceName = machine.client.name;
    const sourceNumber =
      machine.client.number || row?.client?.number || "n/a";
    const sourceLocation =
      machine.client.location || row?.client?.location || "n/a";

    await stockApi.saveClientContacts({
      sourceName,
      sourceNumber,
      sourceLocation,
      legalName: sourceName,
      contacts: nextContacts,
    });

    const key =
      row?.key || buildClientKey(sourceName, sourceNumber, sourceLocation);
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          contacts: nextContacts,
          isSavedClient: true,
          client: {
            ...copy[idx].client,
            contactPerson: nextContacts[0]?.name || copy[idx].client.contactPerson,
          },
        };
        return copy;
      }
      return [
        ...prev,
        {
          key,
          client: {
            name: sourceName,
            number: sourceNumber,
            location: sourceLocation,
            contactPerson: nextContacts[0]?.name,
          },
          contacts: nextContacts,
          groupIds: [],
          isSavedClient: true,
        },
      ];
    });
  };

  const enrichServiceRecord = (service: any): ServiceRecord => {
    if (!service) return service;
    if (service.machine) return service;
    const machine = machines.find((m) => m._id === service.machineId);
    if (!machine) return service;
    return {
      ...service,
      machine: {
        productName: machine.productName,
        serialNumber: machine.serialNumber,
        client: machine.client,
      },
    };
  };

  const handleRaiseTicket = async () => {
    if (!selectedMachine) return;
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      alert("Title and description are required");
      return;
    }
    if (!ticketForm.callerName.trim()) {
      alert("Select or enter a caller name");
      return;
    }
    try {
      setSaving(true);

      const payload: any = {
        title: ticketForm.title.trim(),
        description: ticketForm.description.trim(),
        callerName: ticketForm.callerName.trim(),
        callerPhone: ticketForm.callerPhone.trim() || undefined,
        assignedTechnician_id: ticketForm.assignedTechnician_id || undefined,
        machine_id: selectedMachine._id,
      };

      const created = await api.crm.createTicket(payload);
      await ensureCallerAsContact(
        selectedMachine,
        payload.callerName,
        payload.callerPhone || "",
        ticketForm.callerRole,
      );

      const ticket = created?.data || created;
      setTickets((prev) => [
        {
          ...ticket,
          machine_id: {
            _id: selectedMachine._id,
            serialNumber: selectedMachine.serialNumber,
            productName: selectedMachine.productName,
            client: selectedMachine.client,
          },
        },
        ...prev,
      ]);
      setShowTicketDialog(false);
      setTicketForm({
        title: "",
        description: "",
        callerSelect: "new",
        callerName: "",
        callerPhone: "",
        callerRole: "Caller",
        assignedTechnician_id: "",
      });
    } catch (err) {
      console.error(err);
      alert("Failed to raise ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      setSaving(true);
      const patch = {
        status,
        ...(status === "Dismissed"
          ? { resolutionType: "dismissed", resolvedDate: new Date().toISOString() }
          : {}),
      };
      const res = await api.crm.updateTicket(ticketId, patch);
      const updated = res?.data;
      setTickets((prev) =>
        prev.map((t) =>
          t._id === ticketId ? { ...t, ...(updated || patch) } : t,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update ticket status");
    } finally {
      setSaving(false);
    }
  };

  const openTicketAction = (ticket: any, mode: "resolve" | "escalate") => {
    const machineId =
      typeof ticket.machine_id === "object" && ticket.machine_id
        ? ticket.machine_id._id
        : ticket.machine_id || "";
    setTicketAction({ ticket, mode });
    setTicketActionForm({
      resolutionNote: "",
      machineId: machineId || "",
      serviceType: ticket.title ? `Service: ${ticket.title}` : "",
      scheduledDate: "",
      technician: "",
      cost: "",
      notes: ticket.description || "",
    });
  };

  const submitTicketAction = async () => {
    if (!ticketAction) return;
    const { ticket, mode } = ticketAction;
    try {
      setSaving(true);
      if (mode === "resolve") {
        const res = await api.crm.resolveTicket(ticket._id, {
          action: "resolved",
          resolutionNote:
            ticketActionForm.resolutionNote.trim() ||
            "Resolved during conversation",
        });
        const updated = res?.data;
        setTickets((prev) =>
          prev.map((t) =>
            t._id === ticket._id
              ? {
                  ...t,
                  ...(updated || {
                    status: "Resolved",
                    resolutionType: "conversation",
                    resolutionNote:
                      ticketActionForm.resolutionNote.trim() ||
                      "Resolved during conversation",
                  }),
                }
              : t,
          ),
        );
      } else {
        if (!ticketActionForm.machineId) {
          alert("Select a machine to escalate to service");
          return;
        }
        const result = await api.crm.resolveTicket(ticket._id, {
          action: "escalate_service",
          resolutionNote: ticketActionForm.resolutionNote.trim() || undefined,
          machineId: ticketActionForm.machineId,
          serviceType: ticketActionForm.serviceType.trim() || undefined,
          scheduledDate: ticketActionForm.scheduledDate
            ? new Date(ticketActionForm.scheduledDate).toISOString()
            : null,
          technician: ticketActionForm.technician.trim() || undefined,
          cost: ticketActionForm.cost ? Number(ticketActionForm.cost) : 0,
          notes: ticketActionForm.notes.trim() || undefined,
        });
        const payload = result?.data;
        if (payload?.ticket) {
          setTickets((prev) =>
            prev.map((t) =>
              t._id === ticket._id
                ? {
                    ...t,
                    ...payload.ticket,
                    machine_id: t.machine_id,
                  }
                : t,
            ),
          );
        }
        if (payload?.service) {
          setServices((prev) => [enrichServiceRecord(payload.service), ...prev]);
        }
        const qtn = payload?.quotation?.quotationNumber;
        if (qtn) {
          // keep feedback light — no blocking reload
          console.info(`Quotation ${qtn} created from ticket escalate`);
        }
      }
      setTicketAction(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- CRM Actions -------------------------------- */

  const handleLogCallSubmit = async () => {
    if (!activeCRMClient || !callForm.note.trim()) return;
    try {
      setSaving(true);
      await api.crm.createConversation({
        roomName: "Telesales",
        note: callForm.note,
        status: callForm.status,
        followUpDate: callForm.followUpDate || undefined,
        clientName: activeCRMClient.client.name,
        clientPhone: activeCRMClient.client.number || activeCRMClient.client.phoneNumbers?.[0],
      });
      setShowCallDialog(false);
      alert("Call logged successfully in Telesales!");
    } catch (err) {
      console.error(err);
      alert("Failed to log call");
    } finally {
      setSaving(false);
    }
  };

  const openCallDialog = (client: any, quoteRequested: boolean = false) => {
    setActiveCRMClient(client);
    setCallForm({
      note: quoteRequested ? "Client requested a quotation." : "",
      status: quoteRequested ? "Quote Requested" : "Interested",
      followUpDate: "",
    });
    setShowCallDialog(true);
  };

  const openHistoryDialog = async (client: any) => {
    setActiveCRMClient(client);
    setClientHistory([]);
    setShowHistoryDialog(true);
    try {
      const res = await api.crm.getConversations({ clientName: client.client.name });
      if (res.success) {
        setClientHistory(res.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------------------- Actions -------------------------------- */

  const toggleSelect = (key: string, item: Candidate) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = item;
      return next;
    });
  };

  const openDetailDialog = (machine: InstalledMachine) => {
    setEditingMachine(machine);
    setDetailForm({
      serialNumber: machine.serialNumber || "",
      nextServiceDate: machine.nextServiceDate || "",
      installedBy: machine.installedBy || "",
      attendant: machine.attendant || "",
      attendantNumber: machine.attendantNumber || "",
      isTrained: machine.isTrained || false,
      installationLocation: machine.installationLocation || "",
      notes: machine.notes || "",
    });
    setShowDetailDialog(true);
  };

  const saveDetails = async () => {
    if (!editingMachine || !editingMachine._id) return;
    setSaving(true);
    try {
      const res = await stockApi.updateInstalledMachine(editingMachine._id, detailForm);
      const updated = res?.data || { ...editingMachine, ...detailForm };
      setMachines((prev) =>
        prev.map((m) => (m._id === editingMachine._id ? { ...m, ...updated } : m)),
      );
      setSelectedMachine((prev) =>
        prev?._id === editingMachine._id ? { ...prev, ...updated } : prev,
      );
      setShowDetailDialog(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save details");
    } finally {
      setSaving(false);
    }
  };

  const saveSelectedCandidates = async () => {
    const keys = Object.keys(selectedItems);
    if (!keys.length) return alert("Select machines to save");
    setSaving(true);
    try {
      const created: InstalledMachine[] = [];
      for (const k of keys) {
        const item = selectedItems[k];
        const res = await stockApi.createInstalledMachine({
          client: item.client || {},
          productId: item.productId,
          productName: item.productName,
          category: item.category,
          invoiceId: item.invoiceId,
          quotationId: item.quotationId,
          installationDate: new Date().toISOString(),
          isActive: true,
        });
        if (res?.data) created.push(res.data);
      }
      if (created.length) {
        setMachines((prev) => [...created, ...prev]);
      } else {
        await load({ silent: true });
      }
      setSelectedItems({});
      setShowCandidates(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async (id: string) => {
    if (!confirm("Are you sure you want to delete this machine?")) return;
    try {
      await stockApi.deleteInstalledMachine(id);
      setMachines((prev) => prev.filter((m) => m._id !== id));
      setSelectedMachine((prev) => (prev?._id === id ? null : prev));
      setServices((prev) => prev.filter((s) => s.machineId !== id));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to delete machine");
    }
  };

  const openLogServiceDialog = (machine?: InstalledMachine) => {
    setEditingService(null);
    setServiceForm({
      ...EMPTY_SERVICE_FORM,
      machineId: machine?._id || selectedMachine?._id || "",
    });
    setShowServiceDialog(true);
  };

  const openEditServiceDialog = (service: ServiceRecord) => {
    setEditingService(service);
    setServiceForm({
      machineId: service.machineId,
      serviceType: service.serviceType || "",
      scheduledDate: toInputDate(service.scheduledDate),
      technician: service.technician || "",
      notes: service.notes || "",
      cost: service.cost != null ? String(service.cost) : "",
      markCompleted: !!service.completedDate,
    });
    setShowServiceDialog(true);
  };

  const saveService = async () => {
    if (!serviceForm.machineId) return alert("Select a machine");
    if (editingService?.isReminder) {
      alert("This reminder cannot be edited directly.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        machineId: serviceForm.machineId,
        serviceType: serviceForm.serviceType,
        scheduledDate: serviceForm.scheduledDate
          ? new Date(serviceForm.scheduledDate).toISOString()
          : null,
        technician: serviceForm.technician,
        notes: serviceForm.notes,
        cost: serviceForm.cost ? Number(serviceForm.cost) : undefined,
        completedDate: serviceForm.markCompleted
          ? editingService?.completedDate || new Date().toISOString()
          : null,
      };

      if (editingService) {
        const res = await stockApi.updateMachineService(editingService._id, payload);
        const updated = enrichServiceRecord(res?.data || { ...editingService, ...payload });
        setServices((prev) =>
          prev.map((s) => (s._id === editingService._id ? { ...s, ...updated } : s)),
        );
      } else {
        const res = await stockApi.createMachineService(payload);
        const created = enrichServiceRecord(res?.data || payload);
        if (created?._id) {
          setServices((prev) => [created, ...prev]);
        } else {
          await load({ silent: true });
        }
      }
      setShowServiceDialog(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const markServiceDone = async (service: ServiceRecord) => {
    if (service.isReminder) {
      alert("This reminder is not a saved service record.");
      return;
    }
    try {
      const completedDate = new Date().toISOString();
      const res = await stockApi.updateMachineService(service._id, {
        completedDate,
      });
      const updated = res?.data || { ...service, completedDate };
      setServices((prev) =>
        prev.map((s) => (s._id === service._id ? { ...s, ...updated } : s)),
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to mark service done");
    }
  };

  const deleteService = async (service: ServiceRecord) => {
    if (service.isReminder) {
      alert("This reminder is not a saved service record.");
      return;
    }
    if (!confirm("Delete this service record?")) return;
    try {
      await stockApi.deleteMachineService(service._id);
      setServices((prev) => prev.filter((s) => s._id !== service._id));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to delete service");
    }
  };

  if (loading) return <PageLoadingSkeleton title="Loading installed machines" rows={8} />;

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="space-y-5 p-6">
      {/* Gradient header banner, mirrors the Invoices dashboard */}
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: PRIMARY_BORDER,
          background: `linear-gradient(to right, ${PRIMARY_SOFT}, ${SECONDARY_SOFT})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: PRIMARY_COLOR }}
            >
              Installed Machines
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Installed machines dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Track machines sold to clients, and manage pending, due and
              completed services.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setSection("machines");
                setShowCandidates((v) => !v);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showCandidates ? "Hide" : "Add"} Machines
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => openLogServiceDialog()}
            >
              <Wrench className="h-4 w-4" />
              Log Service
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => load({ silent: true })}
              disabled={isRefreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Machines
              </div>
              <div className="mt-1 text-xl font-semibold">{machines.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Pending services
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: SECONDARY_COLOR }}>
                {pendingServices.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Due services
              </div>
              <div className="mt-1 text-xl font-semibold text-rose-600">
                {dueServices.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Coming soon
              </div>
              <div className="mt-1 text-xl font-semibold">
                {comingSoonServices.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Done services
              </div>
              <div className="mt-1 text-xl font-semibold text-emerald-600">
                {doneServices.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section navigation, styled as a pill toggle row */}
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border bg-white/90 p-2 shadow-sm backdrop-blur-sm">
          {sectionTabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={section === tab.key ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => setSection(tab.key)}
            >
              {tab.icon}
              {tab.label}
              <Badge
                variant="outline"
                className={`ml-1 rounded-full px-2 py-0 text-[11px] ${
                  section === tab.key
                    ? "border-white/40 bg-white/20 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* ---------------------------- Machines section ---------------------------- */}
      {section === "machines" && (
        <>
          {showCandidates && (
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  Add Machines from Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                    <Label>Filter by Category</Label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mt-1 w-full rounded border px-3 py-2"
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No candidate machines found for selected category.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {filteredByCategory.map((it: any, idx: number) => {
                        const key = `${it.invoiceId}::${it.productId}::${idx}`;
                        const selected = !!selectedItems[key];
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between rounded-xl border p-4 transition cursor-pointer ${
                              selected
                                ? "border-primary bg-primary/10"
                                : "bg-background hover:bg-muted/50"
                            }`}
                            onMouseEnter={() => setHoveredCandidate(key)}
                            onMouseLeave={() => setHoveredCandidate(null)}
                          >
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => toggleSelect(key, it)}
                            >
                              <div className="font-medium">{it.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                Invoice: {it.invoiceNumber || it.invoiceId} ·
                                Client: {it.client?.name || "-"}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {hoveredCandidate === key && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleSelect(key, it)}
                                  className="text-xs"
                                >
                                  {selected ? "Remove" : "Add"}
                                </Button>
                              )}
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleSelect(key, it)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={saveSelectedCandidates}
                      disabled={saving || Object.keys(selectedItems).length === 0}
                      className="flex-1"
                    >
                      {saving
                        ? "Saving..."
                        : `Save ${Object.keys(selectedItems).length} Selected`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCandidates(false);
                        setSelectedItems({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Machines table */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="border-b bg-muted/30 pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle className="text-base">Machines registry</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredMachines.length} of {machines.length} machines
                      </p>
                    </div>
                    <Input
                      placeholder="Search by machine, client, serial..."
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      className="w-full sm:w-64"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {machines.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          No installed machines yet
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Click "Add Machines" to register machines from
                          delivered invoices.
                        </p>
                      </div>
                    </div>
                  ) : filteredMachines.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          No machines found
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Try adjusting your search.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed text-[13px]">
                        <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                          <tr className="border-b">
                            <th className="px-3 py-3 font-medium w-[38%]">Machine</th>
                            <th className="px-3 py-3 font-medium w-[30%]">Client</th>
                            <th className="px-3 py-3 font-medium w-[16%]">Status</th>
                            <th className="px-3 py-3 font-medium w-[16%]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedMachines.map((m, index) => (
                            <tr
                              key={m._id}
                              onClick={() => setSelectedMachine(m)}
                              className={`cursor-pointer border-b align-top transition-colors hover:bg-muted/40 ${
                                selectedMachine?._id === m._id
                                  ? "bg-primary/10"
                                  : index % 2 === 0
                                    ? "bg-white"
                                    : "bg-muted/20"
                              }`}
                            >
                              <td className="px-3 py-2 align-top">
                                <div className="min-w-0">
                                  <div
                                    className="truncate font-medium text-foreground"
                                    title={m.productName}
                                  >
                                    {m.productName}
                                  </div>
                                  {m.serialNumber && (
                                    <div className="truncate text-[11px] text-muted-foreground">
                                      SN: {m.serialNumber}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="min-w-0">
                                  <div
                                    className="truncate font-medium text-foreground"
                                    title={m.client?.name}
                                  >
                                    {m.client?.name || "—"}
                                  </div>
                                  <div className="truncate text-[11px] text-muted-foreground">
                                    {m.client?.location || "—"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <Badge
                                  variant="outline"
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${machineStatusTone(
                                    m.status,
                                  )}`}
                                >
                                  {m.status || "active"}
                                </Badge>
                              </td>
                              <td
                                className="px-3 py-2 align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedMachine(m)}
                                    >
                                      View details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openDetailDialog(m)}
                                    >
                                      Edit machine
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openLogServiceDialog(m)}
                                    >
                                      Log service
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openRaiseTicketDialog(m)}
                                    >
                                      Raise a ticket
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => deleteMachine(m._id)}
                                    >
                                      Delete machine
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredMachines.length > 0 && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(machinePage - 1) * machinePageSize + 1}–
                        {Math.min(machinePage * machinePageSize, filteredMachines.length)}{" "}
                        of {filteredMachines.length}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={machinePage === 1}
                          onClick={() =>
                            setMachinePage((current) => Math.max(1, current - 1))
                          }
                        >
                          Prev
                        </Button>
                        {machineVisiblePages.map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === machinePage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMachinePage(pageNumber)}
                            className="min-w-9"
                          >
                            {pageNumber}
                          </Button>
                        ))}
                        {machineTotalPages > 8 && (
                          <span className="px-1 text-sm text-muted-foreground">…</span>
                        )}
                        {machineTotalPages > 8 && (
                          <Button
                            variant={machinePage === machineTotalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMachinePage(machineTotalPages)}
                            className="min-w-9"
                          >
                            {machineTotalPages}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={machinePage === machineTotalPages}
                          onClick={() =>
                            setMachinePage((current) =>
                              Math.min(machineTotalPages, current + 1),
                            )
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

            {/* Right column: selected machine detail, or recent services */}
            <div className="space-y-4">
              {selectedMachine ? (
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-3">
                    <CardTitle className="text-base">Machine details</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedMachine(null)}
                    >
                      Close
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Machine Name
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedMachine.productName}
                      </p>
                    </div>

                    {selectedMachine.serialNumber && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Serial Number
                        </Label>
                        <p className="text-sm font-mono mt-1">
                          {selectedMachine.serialNumber}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Client
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedMachine.client?.name || "—"}
                      </p>
                    </div>

                    {selectedMachine.installationLocation && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Installation Location
                        </Label>
                        <p className="text-sm mt-1">
                          {selectedMachine.installationLocation}
                        </p>
                      </div>
                    )}

                    {selectedMachine.installationDate && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Installed Date
                        </Label>
                        <p className="text-sm mt-1">
                          {formatDate(selectedMachine.installationDate)}
                        </p>
                      </div>
                    )}

                    {selectedMachine.attendant && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Operator
                        </Label>
                        <div className="space-y-1 mt-1">
                          <p className="text-sm">{selectedMachine.attendant}</p>
                          {selectedMachine.attendantNumber && (
                            <p className="text-xs text-muted-foreground">
                              {selectedMachine.attendantNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedMachine.isTrained && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                      >
                        Operator Trained
                      </Badge>
                    )}

                    {selectedMachine.warrantyUntil && (
                      <div className="rounded-xl border bg-amber-50 p-3">
                        <Label className="text-xs uppercase tracking-wider text-amber-700">
                          Warranty Until
                        </Label>
                        <p className="text-sm font-medium text-amber-900 mt-1">
                          {formatDate(selectedMachine.warrantyUntil)}
                        </p>
                      </div>
                    )}

                    {selectedMachine.notes && (
                      <div className="rounded-xl border bg-slate-50 p-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Notes
                        </Label>
                        <p className="text-sm mt-1">{selectedMachine.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openDetailDialog(selectedMachine)}
                      >
                        Edit Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLogServiceDialog(selectedMachine)}
                      >
                        Log Service
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRaiseTicketDialog(selectedMachine)}
                      >
                        Raise Ticket
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMachine(selectedMachine._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="border-b bg-muted/30 pb-3">
                    <CardTitle className="text-sm">
                      Select a machine to see its details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-xs text-muted-foreground">
                    Click any row in the registry, or open its Actions menu.
                  </CardContent>
                </Card>
              )}

              {/* Per-machine service history, when a machine is selected */}
              {selectedMachine && (
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="border-b bg-muted/30 pb-3">
                    <CardTitle className="text-sm">
                      Service History ({servicesForSelectedMachine.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-auto pt-4">
                    {servicesForSelectedMachine.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No services logged for this machine yet.
                      </p>
                    ) : (
                      servicesForSelectedMachine.map((s) => (
                        <div
                          key={s._id}
                          className="flex items-center justify-between text-xs rounded-lg border p-2"
                        >
                          <div>
                            <div className="font-medium">
                              {s.serviceType || "General service"}
                            </div>
                            <div className="text-muted-foreground">
                              {s.completedDate
                                ? `Completed ${formatDate(s.completedDate)}`
                                : `Scheduled ${formatDate(s.scheduledDate)}`}
                            </div>
                          </div>
                          <ServiceStatusBadge service={s} />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recent services done, always visible */}
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="border-b bg-muted/30 pb-3">
                  <CardTitle className="text-sm">Recent Services Done</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {recentDoneServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No completed services yet.
                    </p>
                  ) : (
                    recentDoneServices.map((s) => (
                      <div
                        key={s._id}
                        className="flex items-center justify-between text-xs rounded-lg border p-2"
                      >
                        <div>
                          <div className="font-medium">
                            {s.machine?.productName || "Machine"}
                          </div>
                          <div className="text-muted-foreground">
                            {s.serviceType || "General service"} ·{" "}
                            {formatDate(s.completedDate)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ---------------------------- Clients CRM → main CRM centre ---------------------------- */}
      {section === "clients" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">Clients CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground max-w-xl">
              Client directory, contacts, groups, call logs, quote requests, and
              financial history now live in the main Client CRM centre.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href="/admin/clients/clients-list">Open Client CRM</a>
              </Button>
              <Button
                variant="outline"
                onClick={() => setSection("machines")}
              >
                Back to machines
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------- Tickets ---------------------------- */}
      {section === "tickets" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Raised Tickets ({tickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No tickets raised yet.
              </div>
            ) : (
              <div className="grid divide-y">
                {tickets.map((t) => {
                  const machinePop =
                    t.machine_id && typeof t.machine_id === "object"
                      ? t.machine_id
                      : null;
                  const isOpen = !["Closed", "Dismissed", "Resolved", "Processed", "Scheduled"].includes(
                    t.status,
                  ) && t.resolutionType !== "escalated_to_service" && t.resolutionType !== "conversation";
                  return (
                  <div key={t._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{t.title}</div>
                      <div className="text-sm text-slate-600 line-clamp-2">{t.description}</div>
                      <div className="mt-2 text-xs text-muted-foreground flex gap-3 flex-wrap">
                        <span>Status: <Badge variant={t.status === "Open" ? "destructive" : "outline"}>{t.status}</Badge></span>
                        {machinePop?.serialNumber && (
                          <span>
                            Machine: {machinePop.serialNumber}
                            {machinePop.productName ? ` · ${machinePop.productName}` : ""}
                          </span>
                        )}
                        {t.callerName && <span>Caller: {t.callerName} {t.callerPhone && `(${t.callerPhone})`}</span>}
                        <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                      </div>
                      {(t.resolutionNote || t.quotationNumber || t.serviceId) && (
                        <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                          {t.resolutionType === "conversation" && (
                            <p>Resolved in conversation{t.resolutionNote ? `: ${t.resolutionNote}` : ""}</p>
                          )}
                          {t.resolutionType === "escalated_to_service" && (
                            <p>
                              Escalated to service
                              {t.quotationNumber ? (
                                <>
                                  {" · Quotation "}
                                  <a
                                    className="underline text-slate-900"
                                    href={`/admin/stock/quotations/${t.quotationId}`}
                                  >
                                    {t.quotationNumber}
                                  </a>
                                </>
                              ) : null}
                            </p>
                          )}
                          {t.resolutionType === "dismissed" && t.resolutionNote && (
                            <p>Dismissed: {t.resolutionNote}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {isOpen && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openTicketAction(t, "resolve")}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTicketAction(t, "escalate")}
                          >
                            Escalate to Service
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive"
                            onClick={() => handleUpdateTicketStatus(t._id, "Dismissed")}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                      {t.quotationId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a href={`/admin/stock/quotations/${t.quotationId}`}>
                            View Quotation
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------------------- Pending services ---------------------------- */}
      {section === "pending" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Pending Services ({pendingServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {pendingServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending services. All caught up.
              </p>
            ) : (
              pendingServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onMarkDone={markServiceDone}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Due services ------------------------------ */}
      {section === "due" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Due Services ({dueServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {dueServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nothing overdue right now.
              </p>
            ) : (
              dueServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onMarkDone={markServiceDone}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* --------------------------- Coming soon services --------------------------- */}
      {section === "coming-soon" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">
                Coming Soon Services ({comingSoonServices.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={comingSoonPeriod === "week" ? "default" : "outline"}
                  onClick={() => setComingSoonPeriod("week")}
                >
                  Within a week
                </Button>
                <Button
                  size="sm"
                  variant={comingSoonPeriod === "month" ? "default" : "outline"}
                  onClick={() => setComingSoonPeriod("month")}
                >
                  Within a month
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {comingSoonServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nothing scheduled in this period.
              </p>
            ) : (
              comingSoonServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onMarkDone={markServiceDone}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Done services ------------------------------ */}
      {section === "done" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Done Services ({doneServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {doneServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No services completed yet.
              </p>
            ) : (
              doneServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Edit machine dialog ------------------------------ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Machine Details
              {editingMachine ? ` - ${editingMachine.productName}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serial Number (Optional)</Label>
                <Input
                  value={detailForm.serialNumber || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, serialNumber: e.target.value })
                  }
                  placeholder="e.g., SN-2024-001"
                />
              </div>
              <div>
                <Label>Installation Location</Label>
                <Input
                  value={detailForm.installationLocation || ""}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      installationLocation: e.target.value,
                    })
                  }
                  placeholder="e.g., Lab 1, Room 201"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Installed By (Engineer)</Label>
                <Input
                  value={detailForm.installedBy || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, installedBy: e.target.value })
                  }
                  placeholder="Engineer name"
                />
              </div>
              <div>
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={toInputDate(detailForm.nextServiceDate)}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      nextServiceDate: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Operator / Attendant</Label>
                <Input
                  value={detailForm.attendant || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, attendant: e.target.value })
                  }
                  placeholder="Operator name"
                />
              </div>
              <div>
                <Label>Operator Phone / Number</Label>
                <Input
                  value={detailForm.attendantNumber || ""}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      attendantNumber: e.target.value,
                    })
                  }
                  placeholder="+254712345678"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={detailForm.notes || ""}
                onChange={(e) =>
                  setDetailForm({ ...detailForm, notes: e.target.value })
                }
                placeholder="Any additional notes about the machine"
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={detailForm.isTrained || false}
                onCheckedChange={(checked) =>
                  setDetailForm({ ...detailForm, isTrained: checked as boolean })
                }
              />
              <Label className="cursor-pointer flex-1 mb-0">
                Operator is trained on this machine
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveDetails} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------ Log / edit service dialog ------------------------------ */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Log a Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Machine</Label>
              <select
                value={serviceForm.machineId}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, machineId: e.target.value })
                }
                className="w-full rounded border px-3 py-2 mt-1"
              >
                <option value="">Select a machine</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.productName} {m.client?.name ? `— ${m.client.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Type</Label>
                <select
                  value={serviceForm.serviceType}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, serviceType: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 mt-1"
                >
                  <option value="">Select a service type</option>
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={serviceForm.scheduledDate}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      scheduledDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Technician</Label>
                <select
                  value={serviceForm.technician}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, technician: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 mt-1"
                >
                  <option value="">Select an employee</option>
                  {technicianOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Cost (Optional)</Label>
                <Input
                  type="number"
                  value={serviceForm.cost}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={serviceForm.notes}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, notes: e.target.value })
                }
                placeholder="What was done, parts used, observations..."
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={serviceForm.markCompleted}
                onCheckedChange={(checked) =>
                  setServiceForm({
                    ...serviceForm,
                    markCompleted: checked as boolean,
                  })
                }
              />
              <Label className="cursor-pointer flex-1 mb-0">
                Mark as completed
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveService} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editingService ? "Save Changes" : "Log Service"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowServiceDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Raise Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMachine && (
              <div className="text-sm text-muted-foreground border p-3 rounded-md bg-slate-50">
                <span className="font-semibold text-slate-900">Machine:</span>{" "}
                {selectedMachine.productName}
                {selectedMachine.serialNumber
                  ? ` (${selectedMachine.serialNumber})`
                  : ""}
                <br />
                <span className="font-semibold text-slate-900">Client:</span>{" "}
                {selectedMachine.client?.name || "—"}
              </div>
            )}
            <div>
              <Label>Title / Issue Summary</Label>
              <Input
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                placeholder="e.g. Printer jamming"
              />
            </div>
            <div>
              <Label>Detailed Description</Label>
              <Input
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Explain the problem reported by the client..."
              />
            </div>
            <div>
              <Label>Caller (contact person)</Label>
              <select
                className="w-full mt-1 rounded border px-3 py-2 text-sm"
                value={ticketForm.callerSelect}
                onChange={(e) => applyTicketCallerSelect(e.target.value)}
              >
                {ticketCallerContacts.map((person, idx) => (
                  <option key={`${person.name}-${idx}`} value={`contact:${idx}`}>
                    {person.name}
                    {person.role ? ` · ${person.role}` : ""}
                    {person.phone ? ` · ${person.phone}` : ""}
                  </option>
                ))}
                <option value="new">
                  {ticketCallerContacts.length === 0
                    ? "Add caller (new contact)"
                    : "+ New contact person"}
                </option>
              </select>
              {ticketCallerContacts.length > 0 && ticketForm.callerSelect !== "new" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose an existing facility contact, or add a new one.
                </p>
              )}
            </div>
            {ticketForm.callerSelect === "new" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label>New caller name</Label>
                  <Input
                    value={ticketForm.callerName}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, callerName: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label>Caller phone</Label>
                  <Input
                    value={ticketForm.callerPhone}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, callerPhone: e.target.value })
                    }
                    placeholder="+254 700 000000"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Contact role</Label>
                  <select
                    className="w-full mt-1 rounded border px-3 py-2 text-sm"
                    value={ticketForm.callerRole}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, callerRole: e.target.value })
                    }
                  >
                    <option value="Caller">Caller</option>
                    {contactRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This person will be saved as a contact for this client.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Caller name</Label>
                  <Input value={ticketForm.callerName} readOnly className="bg-muted/40" />
                </div>
                <div>
                  <Label>Caller phone</Label>
                  <Input
                    value={ticketForm.callerPhone}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, callerPhone: e.target.value })
                    }
                    placeholder="Optional phone update"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button disabled={saving} onClick={handleRaiseTicket}>
                {saving ? "Saving..." : "Submit Ticket"}
              </Button>
              <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve / Escalate Ticket Dialog */}
      <Dialog
        open={!!ticketAction}
        onOpenChange={(open) => {
          if (!open) setTicketAction(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {ticketAction?.mode === "resolve"
                ? "Resolve ticket"
                : "Escalate to service"}
            </DialogTitle>
          </DialogHeader>
          {ticketAction && (
            <div className="space-y-4">
              <div className="text-sm border rounded-md bg-slate-50 p-3 space-y-1">
                <p className="font-medium text-slate-900">{ticketAction.ticket.title}</p>
                <p className="text-muted-foreground line-clamp-3">
                  {ticketAction.ticket.description}
                </p>
              </div>

              {ticketAction.mode === "resolve" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Mark this ticket resolved without creating a service — for example when the issue was fixed during the conversation.
                  </p>
                  <div>
                    <Label>Resolution note</Label>
                    <Input
                      value={ticketActionForm.resolutionNote}
                      onChange={(e) =>
                        setTicketActionForm({
                          ...ticketActionForm,
                          resolutionNote: e.target.value,
                        })
                      }
                      placeholder="e.g. Guided caller through reboot; working again"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Creates a machine service and a draft quotation under Stock → Quotations.
                  </p>
                  <div>
                    <Label>Machine</Label>
                    <select
                      className="w-full mt-1 rounded border px-3 py-2 text-sm"
                      value={ticketActionForm.machineId}
                      onChange={(e) =>
                        setTicketActionForm({
                          ...ticketActionForm,
                          machineId: e.target.value,
                        })
                      }
                    >
                      <option value="">Select machine…</option>
                      {machines.map((m) => (
                        <option key={m._id} value={m._id}>
                          {(m.serialNumber || m.productName || m._id) +
                            (m.client?.name ? ` — ${m.client.name}` : "")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Service type</Label>
                      <Input
                        value={ticketActionForm.serviceType}
                        onChange={(e) =>
                          setTicketActionForm({
                            ...ticketActionForm,
                            serviceType: e.target.value,
                          })
                        }
                        placeholder="Repair / Maintenance"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Quoted cost</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={ticketActionForm.cost}
                        onChange={(e) =>
                          setTicketActionForm({
                            ...ticketActionForm,
                            cost: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Scheduled date</Label>
                      <Input
                        type="date"
                        value={ticketActionForm.scheduledDate}
                        onChange={(e) =>
                          setTicketActionForm({
                            ...ticketActionForm,
                            scheduledDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Technician</Label>
                      <select
                        className="w-full mt-1 rounded border px-3 py-2 text-sm"
                        value={ticketActionForm.technician}
                        onChange={(e) =>
                          setTicketActionForm({
                            ...ticketActionForm,
                            technician: e.target.value,
                          })
                        }
                      >
                        <option value="">Optional…</option>
                        {technicianOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Service / quotation notes</Label>
                    <Input
                      value={ticketActionForm.notes}
                      onChange={(e) =>
                        setTicketActionForm({
                          ...ticketActionForm,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Details for the technician and quotation line"
                    />
                  </div>
                  <div>
                    <Label>Escalation note (optional)</Label>
                    <Input
                      value={ticketActionForm.resolutionNote}
                      onChange={(e) =>
                        setTicketActionForm({
                          ...ticketActionForm,
                          resolutionNote: e.target.value,
                        })
                      }
                      placeholder="Why this was escalated"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button disabled={saving} onClick={submitTicketAction}>
                  {saving
                    ? "Saving..."
                    : ticketAction.mode === "resolve"
                      ? "Mark resolved"
                      : "Create service & quotation"}
                </Button>
                <Button variant="outline" onClick={() => setTicketAction(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CRM Log Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call for {activeCRMClient?.client?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Outcome / Notes</Label>
              <Input
                value={callForm.note}
                onChange={(e) => setCallForm({ ...callForm, note: e.target.value })}
                placeholder="What was discussed?"
              />
            </div>
            <div>
              <Label>Next Action Status</Label>
              <select
                className="w-full mt-1 rounded border px-3 py-2 text-sm"
                value={callForm.status}
                onChange={(e) => setCallForm({ ...callForm, status: e.target.value })}
              >
                <option value="Interested">Interested</option>
                <option value="Follow-up Needed">Follow-up Needed</option>
                <option value="Pending">Pending</option>
                <option value="Quote Requested">Quote Requested</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <Label>Follow-up Date (Optional)</Label>
              <Input
                type="date"
                value={callForm.followUpDate}
                onChange={(e) => setCallForm({ ...callForm, followUpDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button disabled={saving} onClick={handleLogCallSubmit}>
                {saving ? "Saving..." : "Save Call Log"}
              </Button>
              <Button variant="outline" onClick={() => setShowCallDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CRM History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Interaction History: {activeCRMClient?.client?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {clientHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No logged interactions yet.</p>
            ) : (
              clientHistory.map((h, i) => (
                <div key={i} className="border-b pb-3 last:border-0 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-900">{h.roomName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700">{h.note}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">{h.status}</Badge>
                    {h.followUpDate && <Badge variant="secondary">Follow-up: {new Date(h.followUpDate).toLocaleDateString()}</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Facility contacts dialog */}
      <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Contacts — {activeCRMClient?.client?.name || "Facility"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add different personnel at this facility (doctor, lab technician, etc.) with phone and email.
          </p>
          <div className="space-y-3">
            {contactsDraft.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              contactsDraft.map((person, idx) => (
                <div
                  key={`${person.role}-${person.name}-${idx}`}
                  className="rounded-lg border p-3 text-sm flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="font-medium">
                      {person.role}: {person.name}
                    </p>
                    {person.phone && <p className="text-muted-foreground">{person.phone}</p>}
                    {person.email && <p className="text-muted-foreground">{person.email}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      setContactsDraft((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-medium">Add contact</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Role</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
                  value={contactForm.role}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, role: e.target.value })
                  }
                >
                  {contactRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {contactForm.role === "Other" && (
                <div>
                  <Label>Custom role</Label>
                  <Input
                    value={contactForm.customRole}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, customRole: e.target.value })
                    }
                    placeholder="e.g. Biomedical Engineer"
                  />
                </div>
              )}
              <div>
                <Label>Name</Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                  placeholder="Person name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, phone: e.target.value })
                  }
                  placeholder="+254…"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  placeholder="name@facility.com"
                />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addContactToDraft}>
              Add to list
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowContactsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveContacts} disabled={saving}>
              {saving ? "Saving…" : "Save contacts"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create client group dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create client group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Example: Private, Public, NGO. Selected clients ({selectedClientKeys.length}) will be added automatically.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Group name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Private"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Private hospitals and clinics"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createGroup} disabled={saving}>
              {saving ? "Creating…" : "Create group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}