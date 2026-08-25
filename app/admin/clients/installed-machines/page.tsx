"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import api, { stockApi, usersApi } from "@/lib/api";
import { getToken } from "@/lib/auth";
import API_URL from "@/lib/apiBase";
import { finishDataLoad, startDataLoad } from "@/lib/silent-load";
import { useToast } from "@/hooks/use-toast";
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
  Upload,
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
  category?: string;
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
  attendantRole?: string;
  isTrained?: boolean;
  photoUrl?: string;
  notes?: string;
  invoiceId?: string;
  quotationId?: string;
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
    client?: {
      name: string;
      number?: string;
      location?: string;
      contactPerson?: string;
    };
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
  machineStatus: string;
  attendant: string;
  attendantRole: string;
  attendantNumber: string;
  nextServiceDate: string;
}

const EMPTY_SERVICE_FORM: ServiceFormState = {
  machineId: "",
  serviceType: "",
  scheduledDate: "",
  technician: "",
  notes: "",
  cost: "",
  markCompleted: false,
  machineStatus: "active",
  attendant: "",
  attendantRole: "",
  attendantNumber: "",
  nextServiceDate: "",
};

const MACHINE_STATUS_OPTIONS = [
  { value: "active", label: "Active / Working" },
  { value: "maintenance", label: "Needs maintenance" },
  { value: "ended", label: "Ended / Decommissioned" },
  { value: "installation_pending", label: "Installation pending" },
];

interface ScheduleInstallationForm {
  invoiceId: string;
  candidateKey: string;
  engineer: string;
  installationDate: string;
  serialNumber: string;
  installationLocation: string;
  clientContactPerson: string;
  attendant: string;
  attendantRole: string;
  attendantNumber: string;
  notes: string;
}

const EMPTY_SCHEDULE_FORM: ScheduleInstallationForm = {
  invoiceId: "",
  candidateKey: "",
  engineer: "",
  installationDate: "",
  serialNumber: "",
  installationLocation: "",
  clientContactPerson: "",
  attendant: "",
  attendantRole: "",
  attendantNumber: "",
  notes: "",
};

interface ManualAddForm {
  facilityMode: "existing" | "custom";
  clientKey: string;
  customFacilityName: string;
  customFacilityLocation: string;
  customFacilityPhone: string;
  customContactPerson: string;
  machineCategory: string;
  machineName: string;
  serialNumber: string;
  installationLocation: string;
  installationDepartment: string;
  installationDate: string;
  warrantyUntil: string;
  installedBy: string;
  status: string;
  nextServiceDate: string;
  attendant: string;
  attendantRole: string;
  attendantNumber: string;
  notes: string;
  isTrained: boolean;
}

const EMPTY_MANUAL_ADD_FORM: ManualAddForm = {
  facilityMode: "existing",
  clientKey: "",
  customFacilityName: "",
  customFacilityLocation: "",
  customFacilityPhone: "",
  customContactPerson: "",
  machineCategory: "",
  machineName: "",
  serialNumber: "",
  installationLocation: "",
  installationDepartment: "",
  installationDate: "",
  warrantyUntil: "",
  installedBy: "",
  status: "active",
  nextServiceDate: "",
  attendant: "",
  attendantRole: "",
  attendantNumber: "",
  notes: "",
  isTrained: false,
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
  onClientClick,
  onLogCall,
  onCallHistory,
}: {
  service: ServiceRecord;
  onMarkDone?: (s: ServiceRecord) => void;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (s: ServiceRecord) => void;
  onClientClick?: (s: ServiceRecord) => void;
  onLogCall?: (s: ServiceRecord) => void;
  onCallHistory?: (s: ServiceRecord) => void;
}) {
  const clientName = service.machine?.client?.name || "";

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
          {clientName && onClientClick ? (
            <button
              type="button"
              className="font-medium text-foreground underline-offset-2 hover:underline hover:text-teal-700"
              onClick={(event) => {
                event.stopPropagation();
                onClientClick(service);
              }}
            >
              {clientName}
            </button>
          ) : (
            clientName || "—"
          )}
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
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {onLogCall ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 whitespace-nowrap text-xs"
            onClick={() => onLogCall(service)}
          >
            <PhoneCall className="mr-1 h-3.5 w-3.5" />
            Log call
          </Button>
        ) : null}
        {onCallHistory ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 whitespace-nowrap text-xs"
            onClick={() => onCallHistory(service)}
          >
            <MessageSquare className="mr-1 h-3.5 w-3.5" />
            Call history
          </Button>
        ) : null}
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
            <DropdownMenuContent align="end" className="w-48">
              {clientName && onClientClick ? (
                <DropdownMenuItem onClick={() => onClientClick(service)}>
                  View client details
                </DropdownMenuItem>
              ) : null}
              {onLogCall ? (
                <DropdownMenuItem onClick={() => onLogCall(service)}>
                  Log call
                </DropdownMenuItem>
              ) : null}
              {onCallHistory ? (
                <DropdownMenuItem onClick={() => onCallHistory(service)}>
                  Call history
                </DropdownMenuItem>
              ) : null}
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
        {service.isReminder && clientName && onClientClick ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 whitespace-nowrap text-xs"
            onClick={() => onClientClick(service)}
          >
            <Users className="mr-1 h-3.5 w-3.5" />
            Client
          </Button>
        ) : null}
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
  const machineLoadGeneration = useRef(0);
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
  const [showBulkUploadPanel, setShowBulkUploadPanel] = useState(false);
  const [showManualAddDialog, setShowManualAddDialog] = useState(false);
  const [manualAddForm, setManualAddForm] =
    useState<ManualAddForm>(EMPTY_MANUAL_ADD_FORM);
  const [products, setProducts] = useState<any[]>([]);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [scheduleForm, setScheduleForm] =
    useState<ScheduleInstallationForm>(EMPTY_SCHEDULE_FORM);
  const [uploadingMachines, setUploadingMachines] = useState(false);
  const machineFileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [showClientDetailsDialog, setShowClientDetailsDialog] = useState(false);
  const [clientDetailsView, setClientDetailsView] = useState<{
    name: string;
    number?: string;
    location?: string;
    contactPerson?: string;
    email?: string;
    contacts: FacilityContact[];
    machines: InstalledMachine[];
    customerRow: any | null;
  } | null>(null);
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
  const [machineCategoryFilter, setMachineCategoryFilter] = useState("");
  const [machinePage, setMachinePage] = useState(1);
  const machinePageSize = 20;
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
  const [activeCRMMachine, setActiveCRMMachine] = useState<InstalledMachine | null>(null);
  const [callForm, setCallForm] = useState({
    note: "",
    callPurpose: "Machine follow-up",
    focusCategoryIds: [] as string[],
    outcome: "Interested",
    createLead: false,
    followUpNeeded: false,
    followUpDate: "",
  });
  const [callPurposes, setCallPurposes] = useState<string[]>([
    "Machine follow-up",
    "Service reminder",
    "Installation follow-up",
    "Company introduction",
    "Quotation follow up",
    "Debt collection",
    "Delivery inquiry",
    "Project inquiry",
  ]);
  const [sellingPurposes, setSellingPurposes] = useState<string[]>([
    "Company introduction",
    "Quotation follow up",
    "Project inquiry",
  ]);
  const [stockCategories, setStockCategories] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [addingPurpose, setAddingPurpose] = useState(false);
  const [newPurpose, setNewPurpose] = useState("");
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [savingCrm, setSavingCrm] = useState(false);
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ---------------------------- Data loading ---------------------------- */

  const load = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setIsRefreshing);
    const generation = ++machineLoadGeneration.current;
    try {
      const firstPage = await stockApi.getInstalledMachines(1, 20);
      if (generation !== machineLoadGeneration.current) return;
      const initialMachines = (firstPage?.data || []) as InstalledMachine[];
      setMachines(initialMachines);

      // Load the rest in one follow-up request (avoids dozens of page calls).
      if (firstPage?.meta?.hasMore) {
        void stockApi
          .getInstalledMachines()
          .then((allRes) => {
            if (generation !== machineLoadGeneration.current) return;
            setMachines((allRes?.data || []) as InstalledMachine[]);
          })
          .catch(() => {
            // Keep the first machine page usable if background loading is interrupted.
          });
      }

      void (async () => {
        const [
          candRes,
          sRes,
          tRes,
          accountsRes,
          savedRes,
          groupsRes,
          rolesRes,
          productsRes,
          usersRes,
        ] = await Promise.all([
          stockApi
            .getInstallableCandidates()
            .catch(() => ({ success: false, data: { categories: [], candidates: [] } })),
          stockApi.getMachineServices
            ? stockApi
                .getMachineServices()
                .catch(() => ({ success: false, data: [] }))
            : Promise.resolve({ success: true, data: [] }),
          api.crm.getTickets().catch(() => ({ success: false, data: [] })),
          stockApi
            .getAccountsClients()
            .catch(() => ({ success: false, data: [] })),
          stockApi
            .getSavedClients()
            .catch(() => ({ success: false, data: [] })),
          stockApi
            .getClientGroups()
            .catch(() => ({ success: false, data: [] })),
          stockApi
            .getClientContactRoles()
            .catch(() => ({ success: false, data: [] })),
          stockApi.getProducts().catch(() => ({ success: false, data: [] })),
          usersApi.getAll().catch(() => ({ success: false, data: [] })),
        ]);
        if (generation !== machineLoadGeneration.current) return;

        if (tRes?.success) setTickets(tRes.data || []);
        setClientGroups(groupsRes?.data || []);
        if (Array.isArray(rolesRes?.data) && rolesRes.data.length > 0) {
          setContactRoles(rolesRes.data);
        }

        const accountsRows = accountsRes.data || [];
        const savedClients = savedRes.data || [];
        const mergedMap = new Map<string, any>();
        for (const row of accountsRows) {
          mergedMap.set(row.key, {
            ...row,
            contacts: [],
            groupIds: [],
            isSavedClient: false,
          });
        }
        for (const client of savedClients) {
          const key = `${String(client.name || "").trim().toLowerCase()}|${String(client.number || "").trim().toLowerCase()}|${String(client.location || "").trim().toLowerCase()}`;
          if (!key) continue;
          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            existing.client.contactPerson =
              client.contactPerson || existing.client.contactPerson;
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

        const productsArray =
          productsRes &&
          (productsRes.data || Array.isArray(productsRes)
            ? productsRes.data || productsRes
            : []);
        setProducts(
          (productsArray as any[]).filter(
            (p) => String(p.productType || "physical") !== "service",
          ),
        );

        const payload =
          candRes.data || candRes || { categories: [], candidates: [] };
        setCategories(payload.categories || []);
        setCandidates(payload.candidates || []);
        setServices(Array.isArray(sRes?.data) ? sRes.data : []);
        setEmployees(Array.isArray(usersRes?.data) ? usersRes.data : []);
      })().catch((error) => {
        console.error("Failed to load supporting machine data", error);
      });
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

  const openClientDetailsFromService = (service: ServiceRecord) => {
    const linkedMachine =
      machines.find((m) => m._id === service.machineId) || null;
    const clientFromService = service.machine?.client;
    const clientFromMachine = linkedMachine?.client;
    const clientName =
      clientFromService?.name || clientFromMachine?.name || "";
    if (!clientName) {
      toast({
        title: "No client linked",
        description: "This service has no client details to show.",
        variant: "destructive",
      });
      return;
    }

    const proxyMachine: InstalledMachine = linkedMachine || {
      _id: service.machineId || "unknown",
      productName: service.machine?.productName || "Machine",
      serialNumber: service.machine?.serialNumber,
      client: {
        name: clientName,
        number: clientFromService?.number || clientFromMachine?.number,
        location: clientFromService?.location || clientFromMachine?.location,
        contactPerson:
          clientFromService?.contactPerson || clientFromMachine?.contactPerson,
      },
    };

    const customerRow = findCustomerRowForMachine(customers, proxyMachine);
    const contacts = contactsFromCustomerRow(customerRow);
    if (
      proxyMachine.attendant &&
      !contacts.some((c) => namesMatch(c.name, proxyMachine.attendant))
    ) {
      contacts.push({
        role: proxyMachine.attendantRole || "Attendant",
        name: proxyMachine.attendant,
        phone: proxyMachine.attendantNumber || "",
      });
    }

    const relatedMachines = machines.filter(
      (m) =>
        String(m.client?.name || "")
          .trim()
          .toLowerCase() === clientName.trim().toLowerCase(),
    );

    setClientDetailsView({
      name: clientName,
      number:
        customerRow?.client?.number ||
        clientFromService?.number ||
        clientFromMachine?.number,
      location:
        customerRow?.client?.location ||
        clientFromService?.location ||
        clientFromMachine?.location,
      contactPerson:
        customerRow?.client?.contactPerson ||
        clientFromService?.contactPerson ||
        clientFromMachine?.contactPerson,
      email: customerRow?.client?.email,
      contacts,
      machines: relatedMachines.length
        ? relatedMachines
        : linkedMachine
          ? [linkedMachine]
          : [],
      customerRow,
    });
    setShowClientDetailsDialog(true);
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

  const machineCategoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const machine of machines) {
      const category = String(machine.category || "").trim();
      if (category) categories.add(category);
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [machines]);

  const filteredMachines = useMemo(() => {
    const query = machineSearch.trim().toLowerCase();
    return machines.filter((m) => {
      if (machineCategoryFilter) {
        const category = String(m.category || "").trim();
        if (category !== machineCategoryFilter) return false;
      }
      if (!query) return true;
      return (
        m.productName.toLowerCase().includes(query) ||
        m.client?.name.toLowerCase().includes(query) ||
        m.serialNumber?.toLowerCase().includes(query) ||
        m.installationLocation?.toLowerCase().includes(query) ||
        String(m.category || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [machines, machineSearch, machineCategoryFilter]);

  useEffect(() => {
    setMachinePage(1);
  }, [machineSearch, machineCategoryFilter]);

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

  const invoiceOptions = useMemo(() => {
    const map = new Map<string, { invoiceId: string; invoiceNumber: string; clientName: string }>();
    for (const item of candidates) {
      const invoiceId = String(item.invoiceId || "");
      if (!invoiceId || map.has(invoiceId)) continue;
      map.set(invoiceId, {
        invoiceId,
        invoiceNumber: String(item.invoiceNumber || invoiceId.slice(-6)),
        clientName: String(item.client?.name || "Client"),
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.invoiceNumber.localeCompare(b.invoiceNumber),
    );
  }, [candidates]);

  const scheduleCandidates = useMemo(() => {
    if (!scheduleForm.invoiceId) return [];
    return candidates.filter(
      (item) => String(item.invoiceId) === scheduleForm.invoiceId,
    );
  }, [candidates, scheduleForm.invoiceId]);

  const engineerOptions = useMemo(() => {
    const options = employees.map((employee) => ({
      value: getEmployeeLabel(employee),
      label: getEmployeeLabel(employee),
    }));
    if (
      scheduleForm.engineer &&
      !options.some((option) => option.value === scheduleForm.engineer)
    ) {
      options.unshift({
        value: scheduleForm.engineer,
        label: scheduleForm.engineer,
      });
    }
    return options;
  }, [employees, scheduleForm.engineer]);

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

  const isSellingPurpose = sellingPurposes.includes(callForm.callPurpose);

  const openCallDialogForMachine = async (
    machine: InstalledMachine,
    quoteRequested = false,
  ) => {
    setActiveCRMMachine(machine);
    setCallForm({
      note: quoteRequested
        ? `Client requested a quotation for ${machine.productName}.`
        : "",
      callPurpose: quoteRequested ? "Quotation follow up" : "Machine follow-up",
      focusCategoryIds: [],
      outcome: quoteRequested ? "Quote Requested" : "Interested",
      createLead: false,
      followUpNeeded: false,
      followUpDate: "",
    });
    setNewPurpose("");
    setAddingPurpose(false);
    setShowCallDialog(true);

    try {
      const [purposesRes, categoriesRes] = await Promise.all([
        api.crm.getCallPurposes().catch(() => null),
        fetch(`${API_URL}/api/stock/categories`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if (purposesRes?.success && purposesRes.data) {
        const purposes = purposesRes.data.purposes || [];
        const withMachineDefaults = Array.from(
          new Set(["Machine follow-up", "Service reminder", "Installation follow-up", ...purposes]),
        );
        setCallPurposes(withMachineDefaults);
        if (Array.isArray(purposesRes.data.sellingPurposes)) {
          setSellingPurposes(purposesRes.data.sellingPurposes);
        }
      }
      if (categoriesRes?.success && Array.isArray(categoriesRes.data)) {
        setStockCategories(
          categoriesRes.data.map((c: any) => ({
            _id: String(c._id),
            name: String(c.name || ""),
          })),
        );
      }
    } catch {
      // keep defaults
    }
  };

  const handleAddCallPurpose = async () => {
    const purpose = newPurpose.trim();
    if (!purpose) return;
    try {
      setSavingCrm(true);
      const res = await api.crm.addCallPurpose(purpose);
      const nextPurposes = res?.data?.purposes || [...callPurposes, purpose];
      setCallPurposes(nextPurposes);
      setCallForm((current) => ({ ...current, callPurpose: purpose }));
      setNewPurpose("");
      setAddingPurpose(false);
    } catch (error: any) {
      toast({
        title: "Failed to add purpose",
        description: error?.message || "Could not add call purpose",
        variant: "destructive",
      });
    } finally {
      setSavingCrm(false);
    }
  };

  const toggleFocusCategory = (categoryId: string) => {
    setCallForm((current) => {
      const exists = current.focusCategoryIds.includes(categoryId);
      return {
        ...current,
        focusCategoryIds: exists
          ? current.focusCategoryIds.filter((id) => id !== categoryId)
          : [...current.focusCategoryIds, categoryId],
      };
    });
  };

  const handleLogCallSubmit = async () => {
    if (!activeCRMMachine || !callForm.note.trim()) {
      toast({
        title: "Notes required",
        description: "Enter what was discussed on the call.",
        variant: "destructive",
      });
      return;
    }
    if (!callForm.callPurpose.trim()) {
      toast({
        title: "Call purpose required",
        description: "Select or add a call purpose.",
        variant: "destructive",
      });
      return;
    }
    const followUpNeeded =
      callForm.followUpNeeded || callForm.outcome === "Follow-up Needed";
    if (followUpNeeded && !callForm.followUpDate) {
      toast({
        title: "Follow-up date required",
        description: "Choose a follow-up date when follow-up is needed.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingCrm(true);
      const focusCategories = stockCategories
        .filter((c) => callForm.focusCategoryIds.includes(c._id))
        .map((c) => ({ id: c._id, name: c.name }));

      const res = await api.crm.createConversation({
        roomName: "Telesales",
        source: "installed_machine",
        relatedMachineId: activeCRMMachine._id,
        relatedMachineName:
          activeCRMMachine.productName ||
          activeCRMMachine.serialNumber ||
          "Machine",
        note: callForm.note.trim(),
        callPurpose: callForm.callPurpose,
        focusCategories,
        outcome: callForm.outcome,
        status: callForm.outcome,
        createLead:
          callForm.outcome === "Interested" ? callForm.createLead : false,
        followUpNeeded,
        followUpDate: followUpNeeded ? callForm.followUpDate : undefined,
        clientName: activeCRMMachine.client?.name || "",
        clientPhone: activeCRMMachine.client?.number || "",
        contactPerson: activeCRMMachine.client?.contactPerson || "",
        clientLocation: activeCRMMachine.client?.location || "",
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to save call");
      }

      setShowCallDialog(false);
      toast({
        title: "Call logged",
        description: followUpNeeded
          ? "Saved and added to Telesales Activity planner."
          : "Call activity saved and available in Telesales reports.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to log call",
        description: err?.message || "Could not save call activity",
        variant: "destructive",
      });
    } finally {
      setSavingCrm(false);
    }
  };

  const openHistoryDialogForMachine = async (machine: InstalledMachine) => {
    setActiveCRMMachine(machine);
    setClientHistory([]);
    setShowHistoryDialog(true);
    try {
      const res = await api.crm.getConversations({
        relatedMachineId: machine._id,
      });
      if (res.success) {
        setClientHistory(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load history",
        description: "Could not load call history for this machine.",
        variant: "destructive",
      });
    }
  };

  const resolveMachineFromService = (
    service: ServiceRecord,
  ): InstalledMachine | null => {
    const linked = machines.find((m) => m._id === service.machineId);
    if (linked) return linked;
    if (!service.machineId && !service.machine?.productName) return null;
    return {
      _id: service.machineId || `temp-${service._id}`,
      productName: service.machine?.productName || "Machine",
      serialNumber: service.machine?.serialNumber,
      client: service.machine?.client
        ? {
            name: service.machine.client.name,
            number: service.machine.client.number,
            location: service.machine.client.location,
            contactPerson: service.machine.client.contactPerson,
          }
        : undefined,
    };
  };

  const openLogCallFromService = (service: ServiceRecord) => {
    const machine = resolveMachineFromService(service);
    if (!machine?._id || String(machine._id).startsWith("temp-")) {
      toast({
        title: "Machine not found",
        description: "Could not link this service to an installed machine.",
        variant: "destructive",
      });
      return;
    }
    void openCallDialogForMachine(machine);
  };

  const openCallHistoryFromService = (service: ServiceRecord) => {
    const machine = resolveMachineFromService(service);
    if (!machine?._id || String(machine._id).startsWith("temp-")) {
      toast({
        title: "Machine not found",
        description: "Could not link this service to an installed machine.",
        variant: "destructive",
      });
      return;
    }
    void openHistoryDialogForMachine(machine);
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
      productName: machine.productName || "",
      category: machine.category || "",
      serialNumber: machine.serialNumber || "",
      nextServiceDate: machine.nextServiceDate || "",
      installedBy: machine.installedBy || "",
      attendant: machine.attendant || "",
      attendantNumber: machine.attendantNumber || "",
      attendantRole: machine.attendantRole || "",
      isTrained: machine.isTrained || false,
      installationLocation: machine.installationLocation || "",
      status: machine.status || "active",
      notes: machine.notes || "",
    });
    setShowDetailDialog(true);
  };

  const saveDetails = async () => {
    if (!editingMachine || !editingMachine._id) return;
    if (!String(detailForm.productName || "").trim()) {
      toast({
        title: "Machine name required",
        description: "Enter the name of the machine.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...detailForm,
        productName: String(detailForm.productName || "").trim(),
        category: String(detailForm.category || "").trim() || undefined,
      };
      const res = await stockApi.updateInstalledMachine(editingMachine._id, payload);
      const updated = res?.data || { ...editingMachine, ...payload };
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

  const openManualAddDialog = () => {
    setSection("machines");
    setShowCandidates(false);
    setShowBulkUploadPanel(false);
    setShowSchedulePanel(false);
    setManualAddForm(EMPTY_MANUAL_ADD_FORM);
    setShowManualAddDialog(true);
  };

  const saveManualMachine = async () => {
    let clientPayload: {
      name: string;
      number?: string;
      location?: string;
      contactPerson?: string;
    };

    if (manualAddForm.facilityMode === "existing") {
      if (!manualAddForm.clientKey) {
        toast({
          title: "Facility required",
          description: "Select a facility or switch to enter a new one.",
          variant: "destructive",
        });
        return;
      }
      const customer = customers.find((c) => c.key === manualAddForm.clientKey);
      if (!customer) {
        toast({
          title: "Facility not found",
          description: "Please select a valid facility.",
          variant: "destructive",
        });
        return;
      }
      clientPayload = {
        name: customer.client?.name || "",
        number: customer.client?.number || undefined,
        location: customer.client?.location || undefined,
        contactPerson: customer.client?.contactPerson || undefined,
      };
    } else {
      if (!manualAddForm.customFacilityName.trim()) {
        toast({
          title: "Facility name required",
          description: "Enter the facility name.",
          variant: "destructive",
        });
        return;
      }
      clientPayload = {
        name: manualAddForm.customFacilityName.trim(),
        number: manualAddForm.customFacilityPhone.trim() || undefined,
        location: manualAddForm.customFacilityLocation.trim() || undefined,
        contactPerson: manualAddForm.customContactPerson.trim() || undefined,
      };
    }

    if (!manualAddForm.machineName.trim()) {
      toast({
        title: "Machine name required",
        description: "Enter the name of the machine.",
        variant: "destructive",
      });
      return;
    }

    if (!manualAddForm.machineCategory.trim()) {
      toast({
        title: "General term required",
        description: "Enter the machine's general term, such as Maternity.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await stockApi.createInstalledMachine({
        client: clientPayload,
        productId: `manual-${Date.now()}`,
        productName: manualAddForm.machineName.trim(),
        category: manualAddForm.machineCategory.trim(),
        serialNumber: manualAddForm.serialNumber.trim() || undefined,
        installationLocation: manualAddForm.installationLocation.trim() || undefined,
        installationDepartment:
          manualAddForm.installationDepartment.trim() || undefined,
        installationDate: manualAddForm.installationDate || undefined,
        warrantyUntil: manualAddForm.warrantyUntil || undefined,
        installedBy: manualAddForm.installedBy.trim() || undefined,
        status: manualAddForm.status || "active",
        nextServiceDate: manualAddForm.nextServiceDate || undefined,
        attendant: manualAddForm.attendant.trim() || undefined,
        attendantNumber: manualAddForm.attendantNumber.trim() || undefined,
        attendantRole: manualAddForm.attendantRole.trim() || undefined,
        notes: manualAddForm.notes.trim() || undefined,
        isTrained: manualAddForm.isTrained,
      });

      if (!res?.success && !res?.data) {
        throw new Error(res?.message || "Failed to create machine");
      }

      const created = res.data;
      if (created?._id) {
        setMachines((prev) => [created, ...prev]);
      } else {
        await load({ silent: true });
      }

      toast({
        title: "Machine added",
        description: `${manualAddForm.machineName.trim()} registered at ${clientPayload.name}.`,
      });
      setShowManualAddDialog(false);
      setManualAddForm(EMPTY_MANUAL_ADD_FORM);
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not add machine.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const scheduleInstallation = async () => {
    if (!scheduleForm.invoiceId) return alert("Select an invoice");
    if (!scheduleForm.candidateKey) return alert("Select a machine from the invoice");
    if (!scheduleForm.engineer.trim()) return alert("Assign an engineer");
    if (!scheduleForm.installationDate) return alert("Select an installation date");

    const selected = scheduleCandidates.find((candidate, index) => {
      const key = `${candidate.invoiceId}::${candidate.productId}::${index}`;
      return key === scheduleForm.candidateKey;
    });

    if (!selected) return alert("Selected machine line was not found");

    setSaving(true);
    try {
      const res = await stockApi.createInstalledMachine({
        client: {
          ...(selected.client || {}),
          contactPerson:
            scheduleForm.clientContactPerson ||
            (selected.client as any)?.contactPerson ||
            "",
        },
        productId: selected.productId,
        productName: selected.productName,
        category: selected.category,
        invoiceId: selected.invoiceId,
        quotationId: selected.quotationId,
        serialNumber: scheduleForm.serialNumber || undefined,
        installationLocation:
          scheduleForm.installationLocation ||
          selected.client?.location ||
          undefined,
        installationDate: new Date(scheduleForm.installationDate).toISOString(),
        installedBy: scheduleForm.engineer.trim(),
        attendant: scheduleForm.attendant || undefined,
        attendantRole: scheduleForm.attendantRole || undefined,
        attendantNumber: scheduleForm.attendantNumber || undefined,
        notes: scheduleForm.notes || undefined,
        status: "installation_pending",
        isActive: true,
      });

      if (res?.data) {
        setMachines((prev) => [res.data, ...prev]);
      } else {
        await load({ silent: true });
      }

      setScheduleForm(EMPTY_SCHEDULE_FORM);
      setShowSchedulePanel(false);
      alert(
        "Installation scheduled. It will appear under Telesales Activity → Installations.",
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to schedule installation");
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
    const target = machine || selectedMachine;
    setEditingService(null);
    setServiceForm({
      ...EMPTY_SERVICE_FORM,
      machineId: target?._id || "",
      attendant: target?.attendant || "",
      attendantRole: target?.attendantRole || "",
      attendantNumber: target?.attendantNumber || "",
      machineStatus: target?.status === "installation_pending" ? "active" : target?.status || "active",
      nextServiceDate: toInputDate(target?.nextServiceDate),
    });
    setShowServiceDialog(true);
  };

  const openEditServiceDialog = (service: ServiceRecord) => {
    const machine = machines.find((m) => m._id === service.machineId);
    setEditingService(service);
    setServiceForm({
      machineId: service.machineId,
      serviceType: service.serviceType || "",
      scheduledDate: toInputDate(service.scheduledDate),
      technician: service.technician || "",
      notes: service.notes || "",
      cost: service.cost != null ? String(service.cost) : "",
      markCompleted: !!service.completedDate,
      machineStatus: machine?.status || "active",
      attendant: machine?.attendant || "",
      attendantRole: machine?.attendantRole || "",
      attendantNumber: machine?.attendantNumber || "",
      nextServiceDate: toInputDate(machine?.nextServiceDate),
    });
    setShowServiceDialog(true);
  };

  const applyServiceCompletionToMachine = async (machineId: string) => {
    if (!machineId) return;
    const updates: Record<string, any> = {
      status: serviceForm.machineStatus || "active",
      attendant: serviceForm.attendant || "",
      attendantRole: serviceForm.attendantRole || "",
      attendantNumber: serviceForm.attendantNumber || "",
    };
    if (serviceForm.nextServiceDate) {
      updates.nextServiceDate = new Date(serviceForm.nextServiceDate).toISOString();
    }
    const res = await stockApi.updateInstalledMachine(machineId, updates);
    const updated = res?.data || updates;
    setMachines((prev) =>
      prev.map((m) => (m._id === machineId ? { ...m, ...updated } : m)),
    );
    setSelectedMachine((prev) =>
      prev?._id === machineId ? { ...prev, ...updated } : prev,
    );

    if (serviceForm.nextServiceDate) {
      const alreadyScheduled = services.some(
        (service) =>
          service.machineId === machineId &&
          !service.completedDate &&
          toInputDate(service.scheduledDate) === serviceForm.nextServiceDate,
      );
      if (!alreadyScheduled) {
        await stockApi.createMachineService({
          machineId,
          serviceType: "Next service",
          scheduledDate: new Date(serviceForm.nextServiceDate).toISOString(),
          completedDate: null,
          technician: serviceForm.technician || "",
          notes: "Scheduled after service completion",
        });
      }
    }
  };

  const saveService = async () => {
    if (!serviceForm.machineId) return alert("Select a machine");
    if (editingService?.isReminder) {
      alert("This reminder cannot be edited directly.");
      return;
    }
    if (serviceForm.markCompleted) {
      if (!serviceForm.attendant.trim()) {
        return alert("Enter the person left in charge of the machine");
      }
      if (!serviceForm.attendantRole.trim()) {
        return alert("Enter the role of the person left in charge");
      }
      if (!serviceForm.nextServiceDate) {
        return alert("Enter the next service date");
      }
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

      if (serviceForm.markCompleted) {
        await applyServiceCompletionToMachine(serviceForm.machineId);
        await load({ silent: true });
      }

      setShowServiceDialog(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const markServiceDone = (service: ServiceRecord) => {
    if (service.isReminder) {
      alert("This reminder is not a saved service record.");
      return;
    }
    const machine = machines.find((m) => m._id === service.machineId);
    setEditingService(service);
    setServiceForm({
      machineId: service.machineId,
      serviceType: service.serviceType || "",
      scheduledDate: toInputDate(service.scheduledDate),
      technician: service.technician || "",
      notes: service.notes || "",
      cost: service.cost != null ? String(service.cost) : "",
      markCompleted: true,
      machineStatus:
        machine?.status === "installation_pending"
          ? "active"
          : machine?.status || "active",
      attendant: machine?.attendant || "",
      attendantRole: machine?.attendantRole || "",
      attendantNumber: machine?.attendantNumber || "",
      nextServiceDate: toInputDate(machine?.nextServiceDate),
    });
    setShowServiceDialog(true);
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
                setShowSchedulePanel((v) => !v);
                if (!showSchedulePanel) {
                  setShowCandidates(false);
                  setShowBulkUploadPanel(false);
                  setShowManualAddDialog(false);
                }
              }}
              className="flex items-center gap-2"
            >
              <CalendarClock className="h-4 w-4" />
              {showSchedulePanel ? "Hide" : "Schedule"} Installation
            </Button>
            <Button
              onClick={() => {
                setSection("machines");
                setShowCandidates((v) => !v);
                if (!showCandidates) {
                  setShowBulkUploadPanel(false);
                  setShowSchedulePanel(false);
                  setShowManualAddDialog(false);
                }
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showCandidates ? "Hide" : "Add"} Machines
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={openManualAddDialog}
            >
              <Plus className="h-4 w-4" />
              Add Machine Manually
            </Button>
            <Button
              variant={showBulkUploadPanel ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => {
                setSection("machines");
                setShowBulkUploadPanel((v) => !v);
                if (!showBulkUploadPanel) {
                  setShowCandidates(false);
                  setShowSchedulePanel(false);
                  setShowManualAddDialog(false);
                }
              }}
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
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
          {showSchedulePanel && (
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">Schedule Installation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-muted-foreground">
                  Pick a delivered invoice, assign an engineer and date, then save.
                  Pending installations appear in{" "}
                  <strong>Telesales Activity → Installations</strong>.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Invoice</Label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={scheduleForm.invoiceId}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          invoiceId: e.target.value,
                          candidateKey: "",
                        }))
                      }
                    >
                      <option value="">Select invoice…</option>
                      {invoiceOptions.map((invoice) => (
                        <option key={invoice.invoiceId} value={invoice.invoiceId}>
                          {invoice.invoiceNumber} — {invoice.clientName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Machine on invoice</Label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={scheduleForm.candidateKey}
                      disabled={!scheduleForm.invoiceId}
                      onChange={(e) => {
                        const key = e.target.value;
                        const selected = scheduleCandidates.find((candidate, index) => {
                          const candidateKey = `${candidate.invoiceId}::${candidate.productId}::${index}`;
                          return candidateKey === key;
                        });
                        setScheduleForm((prev) => ({
                          ...prev,
                          candidateKey: key,
                          installationLocation:
                            prev.installationLocation ||
                            selected?.client?.location ||
                            "",
                          clientContactPerson:
                            prev.clientContactPerson ||
                            (selected?.client as any)?.contactPerson ||
                            "",
                        }));
                      }}
                    >
                      <option value="">Select machine…</option>
                      {scheduleCandidates.map((candidate, index) => {
                        const key = `${candidate.invoiceId}::${candidate.productId}::${index}`;
                        return (
                          <option key={key} value={key}>
                            {candidate.productName}
                            {candidate.category ? ` (${candidate.category})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <Label>Assign engineer</Label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={scheduleForm.engineer}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          engineer: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select engineer…</option>
                      {engineerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Installation date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={scheduleForm.installationDate}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          installationDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Machine serial (optional)</Label>
                    <Input
                      className="mt-1"
                      value={scheduleForm.serialNumber}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          serialNumber: e.target.value,
                        }))
                      }
                      placeholder="S/No"
                    />
                  </div>
                  <div>
                    <Label>Installation location</Label>
                    <Input
                      className="mt-1"
                      value={scheduleForm.installationLocation}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          installationLocation: e.target.value,
                        }))
                      }
                      placeholder="Lab / department / site"
                    />
                  </div>
                  <div>
                    <Label>Client contact person</Label>
                    <Input
                      className="mt-1"
                      value={scheduleForm.clientContactPerson}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          clientContactPerson: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Person left in charge (optional)</Label>
                    <Input
                      className="mt-1"
                      value={scheduleForm.attendant}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          attendant: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>In-charge role</Label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={scheduleForm.attendantRole}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          attendantRole: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select role…</option>
                      {contactRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>In-charge phone</Label>
                    <Input
                      className="mt-1"
                      value={scheduleForm.attendantNumber}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          attendantNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    rows={2}
                    value={scheduleForm.notes}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Access notes, training, site requirements…"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={scheduleInstallation} disabled={saving}>
                    {saving ? "Scheduling…" : "Schedule Installation"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScheduleForm(EMPTY_SCHEDULE_FORM);
                      setShowSchedulePanel(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showBulkUploadPanel && (
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">Bulk Upload Machines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV of installed machines. Required:{" "}
                  <strong>Machine Name</strong> and <strong>Client</strong>.
                  Recommended: <strong>Machine S/No</strong> and{" "}
                  <strong>LOCATION</strong>.
                </p>
                <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
                  <p className="font-medium text-foreground">Expected columns</p>
                  <p>
                    <code>Machine Name</code>, <code>Client</code>,{" "}
                    <code>Contact person</code>, <code>phone number</code>,{" "}
                    <code>In charge of machine (name)</code>, <code>Role</code>,{" "}
                    <code>No</code> (attendant phone), <code>LOCATION</code>,{" "}
                    <code>Machine S/No</code>, <code>Installation Date</code>,{" "}
                    <code>Last Service Date</code>, <code>Next Service</code>
                  </p>
                  <p className="text-muted-foreground">
                    Dates can be <code>DD/MM/YYYY</code> or <code>YYYY-MM-DD</code>.
                    Rows with the same serial number update the existing machine.
                    Last/next service dates create service records automatically.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    className="text-sm text-primary underline"
                    href="/static/sample-machines.csv"
                    download
                  >
                    Download sample CSV
                  </a>
                  <input
                    ref={machineFileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (!file) return;
                      try {
                        setUploadingMachines(true);
                        const res = await stockApi.bulkUploadInstalledMachines(file);
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
                        await load({ silent: true });
                        setShowBulkUploadPanel(false);
                      } catch (err: any) {
                        window.alert(err?.message || "Upload failed");
                      } finally {
                        setUploadingMachines(false);
                        if (machineFileInputRef.current)
                          machineFileInputRef.current.value = "";
                      }
                    }}
                  />
                  <Button
                    onClick={() => machineFileInputRef.current?.click()}
                    disabled={uploadingMachines}
                    size="sm"
                  >
                    {uploadingMachines ? "Uploading..." : "Upload CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      <select
                        value={machineCategoryFilter}
                        onChange={(e) => setMachineCategoryFilter(e.target.value)}
                        className="w-full rounded border bg-background px-3 py-2 text-sm sm:w-52"
                        aria-label="Filter by machine type"
                      >
                        <option value="">All machines</option>
                        {machineCategoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Search by machine, client, serial..."
                        value={machineSearch}
                        onChange={(e) => setMachineSearch(e.target.value)}
                        className="w-full sm:w-64"
                      />
                    </div>
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
                          Try adjusting your search or machine filter.
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
                                  <DropdownMenuContent align="end" className="w-52">
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
                                      onClick={() => void openCallDialogForMachine(m)}
                                    >
                                      <PhoneCall className="mr-2 h-4 w-4" />
                                      Log call
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => void openHistoryDialogForMachine(m)}
                                    >
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      Call history
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

                    {selectedMachine.photoUrl ? (
                      <div className="overflow-hidden rounded-xl border">
                        <img
                          src={
                            selectedMachine.photoUrl.startsWith("http")
                              ? selectedMachine.photoUrl
                              : `${API_URL}${selectedMachine.photoUrl}`
                          }
                          alt={`${selectedMachine.productName} installation`}
                          className="max-h-56 w-full object-cover"
                        />
                      </div>
                    ) : null}

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
                          Person in charge
                        </Label>
                        <div className="space-y-1 mt-1">
                          <p className="text-sm">
                            {selectedMachine.attendant}
                            {selectedMachine.attendantRole
                              ? ` · ${selectedMachine.attendantRole}`
                              : ""}
                          </p>
                          {selectedMachine.attendantNumber && (
                            <p className="text-xs text-muted-foreground">
                              {selectedMachine.attendantNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedMachine.installedBy && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Engineer
                        </Label>
                        <p className="text-sm mt-1">{selectedMachine.installedBy}</p>
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
                        onClick={() => void openCallDialogForMachine(selectedMachine)}
                      >
                        <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                        Log Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openHistoryDialogForMachine(selectedMachine)}
                      >
                        Call History
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
                  onClientClick={openClientDetailsFromService}
                  onLogCall={openLogCallFromService}
                  onCallHistory={openCallHistoryFromService}
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
                  onClientClick={openClientDetailsFromService}
                  onLogCall={openLogCallFromService}
                  onCallHistory={openCallHistoryFromService}
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
                  onClientClick={openClientDetailsFromService}
                  onLogCall={openLogCallFromService}
                  onCallHistory={openCallHistoryFromService}
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
                  onClientClick={openClientDetailsFromService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Manual add machine dialog ------------------------------ */}
      <Dialog open={showManualAddDialog} onOpenChange={setShowManualAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Machine Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Facility source</Label>
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={manualAddForm.facilityMode}
                onChange={(e) =>
                  setManualAddForm((prev) => ({
                    ...prev,
                    facilityMode: e.target.value as "existing" | "custom",
                    clientKey: "",
                    customFacilityName: "",
                    customFacilityLocation: "",
                    customFacilityPhone: "",
                    customContactPerson: "",
                  }))
                }
              >
                <option value="existing">Select existing facility</option>
                <option value="custom">Enter new facility</option>
              </select>
            </div>

            {manualAddForm.facilityMode === "existing" ? (
              <div>
                <Label>Facility *</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={manualAddForm.clientKey}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      clientKey: e.target.value,
                    }))
                  }
                >
                  <option value="">Select facility…</option>
                  {customers.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.client?.name}
                      {c.client?.location ? ` · ${c.client.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <Label>Facility name *</Label>
                  <Input
                    value={manualAddForm.customFacilityName}
                    onChange={(e) =>
                      setManualAddForm((prev) => ({
                        ...prev,
                        customFacilityName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Nairobi Hospital"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location (optional)</Label>
                    <Input
                      value={manualAddForm.customFacilityLocation}
                      onChange={(e) =>
                        setManualAddForm((prev) => ({
                          ...prev,
                          customFacilityLocation: e.target.value,
                        }))
                      }
                      placeholder="Region / town"
                    />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input
                      value={manualAddForm.customFacilityPhone}
                      onChange={(e) =>
                        setManualAddForm((prev) => ({
                          ...prev,
                          customFacilityPhone: e.target.value,
                        }))
                      }
                      placeholder="+254..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact person (optional)</Label>
                  <Input
                    value={manualAddForm.customContactPerson}
                    onChange={(e) =>
                      setManualAddForm((prev) => ({
                        ...prev,
                        customContactPerson: e.target.value,
                      }))
                    }
                    placeholder="Primary contact at facility"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Machine general term *</Label>
                <Input
                  value={manualAddForm.machineCategory}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      machineCategory: e.target.value,
                    }))
                  }
                  placeholder="e.g., Maternity"
                />
              </div>
              <div>
                <Label>Machine name *</Label>
                <Input
                  value={manualAddForm.machineName}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      machineName: e.target.value,
                    }))
                  }
                  placeholder="e.g., Infant Warmer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serial number (optional)</Label>
                <Input
                  value={manualAddForm.serialNumber}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      serialNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g., SN-2024-001"
                />
              </div>
              <div>
                <Label>Installation location (optional)</Label>
                <Input
                  value={manualAddForm.installationLocation}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      installationLocation: e.target.value,
                    }))
                  }
                  placeholder="e.g., Lab 1, Room 201"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department (optional)</Label>
                <Input
                  value={manualAddForm.installationDepartment}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      installationDepartment: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Machine status</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={manualAddForm.status}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                >
                  {MACHINE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Installation date (optional)</Label>
                <Input
                  type="date"
                  value={manualAddForm.installationDate}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      installationDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Warranty until (optional)</Label>
                <Input
                  type="date"
                  value={manualAddForm.warrantyUntil}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      warrantyUntil: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Installed by (optional)</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={manualAddForm.installedBy}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      installedBy: e.target.value,
                    }))
                  }
                >
                  <option value="">Select engineer…</option>
                  {employees.map((employee) => {
                    const label = getEmployeeLabel(employee);
                    return (
                      <option key={employee._id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <Label>Next service date (optional)</Label>
                <Input
                  type="date"
                  value={manualAddForm.nextServiceDate}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      nextServiceDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Attendant role (optional)</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={manualAddForm.attendantRole}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      attendantRole: e.target.value,
                    }))
                  }
                >
                  <option value="">Select role…</option>
                  {contactRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Attendant name (optional)</Label>
                <Input
                  value={manualAddForm.attendant}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      attendant: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Attendant phone (optional)</Label>
                <Input
                  value={manualAddForm.attendantNumber}
                  onChange={(e) =>
                    setManualAddForm((prev) => ({
                      ...prev,
                      attendantNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <textarea
                value={manualAddForm.notes}
                onChange={(e) =>
                  setManualAddForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
                placeholder="Any additional notes"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={manualAddForm.isTrained}
                onCheckedChange={(checked) =>
                  setManualAddForm((prev) => ({
                    ...prev,
                    isTrained: checked === true,
                  }))
                }
              />
              <Label className="cursor-pointer flex-1 mb-0">
                Operator is trained on this machine
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => void saveManualMachine()}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Add Machine"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualAddDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------ Edit machine dialog ------------------------------ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Machine Details
              {editingMachine
                ? ` - ${detailForm.productName || editingMachine.productName}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Machine general term</Label>
                <Input
                  value={detailForm.category || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, category: e.target.value })
                  }
                  placeholder="e.g., Maternity"
                />
              </div>
              <div>
                <Label>Machine name *</Label>
                <Input
                  value={detailForm.productName || ""}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      productName: e.target.value,
                    })
                  }
                  placeholder="e.g., Infant Warmer"
                />
              </div>
            </div>

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
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={detailForm.installedBy || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, installedBy: e.target.value })
                  }
                >
                  <option value="">Select engineer…</option>
                  {employees.map((employee) => {
                    const label = getEmployeeLabel(employee);
                    return (
                      <option key={employee._id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <Label>Machine status</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={detailForm.status || "active"}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, status: e.target.value })
                  }
                >
                  {MACHINE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label>Operator / Attendant role</Label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={detailForm.attendantRole || ""}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      attendantRole: e.target.value,
                    })
                  }
                >
                  <option value="">Select role…</option>
                  {contactRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
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

            {serviceForm.markCompleted ? (
              <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">After-service handover</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Machine status</Label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={serviceForm.machineStatus}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          machineStatus: e.target.value,
                        })
                      }
                    >
                      {MACHINE_STATUS_OPTIONS.filter(
                        (option) => option.value !== "installation_pending",
                      ).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Next service date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={serviceForm.nextServiceDate}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          nextServiceDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Person left in charge</Label>
                    <Input
                      className="mt-1"
                      value={serviceForm.attendant}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          attendant: e.target.value,
                        })
                      }
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={serviceForm.attendantRole}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          attendantRole: e.target.value,
                        })
                      }
                    >
                      <option value="">Select role…</option>
                      {contactRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label>In-charge phone (optional)</Label>
                    <Input
                      className="mt-1"
                      value={serviceForm.attendantNumber}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          attendantNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 pt-4">
              <Button onClick={saveService} disabled={saving} className="flex-1">
                {saving
                  ? "Saving..."
                  : editingService
                    ? serviceForm.markCompleted
                      ? "Complete Service"
                      : "Save Changes"
                    : serviceForm.markCompleted
                      ? "Log & Complete Service"
                      : "Log Service"}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Log Call — {activeCRMMachine?.productName || "Machine"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">
                {activeCRMMachine?.client?.name || "Unknown client"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  activeCRMMachine?.serialNumber
                    ? `SN: ${activeCRMMachine.serialNumber}`
                    : "",
                  activeCRMMachine?.client?.number || "",
                  activeCRMMachine?.client?.location || "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "Installed machine follow-up"}
              </p>
            </div>

            <div className="space-y-1">
              <Label>Call purpose</Label>
              {!addingPurpose ? (
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={callForm.callPurpose}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "__add_new__") {
                      setAddingPurpose(true);
                      return;
                    }
                    setCallForm((current) => ({
                      ...current,
                      callPurpose: value,
                      focusCategoryIds: sellingPurposes.includes(value)
                        ? current.focusCategoryIds
                        : [],
                    }));
                  }}
                >
                  {callPurposes.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                  <option value="__add_new__">Add new…</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newPurpose}
                    onChange={(e) => setNewPurpose(e.target.value)}
                    placeholder="New call purpose"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingCrm || !newPurpose.trim()}
                    onClick={() => void handleAddCallPurpose()}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAddingPurpose(false);
                      setNewPurpose("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {isSellingPurpose ? (
              <div className="space-y-2">
                <Label>Department of focus (stock categories)</Label>
                <p className="text-xs text-muted-foreground">
                  Select one or more product categories this call focused on.
                </p>
                <div className="max-h-40 overflow-y-auto rounded-md border p-3 space-y-2">
                  {stockCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No stock categories found.
                    </p>
                  ) : (
                    stockCategories.map((category) => {
                      const checked = callForm.focusCategoryIds.includes(
                        category._id,
                      );
                      return (
                        <label
                          key={category._id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              toggleFocusCategory(category._id)
                            }
                          />
                          <span>{category.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label>Outcome</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={callForm.outcome}
                onChange={(event) => {
                  const outcome = event.target.value;
                  setCallForm((current) => ({
                    ...current,
                    outcome,
                    createLead:
                      outcome === "Interested" ? true : current.createLead,
                    followUpNeeded:
                      outcome === "Follow-up Needed"
                        ? true
                        : current.followUpNeeded,
                  }));
                }}
              >
                <option value="Interested">Interested</option>
                <option value="Follow-up Needed">Follow-up Needed</option>
                <option value="Not Interested">Not Interested</option>
                <option value="No Answer">No Answer</option>
                <option value="Quote Requested">Quote Requested</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {callForm.outcome === "Interested" ? (
              <label className="flex items-start gap-2 text-sm rounded-md border bg-emerald-50/60 border-emerald-100 p-3">
                <Checkbox
                  checked={callForm.createLead}
                  onCheckedChange={(checked) =>
                    setCallForm((current) => ({
                      ...current,
                      createLead: Boolean(checked),
                    }))
                  }
                />
                <span>
                  <span className="font-medium text-emerald-900">
                    Save as lead
                  </span>
                  <span className="block text-xs text-emerald-800/80 mt-0.5">
                    Creates a CRM lead linked to this client/machine opportunity.
                  </span>
                </span>
              </label>
            ) : null}

            <div className="space-y-2 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={
                    callForm.followUpNeeded ||
                    callForm.outcome === "Follow-up Needed"
                  }
                  onCheckedChange={(checked) =>
                    setCallForm((current) => ({
                      ...current,
                      followUpNeeded: Boolean(checked),
                    }))
                  }
                />
                <span className="font-medium">Follow-up needed</span>
              </label>
              {(callForm.followUpNeeded ||
                callForm.outcome === "Follow-up Needed") && (
                <div className="space-y-1 pl-6">
                  <Label>Follow-up date</Label>
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
                  <p className="text-[11px] text-muted-foreground">
                    Appears in Telesales Activity planner and reports.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCallDialog(false)}
                disabled={savingCrm}
              >
                Cancel
              </Button>
              <Button disabled={savingCrm} onClick={() => void handleLogCallSubmit()}>
                {savingCrm ? "Saving..." : "Save Call Log"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CRM History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Call history — {activeCRMMachine?.productName || "Machine"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {clientHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No logged calls for this machine yet.
              </p>
            ) : (
              clientHistory.map((h, i) => (
                <div key={h._id || i} className="border-b pb-3 last:border-0 text-sm">
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <span className="font-semibold text-slate-900">
                      {h.callPurpose || h.roomName || "Call"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {h.createdAt
                        ? new Date(h.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <p className="text-slate-700">{h.note}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{h.outcome || h.status}</Badge>
                    {h.followUpDate ? (
                      <Badge variant="secondary">
                        Follow-up:{" "}
                        {new Date(h.followUpDate).toLocaleDateString()}
                      </Badge>
                    ) : null}
                    {Array.isArray(h.focusCategories) &&
                    h.focusCategories.length > 0 ? (
                      <Badge variant="secondary">
                        Focus:{" "}
                        {h.focusCategories
                          .map((c: any) => c.name || c)
                          .filter(Boolean)
                          .join(", ")}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowHistoryDialog(false);
                if (activeCRMMachine) void openCallDialogForMachine(activeCRMMachine);
              }}
            >
              Log another call
            </Button>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client details from Pending / Due services */}
      <Dialog
        open={showClientDetailsDialog}
        onOpenChange={setShowClientDetailsDialog}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Client details — {clientDetailsView?.name || "Client"}
            </DialogTitle>
          </DialogHeader>
          {clientDetailsView ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Client
                  </p>
                  <p className="font-medium">{clientDetailsView.name}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Phone
                    </p>
                    <p>{clientDetailsView.number || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Location
                    </p>
                    <p>{clientDetailsView.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Contact person
                    </p>
                    <p>{clientDetailsView.contactPerson || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>
                    <p>{clientDetailsView.email || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Contacts</p>
                {clientDetailsView.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No contacts saved for this client yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clientDetailsView.contacts.map((person, idx) => (
                      <div
                        key={`${person.role}-${person.name}-${idx}`}
                        className="rounded-md border p-3 text-sm"
                      >
                        <p className="font-medium">
                          {person.role}: {person.name}
                        </p>
                        {person.phone ? (
                          <p className="text-muted-foreground">{person.phone}</p>
                        ) : null}
                        {person.email ? (
                          <p className="text-muted-foreground">{person.email}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Installed machines ({clientDetailsView.machines.length})
                </p>
                {clientDetailsView.machines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No machines linked to this client.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {clientDetailsView.machines.map((machine) => (
                      <button
                        key={machine._id}
                        type="button"
                        className="w-full rounded-md border p-3 text-left text-sm hover:bg-muted/40"
                        onClick={() => {
                          setSelectedMachine(machine);
                          setSection("machines");
                          setShowClientDetailsDialog(false);
                        }}
                      >
                        <p className="font-medium">{machine.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            machine.serialNumber
                              ? `SN: ${machine.serialNumber}`
                              : "",
                            machine.status || "",
                            machine.nextServiceDate
                              ? `Next service: ${formatDate(machine.nextServiceDate)}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {clientDetailsView.customerRow ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      openContactsDialog(clientDetailsView.customerRow);
                      setShowClientDetailsDialog(false);
                    }}
                  >
                    Manage contacts
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <a
                    href={`/admin/clients/clients-list?q=${encodeURIComponent(clientDetailsView.name)}`}
                  >
                    Open in Client CRM
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowClientDetailsDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}
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