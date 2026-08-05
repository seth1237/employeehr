"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/auth";
import API_URL from "@/lib/apiBase";
import { toast } from "sonner";

interface Survey {
  _id: string;
  name: string;
  description: string;
}

interface Member {
  _id: string;
  employee_name: string;
  role: string;
  employee_email?: string;
  submission_count: number;
}

interface Pool {
  _id: string;
  name: string;
  description?: string;
  status: string;
  expires_at?: string;
  survey_id: string;
}

interface PoolDetails {
  survey: Survey;
  pool: Pool;
  members: Member[];
  public_link: string;
}

interface MemberInput {
  name: string;
  role: string;
  email?: string;
}

export default function EditPoolPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;
  const poolId = params.poolId as string;

  const [poolDetails, setPoolDetails] = useState<PoolDetails | null>(null);
  const [poolName, setPoolName] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [poolStatus, setPoolStatus] = useState("active");
  const [expiresAt, setExpiresAt] = useState("");
  const [members, setMembers] = useState<MemberInput[]>([
    { name: "", role: "", email: "" },
    { name: "", role: "", email: "" },
    { name: "", role: "", email: "" },
    { name: "", role: "", email: "" },
    { name: "", role: "", email: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasResponses, setHasResponses] = useState(false);

  useEffect(() => {
    fetchPoolDetails();
  }, [poolId, surveyId]);

  const fetchPoolDetails = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/pools/${poolId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const details = data.data;
        setPoolDetails(details);
        setPoolName(details.pool.name);
        setPoolDescription(details.pool.description || "");
        setPoolStatus(details.pool.status);
        setExpiresAt(details.pool.expires_at ? new Date(details.pool.expires_at).toISOString().split('T')[0] : "");
        
        // Set members
        const memberInputs = details.members.map((m: Member) => ({
          name: m.employee_name,
          role: m.role,
          email: m.employee_email || ""
        }));
        setMembers(memberInputs);

        // Check if pool has responses
        const hasSubmissions = details.members.some((m: Member) => m.submission_count > 0);
        setHasResponses(hasSubmissions);
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load pool details");
      }
    } catch (error) {
      console.error("Error fetching pool details:", error);
      setError("Error loading pool");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validate all members have required fields
    for (let i = 0; i < members.length; i++) {
      if (!members[i].name || !members[i].role) {
        setError(`Member ${i + 1}: Name and role are required`);
        setSaving(false);
        return;
      }
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/pools/${poolId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: poolName,
          description: poolDescription,
          status: poolStatus,
          expires_at: expiresAt || null,
          members: members.map(m => ({
            name: m.name,
            role: m.role,
            email: m.email || undefined
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Pool updated successfully!");
        router.push(`/admin/feedback-360/surveys/${surveyId}`);
      } else {
        setError(data.message || "Failed to update pool");
        toast.error(data.message || "Failed to update pool");
      }
    } catch (error) {
      console.error("Error updating pool:", error);
      setError("An error occurred while updating the pool");
      toast.error("An error occurred while updating the pool");
    } finally {
      setSaving(false);
    }
  };

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!poolDetails) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || "Pool not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Survey
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Feedback Pool</CardTitle>
          <p className="text-sm text-muted-foreground">
            Survey: {poolDetails.survey.name}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {hasResponses && (
              <Alert>
                <AlertDescription>
                  ⚠️ This pool has responses. Member information cannot be edited.
                </AlertDescription>
              </Alert>
            )}

            {/* Pool Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pool Information</h3>
              
              <div>
                <Label htmlFor="poolName">Pool Name *</Label>
                <Input
                  id="poolName"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  placeholder="e.g., Engineering Team Q1 2026"
                  required
                />
              </div>

              <div>
                <Label htmlFor="poolDescription">Description (Optional)</Label>
                <Textarea
                  id="poolDescription"
                  value={poolDescription}
                  onChange={(e) => setPoolDescription(e.target.value)}
                  placeholder="Add context about this feedback pool..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={poolStatus} onValueChange={setPoolStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pool Members (5 Required)</h3>
                {hasResponses && (
                  <Badge variant="secondary">Locked - Has Responses</Badge>
                )}
              </div>

              {members.map((member, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Member {index + 1}
                      {poolDetails.members[index]?.submission_count > 0 && (
                        <Badge className="ml-2" variant="outline">
                          {poolDetails.members[index].submission_count} submissions
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`member-${index}-name`}>Name *</Label>
                        <Input
                          id={`member-${index}-name`}
                          value={member.name}
                          onChange={(e) => updateMember(index, "name", e.target.value)}
                          placeholder="Full name"
                          required
                          disabled={hasResponses}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`member-${index}-role`}>Role *</Label>
                        <Input
                          id={`member-${index}-role`}
                          value={member.role}
                          onChange={(e) => updateMember(index, "role", e.target.value)}
                          placeholder="e.g., Developer"
                          required
                          disabled={hasResponses}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`member-${index}-email`}>Email (Optional)</Label>
                        <Input
                          id={`member-${index}-email`}
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMember(index, "email", e.target.value)}
                          placeholder="email@example.com"
                          disabled={hasResponses}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
