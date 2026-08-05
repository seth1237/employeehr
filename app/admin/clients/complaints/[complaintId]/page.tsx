"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/apiBase";
import { getToken } from "@/lib/auth";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";

interface IComplaint {
  _id: string;
  complaintId: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  clientLocation?: string;
  clientEmail?: string;
  clientPhone?: string;
  title: string;
  description: string;
  complaintCategory: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  relatedInvoiceId?: string;
  relatedMachineId?: string;
  communications?: Array<{
    senderUserId: string;
    senderName?: string;
    senderRole?: string;
    message: string;
    createdAt?: string;
  }>;
  internalNotes?: Array<{
    userId: string;
    userName?: string;
    note: string;
    createdAt?: string;
  }>;
  resolution?: {
    resolvedBy: string;
    resolvedByName?: string;
    resolutionNotes?: string;
    satisfactionRating?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const statusOptions = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_client_feedback", label: "Pending client feedback" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function normalizeClientValue(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildBulkSmsKey(phone: string, name: string, location: string) {
  return [
    normalizeClientValue(phone),
    normalizeClientValue(name),
    normalizeClientValue(location),
  ].join("|");
}

export default function ComplaintDetailPage() {
  const params = useParams() as { complaintId: string }
  const complaintId = String(params.complaintId || "")

  const router = useRouter();
  const [complaint, setComplaint] = useState<IComplaint | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [statusSelection, setStatusSelection] = useState("");
  const [statusOpen, setStatusOpen] = useState(true);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [satisfactionRating, setSatisfactionRating] = useState("");
  const [relatedInvoice, setRelatedInvoice] = useState<any>(null);
  const [relatedMachine, setRelatedMachine] = useState<any>(null);
  const { toast } = useToast();

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  useEffect(() => {
    loadComplaintDetails();
    loadEmployees();
  }, [complaintId]);

  const loadComplaintDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaintId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) throw new Error("Failed to fetch complaint");
      const result = await response.json();
      const complaintData = result.data;
      setComplaint(complaintData);
      setStatusSelection(complaintData?.status || "");

      // Fetch related invoice details if exists
      if (complaintData?.relatedInvoiceId) {
        try {
          const invoiceRes = await fetch(
            `${API_URL}/api/stock/invoices/${complaintData.relatedInvoiceId}`,
            { headers: getAuthHeaders() },
          );
          if (invoiceRes.ok) {
            const invoiceData = await invoiceRes.json();
            setRelatedInvoice(invoiceData.data);
          }
        } catch (err) {
          console.error("Failed to fetch related invoice", err);
        }
      }

      // Fetch related machine details if exists
      if (complaintData?.relatedMachineId) {
        try {
          const machineRes = await fetch(
            `${API_URL}/api/stock/installed-machines/${complaintData.relatedMachineId}`,
            { headers: getAuthHeaders() },
          );
          if (machineRes.ok) {
            const machineData = await machineRes.json();
            setRelatedMachine(machineData.data);
          }
        } catch (err) {
          console.error("Failed to fetch related machine", err);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load complaint details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/users?role=employee,manager,hr`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const result = await response.json();
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const handleAssign = async () => {
    if (!assignTo || !complaint) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaint._id}/assign`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ assignedTo: assignTo }),
        },
      );

      if (!response.ok) throw new Error("Failed to assign complaint");
      const result = await response.json();
      setComplaint(result.data);
      setAssignTo("");
      toast({
        title: "Success",
        description: "Complaint assigned successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to assign complaint",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote || !complaint) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaint._id}/notes`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ note: newNote }),
        },
      );

      if (!response.ok) throw new Error("Failed to add note");
      const result = await response.json();
      setComplaint(result.data);
      setNewNote("");
      toast({
        title: "Success",
        description: "Internal note added",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!complaint || !statusSelection) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaint._id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: statusSelection }),
        },
      );

      if (!response.ok) throw new Error("Failed to update status");
      const result = await response.json();
      setComplaint(result.data);
      toast({
        title: "Success",
        description: "Complaint status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddCommunication = async () => {
    if (!newMessage || !complaint) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaint._id}/communicate`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ message: newMessage, senderRole: "staff" }),
        },
      );

      if (!response.ok) throw new Error("Failed to add communication");
      const result = await response.json();
      setComplaint(result.data);
      setNewMessage("");
      toast({
        title: "Success",
        description: "Message sent to client",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNotes || !complaint) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaint._id}/resolve`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            resolutionNotes,
            resolutionType: "other",
            satisfactionRating: parseInt(satisfactionRating) || undefined,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to resolve complaint");
      const result = await response.json();
      setComplaint(result.data);
      setResolutionNotes("");
      setSatisfactionRating("");
      toast({
        title: "Success",
        description: "Complaint resolved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to resolve complaint",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = async () => {
    if (!complaint) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_URL}/api/complaints/${complaint._id}/close`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) throw new Error("Failed to close complaint");
      toast({
        title: "Success",
        description: "Complaint closed successfully",
      });
      router.push("/admin/accounts/complaints");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to close complaint",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "under_review":
        return "bg-purple-100 text-purple-800";
      case "assigned":
        return "bg-indigo-100 text-indigo-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "pending_client_feedback":
        return "bg-orange-100 text-orange-800";
      case "escalated":
        return "bg-red-100 text-red-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <PageLoadingSkeleton title="Loading complaint details" rows={4} />;
  if (!complaint) return <div className="p-6">Complaint not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {complaint.complaintId}: {complaint.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            From: {complaint.clientName} ({complaint.clientNumber})
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Complaint Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Complaint Overview</CardTitle>
                <Badge className={getStatusColor(complaint.status)}>
                  {complaint.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant="secondary" className="mt-1">
                    {complaint.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="mt-1">
                    {complaint.complaintCategory.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Description
                </p>
                <p className="text-sm">{complaint.description}</p>
              </div>

              {/* Related Invoice or Machine */}
              {(relatedInvoice || relatedMachine) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">
                    Related {relatedInvoice ? "Invoice" : "Machine"}
                  </p>
                  {relatedInvoice && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        Invoice #
                        {relatedInvoice.invoiceNumber || relatedInvoice._id}
                      </p>
                      {relatedInvoice.clientName && (
                        <p className="text-xs text-blue-700">
                          Client: {relatedInvoice.clientName}
                        </p>
                      )}
                      {relatedInvoice.amount && (
                        <p className="text-xs text-blue-700">
                          Amount: {relatedInvoice.amount}
                        </p>
                      )}
                    </div>
                  )}
                  {relatedMachine && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        {relatedMachine.productName || "Machine"}
                      </p>
                      {relatedMachine.serialNumber && (
                        <p className="text-xs text-blue-700">
                          Serial: {relatedMachine.serialNumber}
                        </p>
                      )}
                      {relatedMachine.installationLocation && (
                        <p className="text-xs text-blue-700">
                          Location: {relatedMachine.installationLocation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p>{new Date(complaint.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p>{new Date(complaint.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communications */}
          <Card>
            <CardHeader>
              <CardTitle>Client Communications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[400px] overflow-auto">
                {complaint.communications?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No communications yet
                  </p>
                ) : (
                  complaint.communications?.map((comm, idx) => (
                    <div
                      key={idx}
                      className="border-l-2 border-muted pl-3 py-2"
                    >
                      <p className="text-xs font-medium">
                        {comm.senderName || "Unknown"} (
                        {comm.senderRole || "staff"})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comm.createdAt || "").toLocaleString()}
                      </p>
                      <p className="text-sm mt-1">{comm.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <Textarea
                  placeholder="Add response to client..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddCommunication}
                  disabled={!newMessage || updating}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[300px] overflow-auto">
                {complaint.internalNotes?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No internal notes
                  </p>
                ) : (
                  complaint.internalNotes?.map((note, idx) => (
                    <div
                      key={idx}
                      className="border-l-2 border-yellow-200 pl-3 py-2 bg-yellow-50"
                    >
                      <p className="text-xs font-medium">
                        {note.userName || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.createdAt || "").toLocaleString()}
                      </p>
                      <p className="text-sm mt-1">{note.note}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <Textarea
                  placeholder="Add internal note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote || updating}
                  variant="outline"
                  className="w-full"
                >
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Control */}
          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Update Status</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tap to reveal or hide status controls.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusOpen((open) => !open)}
                className="flex items-center gap-2"
              >
                {statusOpen ? "Hide" : "Show"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${statusOpen ? "rotate-180" : "rotate-0"}`}
                />
              </Button>
            </CardHeader>
            {statusOpen && (
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/70"
                    >
                      <input
                        type="radio"
                        name="complaintStatus"
                        value={option.value}
                        checked={statusSelection === option.value}
                        onChange={() => setStatusSelection(option.value)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={
                    !statusSelection ||
                    statusSelection === complaint.status ||
                    updating
                  }
                  className="w-full"
                >
                  Update Status
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complaint.assignedToName && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">
                    Currently Assigned To
                  </p>
                  <p className="font-medium">{complaint.assignedToName}</p>
                </div>
              )}

              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAssign}
                disabled={!assignTo || updating}
                className="w-full"
              >
                Assign Complaint
              </Button>
            </CardContent>
          </Card>

          {/* Resolution */}
          {complaint.status !== "resolved" && complaint.status !== "closed" && (
            <Card>
              <CardHeader>
                <CardTitle>Resolve Complaint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Resolution notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />

                <Select
                  value={satisfactionRating}
                  onValueChange={setSatisfactionRating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Client satisfaction rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Very Unsatisfied</SelectItem>
                    <SelectItem value="2">2 - Unsatisfied</SelectItem>
                    <SelectItem value="3">3 - Neutral</SelectItem>
                    <SelectItem value="4">4 - Satisfied</SelectItem>
                    <SelectItem value="5">5 - Very Satisfied</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleResolve}
                  disabled={!resolutionNotes || updating}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resolution Info */}
          {complaint.resolution && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-900">Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Resolved By:</span>{" "}
                  {complaint.resolution.resolvedByName}
                </p>
                {complaint.resolution.resolutionNotes && (
                  <p>
                    <span className="text-muted-foreground">Notes:</span>{" "}
                    {complaint.resolution.resolutionNotes}
                  </p>
                )}
                {complaint.resolution.satisfactionRating && (
                  <p>
                    <span className="text-muted-foreground">Satisfaction:</span>{" "}
                    {complaint.resolution.satisfactionRating}/5 ⭐
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {complaint.status !== "resolved" &&
              complaint.status !== "closed" && (
                <Button
                  onClick={handleClose}
                  disabled={updating}
                  variant="outline"
                  className="w-full"
                >
                  Close Complaint
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
