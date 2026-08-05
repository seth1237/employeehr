"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CheckCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/auth";
import API_URL from "@/lib/apiBase";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";

interface Survey {
  _id: string;
  name: string;
  description: string;
}

interface Member {
  name: string;
  role: string;
}

interface CreatedMember {
  _id: string;
  name: string;
  role: string;
}

export default function CreatePoolPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [poolName, setPoolName] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([
    { name: "", role: "" },
    { name: "", role: "" },
    { name: "", role: "" },
    { name: "", role: "" },
    { name: "", role: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [fetchingSurvey, setFetchingSurvey] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [publicLink, setPublicLink] = useState("");
  const [createdMembers, setCreatedMembers] = useState<CreatedMember[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSurvey(data.data.survey);
      } else {
        setError("Failed to load survey details");
      }
    } catch (error) {
      console.error("Error fetching survey:", error);
      setError("Error loading survey");
    } finally {
      setFetchingSurvey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Validate all members have required fields
    for (let i = 0; i < members.length; i++) {
      if (!members[i].name || !members[i].role) {
        setError(`Member ${i + 1}: Name and role are required`);
        setLoading(false);
        return;
      }
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/pools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: poolName,
          description: poolDescription,
          members: members,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setPublicLink(data.data?.public_link || data.public_link);
        setCreatedMembers(data.data?.members || []);
        setPoolName("");
        setPoolDescription("");
        setMembers([
          { name: "", role: "" },
          { name: "", role: "" },
          { name: "", role: "" },
          { name: "", role: "" },
          { name: "", role: "" },
        ]);
      } else {
        setError(data.message || "Failed to create pool");
      }
    } catch (error) {
      console.error("Error creating pool:", error);
      setError("An error occurred while creating the pool");
    } finally {
      setLoading(false);
    }
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const handleCopyLink = () => {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateAnother = () => {
    setSuccess(false);
    setPublicLink("");
    setCreatedMembers([]);
    setCopied(false);
  };

  if (fetchingSurvey) {
    return <PageLoadingSkeleton title="Loading survey" rows={4} />;
  }

  if (!survey) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>Survey not found</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Back to Survey
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Feedback Pool</CardTitle>
          <p className="text-sm text-muted-foreground">
            Survey: {survey.name}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            A pool contains 5 members. Share one link with everyone to provide feedback.
          </p>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="poolName">Pool Name *</Label>
                <Input
                  id="poolName"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  placeholder="e.g., Q1 2026 Leadership Feedback"
                  required
                />
              </div>

              <div>
                <Label htmlFor="poolDescription">Description</Label>
                <Textarea
                  id="poolDescription"
                  value={poolDescription}
                  onChange={(e) => setPoolDescription(e.target.value)}
                  placeholder="Describe the purpose of this feedback pool"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pool Members (5 Required)</h3>
                {members.map((member, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Member {index + 1}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`name-${index}`}>Full Name *</Label>
                        <Input
                          id={`name-${index}`}
                          value={member.name}
                          onChange={(e) => updateMember(index, "name", e.target.value)}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`role-${index}`}>Role/Position *</Label>
                        <Input
                          id={`role-${index}`}
                          value={member.role}
                          onChange={(e) => updateMember(index, "role", e.target.value)}
                          placeholder="e.g., Manager, Developer"
                          required
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Pool"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Pool created successfully! Share this link with anyone to provide feedback for the pool members.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label>Pool Feedback Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={publicLink}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Anyone with this link can select a member and provide anonymous feedback.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Pool Members ({createdMembers.length})</h3>
                  <div className="grid gap-2">
                    {createdMembers.map((member, index) => (
                      <Card key={member._id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                          <Badge variant="outline">Member {index + 1}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleCreateAnother}>
                  Create Another Pool
                </Button>
                <Button variant="outline" onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}`)}>
                  View All Pools
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
