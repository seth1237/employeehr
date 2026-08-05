"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Save, CheckCircle2, Target, BookOpen, TrendingUp, Heart, Users, Brain, Calendar, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

interface PDP {
  _id?: string
  title: string
  description: string
  period: string
  trustee_id?: string
  personalProfile?: any
  visionMission?: any
  goals?: any[]
  actionPlans?: any[]
  skills?: any[]
  habits?: any[]
  journalEntries?: any[]
  careerDomain?: any
  educationDomain?: any
  financeDomain?: any
  healthDomain?: any
  relationshipDomain?: any
  mentalHealthDomain?: any
  reviews?: any[]
  overallProgress?: number
  status?: string
}

interface Colleague {
  _id: string
  firstName: string
  lastName: string
  email: string
  employee_id?: string
  position?: string
  department?: string
}

export default function EmployeePDPPage() {
  const [pdps, setPdps] = useState<PDP[]>([])
  const [currentPDP, setCurrentPDP] = useState<PDP | null>(null)
  const [colleagues, setColleagues] = useState<Colleague[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()

  useEffect(() => {
    fetchPDPs()
    fetchColleagues()
  }, [])

  const fetchColleagues = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/users/colleagues/list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setColleagues(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch colleagues:", error)
    }
  }

  const fetchPDPs = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/pdps`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setPdps(data.data)
        if (data.data.length > 0) {
          setCurrentPDP(data.data[0])
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch PDPs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createNewPDP = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (creating) return
    
    setCreating(true)
    try {
      const token = getToken()
      if (!token) {
        toast({
          title: "Error",
          description: "Please login to create a PDP",
          variant: "destructive",
        })
        return
      }

      const newPDP = {
        title: `My PDP ${new Date().getFullYear()}`,
        description: "Personal Development Plan",
        period: new Date().getFullYear().toString(),
      }
      
      const response = await fetch(`${API_URL}/api/pdps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPDP),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({ title: "Success", description: "PDP created successfully" })
        await fetchPDPs()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create PDP",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create PDP error:", error)
      toast({
        title: "Error",
        description: "Failed to create PDP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const updatePDP = async (updates: Partial<PDP>) => {
    if (!currentPDP?._id) return

    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/pdps/${currentPDP._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "PDP updated successfully" })
        setCurrentPDP(data.data)
        fetchPDPs()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update PDP",
        variant: "destructive",
      })
    }
  }

  const addGoal = (goal: any) => {
    const updatedGoals = [...(currentPDP?.goals || []), goal]
    updatePDP({ goals: updatedGoals })
  }

  const addSkill = (skill: any) => {
    const updatedSkills = [...(currentPDP?.skills || []), skill]
    updatePDP({ skills: updatedSkills })
  }

  const addHabit = (habit: any) => {
    const updatedHabits = [...(currentPDP?.habits || []), habit]
    updatePDP({ habits: updatedHabits })
  }

  const addJournalEntry = async (entry: any) => {
    if (!currentPDP?._id) return

    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/pdps/${currentPDP._id}/journal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Journal entry added" })
        setCurrentPDP(data.data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add journal entry",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!currentPDP) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <h2 className="text-2xl font-bold">No PDP Found</h2>
        <p className="text-muted-foreground">Create your first Personal Development Plan to get started</p>
        <Button 
          onClick={(e) => createNewPDP(e)} 
          disabled={creating}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Creating..." : "Create PDP"}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentPDP.title}</h1>
          <p className="text-muted-foreground">Period: {currentPDP.period}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={currentPDP.status === "approved" ? "default" : "secondary"}>
            {currentPDP.status?.toUpperCase()}
          </Badge>
          <Button 
            onClick={(e) => createNewPDP(e)} 
            disabled={creating}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creating..." : "New PDP"}
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>Your development journey at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={currentPDP.overallProgress || 0} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">{currentPDP.overallProgress || 0}% Complete</p>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals & Plans</TabsTrigger>
          <TabsTrigger value="skills">Skills & Habits</TabsTrigger>
          <TabsTrigger value="domains">Life Domains</TabsTrigger>
          <TabsTrigger value="journal">Journal & Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TrusteeSection pdp={currentPDP} colleagues={colleagues} onUpdate={updatePDP} />
          <PersonalProfileSection pdp={currentPDP} onUpdate={updatePDP} />
          <VisionMissionSection pdp={currentPDP} onUpdate={updatePDP} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalsSection pdp={currentPDP} onAddGoal={addGoal} onUpdate={updatePDP} />
          <ActionPlansSection pdp={currentPDP} onUpdate={updatePDP} />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <SkillsSection pdp={currentPDP} onAddSkill={addSkill} />
          <HabitsSection pdp={currentPDP} onAddHabit={addHabit} />
        </TabsContent>

        <TabsContent value="domains" className="space-y-6">
          <LifeDomainsSection pdp={currentPDP} onUpdate={updatePDP} />
        </TabsContent>

        <TabsContent value="journal" className="space-y-6">
          <JournalSection pdp={currentPDP} onAddEntry={addJournalEntry} />
          <ReviewsSection pdp={currentPDP} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Trustee Section
function TrusteeSection({ pdp, colleagues, onUpdate }: { pdp: PDP; colleagues: Colleague[]; onUpdate: (updates: Partial<PDP>) => void }) {
  const [selectedTrustee, setSelectedTrustee] = useState(pdp.trustee_id || "none")

  const handleSaveTrustee = () => {
    onUpdate({ trustee_id: selectedTrustee === "none" ? undefined : selectedTrustee })
  }

  const currentTrustee = colleagues.find(c => c._id === pdp.trustee_id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          PDP Trustee
        </CardTitle>
        <CardDescription>
          Choose a trusted colleague who can view your Personal Development Plan. They must be from your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTrustee && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Current Trustee</p>
            <p className="text-sm text-muted-foreground">
              {currentTrustee.firstName} {currentTrustee.lastName} ({currentTrustee.employee_id})
            </p>
            <p className="text-xs text-muted-foreground">{currentTrustee.position} • {currentTrustee.department}</p>
          </div>
        )}
        
        <div>
          <Label>Select Colleague as Trustee</Label>
          <Select value={selectedTrustee} onValueChange={setSelectedTrustee}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a colleague..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Trustee</SelectItem>
              {colleagues.map((colleague) => (
                <SelectItem key={colleague._id} value={colleague._id}>
                  {colleague.firstName} {colleague.lastName} ({colleague.employee_id}) - {colleague.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Your trustee will be able to view your PDP to support your development journey.
          </p>
        </div>

        <Button onClick={handleSaveTrustee}>
          <Save className="mr-2 h-4 w-4" />
          Save Trustee
        </Button>
      </CardContent>
    </Card>
  )
}

// Personal Profile Section
function PersonalProfileSection({ pdp, onUpdate }: { pdp: PDP; onUpdate: (updates: Partial<PDP>) => void }) {
  const [profile, setProfile] = useState(pdp.personalProfile || {})

  const handleSave = () => {
    onUpdate({ personalProfile: profile })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Personal Profile
        </CardTitle>
        <CardDescription>Your background, strengths, and values</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Background Summary</Label>
          <Textarea
            placeholder="Tell us about yourself..."
            value={profile.background || ""}
            onChange={(e) => setProfile({ ...profile, background: e.target.value })}
          />
        </div>
        <div>
          <Label>Personality Type</Label>
          <Input
            placeholder="e.g., INTJ, Enneagram Type 5"
            value={profile.personalityType || ""}
            onChange={(e) => setProfile({ ...profile, personalityType: e.target.value })}
          />
        </div>
        <div>
          <Label>Strengths (comma-separated)</Label>
          <Input
            placeholder="e.g., Problem-solving, Communication, Leadership"
            value={profile.strengths?.join(", ") || ""}
            onChange={(e) => setProfile({ ...profile, strengths: e.target.value.split(",").map((s: string) => s.trim()) })}
          />
        </div>
        <div>
          <Label>Areas for Improvement</Label>
          <Input
            placeholder="e.g., Time management, Public speaking"
            value={profile.weaknesses?.join(", ") || ""}
            onChange={(e) => setProfile({ ...profile, weaknesses: e.target.value.split(",").map((s: string) => s.trim()) })}
          />
        </div>
        <div>
          <Label>Core Values</Label>
          <Input
            placeholder="e.g., Integrity, Innovation, Excellence"
            value={profile.values?.join(", ") || ""}
            onChange={(e) => setProfile({ ...profile, values: e.target.value.split(",").map((s: string) => s.trim()) })}
          />
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Profile
        </Button>
      </CardContent>
    </Card>
  )
}

// Vision & Mission Section
function VisionMissionSection({ pdp, onUpdate }: { pdp: PDP; onUpdate: (updates: Partial<PDP>) => void }) {
  const [vision, setVision] = useState(pdp.visionMission || {})

  const handleSave = () => {
    onUpdate({ visionMission: vision })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Vision & Mission
        </CardTitle>
        <CardDescription>Your long-term vision and purpose</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Life Vision (10-20 years)</Label>
          <Textarea
            placeholder="Where do you see yourself in the long term?"
            value={vision.lifeVision || ""}
            onChange={(e) => setVision({ ...vision, lifeVision: e.target.value })}
          />
        </div>
        <div>
          <Label>Mission Statement</Label>
          <Textarea
            placeholder="What is your personal mission?"
            value={vision.missionStatement || ""}
            onChange={(e) => setVision({ ...vision, missionStatement: e.target.value })}
          />
        </div>
        <div>
          <Label>Purpose</Label>
          <Textarea
            placeholder="Why do you do what you do?"
            value={vision.purpose || ""}
            onChange={(e) => setVision({ ...vision, purpose: e.target.value })}
          />
        </div>
        <div>
          <Label>Legacy</Label>
          <Textarea
            placeholder="What legacy do you want to leave?"
            value={vision.legacy || ""}
            onChange={(e) => setVision({ ...vision, legacy: e.target.value })}
          />
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Vision & Mission
        </Button>
      </CardContent>
    </Card>
  )
}

// Goals Section
function GoalsSection({ pdp, onAddGoal, onUpdate }: { pdp: PDP; onAddGoal: (goal: any) => void; onUpdate: (updates: Partial<PDP>) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "career",
    timeframe: "short_term",
    targetDate: "",
    status: "not_started",
  })

  const handleAddGoal = () => {
    if (newGoal.title) {
      onAddGoal(newGoal)
      setNewGoal({
        title: "",
        description: "",
        category: "career",
        timeframe: "short_term",
        targetDate: "",
        status: "not_started",
      })
      setShowForm(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </span>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4">
            <Input
              placeholder="Goal title"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            />
            <Select value={newGoal.category} onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="career">Career</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="relationships">Relationships</SelectItem>
                <SelectItem value="mental_health">Mental Health</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newGoal.timeframe} onValueChange={(value) => setNewGoal({ ...newGoal, timeframe: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_term">Short-term (1-12 months)</SelectItem>
                <SelectItem value="long_term">Long-term (1-5 years)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newGoal.targetDate}
              onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddGoal}>Add Goal</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {pdp.goals?.map((goal: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">{goal.title}</h4>
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{goal.category}</Badge>
                    <Badge variant="outline">{goal.timeframe}</Badge>
                    <Badge>{goal.status}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{goal.progress || 0}%</p>
                </div>
              </div>
              <Progress value={goal.progress || 0} className="mt-4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Action Plans Section
function ActionPlansSection({ pdp, onUpdate }: { pdp: PDP; onUpdate: (updates: Partial<PDP>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Plans</CardTitle>
        <CardDescription>Detailed plans to achieve your goals</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Action plans help you break down goals into actionable steps with resources, timelines, and success metrics.</p>
      </CardContent>
    </Card>
  )
}

// Skills Section
function SkillsSection({ pdp, onAddSkill }: { pdp: PDP; onAddSkill: (skill: any) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [newSkill, setNewSkill] = useState({
    name: "",
    currentLevel: "beginner",
    targetLevel: "intermediate",
    priority: "medium",
  })

  const handleAddSkill = () => {
    if (newSkill.name) {
      onAddSkill(newSkill)
      setNewSkill({ name: "", currentLevel: "beginner", targetLevel: "intermediate", priority: "medium" })
      setShowForm(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Skills Assessment
          </span>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4">
            <Input
              placeholder="Skill name"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
            />
            <Select value={newSkill.currentLevel} onValueChange={(value) => setNewSkill({ ...newSkill, currentLevel: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Current Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newSkill.targetLevel} onValueChange={(value) => setNewSkill({ ...newSkill, targetLevel: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Target Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleAddSkill}>Add Skill</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {pdp.skills?.map((skill: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-semibold">{skill.name}</h4>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current:</span>
                  <Badge variant="outline">{skill.currentLevel}</Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Target:</span>
                  <Badge>{skill.targetLevel}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Habits Section
function HabitsSection({ pdp, onAddHabit }: { pdp: PDP; onAddHabit: (habit: any) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [newHabit, setNewHabit] = useState({
    name: "",
    frequency: "daily",
    timeOfDay: "",
  })

  const handleAddHabit = () => {
    if (newHabit.name) {
      onAddHabit(newHabit)
      setNewHabit({ name: "", frequency: "daily", timeOfDay: "" })
      setShowForm(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Habit Development
          </span>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Habit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4">
            <Input
              placeholder="Habit name"
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
            />
            <Input
              placeholder="Time of day (e.g., Morning, 8:00 AM)"
              value={newHabit.timeOfDay}
              onChange={(e) => setNewHabit({ ...newHabit, timeOfDay: e.target.value })}
            />
            <Select value={newHabit.frequency} onValueChange={(value) => setNewHabit({ ...newHabit, frequency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleAddHabit}>Add Habit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {pdp.habits?.map((habit: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{habit.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {habit.frequency} • {habit.timeOfDay}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold">{habit.streak || 0} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Life Domains Section
function LifeDomainsSection({ pdp, onUpdate }: { pdp: PDP; onUpdate: (updates: Partial<PDP>) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Career
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Career roadmap, networking plan, CV goals..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Certifications, courses, books to read..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Finance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Budgeting, saving goals, investment plans..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health & Wellness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Fitness goals, nutrition, stress management..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Family, friendships, mentorship..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Mental Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Mood tracking, coping mechanisms, mindfulness..." />
        </CardContent>
      </Card>
    </div>
  )
}

// Journal Section
function JournalSection({ pdp, onAddEntry }: { pdp: PDP; onAddEntry: (entry: any) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [newEntry, setNewEntry] = useState({
    type: "daily",
    wins: "",
    challenges: "",
    lessonsLearned: "",
    notes: "",
  })

  const handleAddEntry = () => {
    const entry = {
      type: newEntry.type,
      wins: newEntry.wins.split(",").map((w) => w.trim()).filter(Boolean),
      challenges: newEntry.challenges.split(",").map((c) => c.trim()).filter(Boolean),
      lessonsLearned: newEntry.lessonsLearned.split(",").map((l) => l.trim()).filter(Boolean),
      notes: newEntry.notes,
    }
    onAddEntry(entry)
    setNewEntry({ type: "daily", wins: "", challenges: "", lessonsLearned: "", notes: "" })
    setShowForm(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Self-Reflection & Journal
          </span>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4">
            <Select value={newEntry.type} onValueChange={(value) => setNewEntry({ ...newEntry, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Label>Wins (comma-separated)</Label>
              <Textarea
                placeholder="What went well today?"
                value={newEntry.wins}
                onChange={(e) => setNewEntry({ ...newEntry, wins: e.target.value })}
              />
            </div>
            <div>
              <Label>Challenges (comma-separated)</Label>
              <Textarea
                placeholder="What were the challenges?"
                value={newEntry.challenges}
                onChange={(e) => setNewEntry({ ...newEntry, challenges: e.target.value })}
              />
            </div>
            <div>
              <Label>Lessons Learned (comma-separated)</Label>
              <Textarea
                placeholder="What did you learn?"
                value={newEntry.lessonsLearned}
                onChange={(e) => setNewEntry({ ...newEntry, lessonsLearned: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional thoughts..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddEntry}>Add Entry</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {pdp.journalEntries?.map((entry: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge>{entry.type}</Badge>
                <span className="text-sm text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
              <div className="space-y-2">
                {entry.wins?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold">Wins:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {entry.wins.map((win: string, i: number) => (
                        <li key={i}>{win}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.challenges?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold">Challenges:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {entry.challenges.map((challenge: string, i: number) => (
                        <li key={i}>{challenge}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Reviews Section
function ReviewsSection({ pdp }: { pdp: PDP }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Progress Reviews
        </CardTitle>
        <CardDescription>Weekly, monthly, and quarterly reviews</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pdp.reviews?.map((review: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge>{review.type}</Badge>
                <span className="text-sm text-muted-foreground">{new Date(review.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm">{review.notes}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
