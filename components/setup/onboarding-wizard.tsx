"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import {
  CheckCircle2,
  Building2,
  Palette,
  Mail,
  Users,
  Target,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  optional?: boolean
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: "companyInfo",
    title: "Company Information",
    description: "Complete your company profile",
    icon: Building2,
  },
  {
    id: "branding",
    title: "Branding & Colors",
    description: "Customize your company's look",
    icon: Palette,
    optional: true,
  },
  {
    id: "emailConfig",
    title: "Email Configuration",
    description: "Set up your company email (optional)",
    icon: Mail,
    optional: true,
  },
  {
    id: "employees",
    title: "Add Employees",
    description: "Invite your first team members",
    icon: Users,
  },
  {
    id: "kpis",
    title: "Configure KPIs",
    description: "Set up performance metrics",
    icon: Target,
    optional: true,
  },
]

export default function OnboardingWizard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [setupData, setSetupData] = useState<any>(null)
  const [completing, setCompleting] = useState(false)

  // Form states for each step
  const [companyForm, setCompanyForm] = useState({
    country: "",
    state: "",
    city: "",
    phone: "",
    website: "",
    countryCode: "",
  })

  const [brandingForm, setBrandingForm] = useState({
    primaryColor: "#2563eb",
    secondaryColor: "#059669",
    accentColor: "#f59e0b",
    logoFile: null as File | null,
  })

  const [emailForm, setEmailForm] = useState({
    enabled: false,
    fromName: "",
    fromEmail: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
  })

  const [employeesForm, setEmployeesForm] = useState({
    employees: [{ firstName: "", lastName: "", email: "", position: "", department: "" }],
  })

  const [kpisForm, setKpisForm] = useState({
    kpis: [{ name: "", description: "", category: "", weight: 20, target: 100, unit: "%" }],
  })

  useEffect(() => {
    fetchSetupProgress()
  }, [])

  const fetchSetupProgress = async () => {
    try {
      setLoading(true)
      const response = await api.setup.getProgress()

      if (response.success && response.data) {
        setSetupData(response.data)

        // If already completed, redirect to dashboard
        if (response.data.setupProgress?.completed) {
          router.push("/admin")
          return
        }

        // Set initial forms with company data
        if (response.data.company) {
          setCompanyForm((prev) => ({
            ...prev,
            phone: response.data.company.phone || "",
          }))
          setBrandingForm((prev) => ({
            ...prev,
          }))
          setEmailForm((prev) => ({
            ...prev,
            fromName: response.data.company.name || "",
            fromEmail: response.data.company.email || "",
          }))
        }

        // Find first incomplete step
        const progress = response.data.setupProgress
        if (progress && progress.steps) {
          const firstIncomplete = SETUP_STEPS.findIndex(
            (step) => !progress.steps[step.id]
          )
          if (firstIncomplete >= 0) {
            setCurrentStepIndex(firstIncomplete)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch setup progress:", error)
      toast.error("Failed to load setup progress")
    } finally {
      setLoading(false)
    }
  }

  const updateStepProgress = async (stepId: string, completed: boolean) => {
    try {
      await api.setup.updateStep({
        step: stepId,
        completed,
        data: {},
      })
    } catch (error) {
      console.error("Failed to update step:", error)
    }
  }

  const handleSaveCompanyInfo = async () => {
    try {
      setSaving(true)
      const response = await api.company.updateBranding(companyForm)
      if (response.success) {
        await updateStepProgress("companyInfo", true)
        toast.success("Company information saved!")
        return true
      } else {
        toast.error(response.message || "Failed to save company information")
        return false
      }
    } catch (error) {
      console.error("Error saving company info:", error)
      toast.error("Failed to save company information")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBranding = async () => {
    try {
      setSaving(true)
      const response = await api.company.updateBranding({
        primaryColor: brandingForm.primaryColor,
        secondaryColor: brandingForm.secondaryColor,
        accentColor: brandingForm.accentColor,
        logoFile: brandingForm.logoFile || undefined,
      })
      if (response.success) {
        await updateStepProgress("branding", true)
        toast.success("Branding saved!")
        return true
      } else {
        toast.error(response.message || "Failed to save branding")
        return false
      }
    } catch (error) {
      console.error("Error saving branding:", error)
      toast.error("Failed to save branding")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmailConfig = async () => {
    if (!emailForm.enabled) {
      await updateStepProgress("emailConfig", true)
      toast.info("Email configuration skipped")
      return true
    }

    try {
      setSaving(true)
      const response = await api.company.updateEmailConfig({
        enabled: emailForm.enabled,
        fromName: emailForm.fromName,
        fromEmail: emailForm.fromEmail,
        smtpHost: emailForm.smtpHost,
        smtpPort: emailForm.smtpPort,
        smtpUser: emailForm.smtpUsername,
        smtpPassword: emailForm.smtpPassword,
      })

      if (response.success) {
        await updateStepProgress("emailConfig", true)
        toast.success("Email configuration saved!")
        return true
      } else {
        toast.error(response.message || "Failed to save email configuration")
        return false
      }
    } catch (error) {
      console.error("Error saving email config:", error)
      toast.error("Failed to save email configuration")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmployees = async () => {
    const validEmployees = employeesForm.employees.filter(
      (emp) => emp.firstName && emp.lastName && emp.email
    )

    if (validEmployees.length === 0) {
      await updateStepProgress("employees", true)
      toast.info("No employees added. You can add them later.")
      return true
    }

    try {
      setSaving(true)
      let successCount = 0

      for (const emp of validEmployees) {
        const response = await api.users.create({
          first_name: emp.firstName,
          last_name: emp.lastName,
          email: emp.email,
          position: emp.position,
          department: emp.department,
          role: "employee",
          password: "TempPassword123!", // Temporary password
        })

        if (response.success) {
          successCount++
        }
      }

      if (successCount > 0) {
        await updateStepProgress("employees", true)
        toast.success(`${successCount} employee(s) added successfully!`)
        return true
      } else {
        toast.error("Failed to add employees")
        return false
      }
    } catch (error) {
      console.error("Error saving employees:", error)
      toast.error("Failed to add employees")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveKPIs = async () => {
    const validKPIs = kpisForm.kpis.filter((kpi) => kpi.name && kpi.description)

    if (validKPIs.length === 0) {
      await updateStepProgress("kpis", true)
      toast.info("No KPIs configured. You can add them later.")
      return true
    }

    try {
      setSaving(true)
      let successCount = 0

      for (const kpi of validKPIs) {
        const response = await api.kpis.create(kpi)
        if (response.success) {
          successCount++
        }
      }

      if (successCount > 0) {
        await updateStepProgress("kpis", true)
        toast.success(`${successCount} KPI(s) configured successfully!`)
        return true
      } else {
        toast.error("Failed to configure KPIs")
        return false
      }
    } catch (error) {
      console.error("Error saving KPIs:", error)
      toast.error("Failed to configure KPIs")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    const currentStep = SETUP_STEPS[currentStepIndex]
    let success = false

    switch (currentStep.id) {
      case "companyInfo":
        success = await handleSaveCompanyInfo()
        break
      case "branding":
        success = await handleSaveBranding()
        break
      case "emailConfig":
        success = await handleSaveEmailConfig()
        break
      case "employees":
        success = await handleSaveEmployees()
        break
      case "kpis":
        success = await handleSaveKPIs()
        break
      default:
        success = true
    }

    if (success && currentStepIndex < SETUP_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else if (success && currentStepIndex === SETUP_STEPS.length - 1) {
      await completeSetup()
    }
  }

  const handleSkipStep = async () => {
    const currentStep = SETUP_STEPS[currentStepIndex]
    if (currentStep.optional) {
      await updateStepProgress(currentStep.id, true)
      toast.info(`${currentStep.title} skipped`)
      if (currentStepIndex < SETUP_STEPS.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1)
      } else {
        await completeSetup()
      }
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const completeSetup = async () => {
    try {
      setCompleting(true)
      const response = await api.setup.complete()

      if (response.success) {
        toast.success("🎉 Setup completed! Welcome to Elevate HR!")
        setTimeout(() => {
          router.push("/admin")
        }, 1500)
      } else {
        toast.error(response.message || "Failed to complete setup")
      }
    } catch (error) {
      console.error("Error completing setup:", error)
      toast.error("Failed to complete setup")
    } finally {
      setCompleting(false)
    }
  }

  const skipAllSetup = async () => {
    try {
      const response = await api.setup.skip({ step: "all" })

      if (response.success) {
        toast.success("Setup skipped. Redirecting to dashboard...")
        setTimeout(() => {
          router.push("/admin")
        }, 1000)
      }
    } catch (error) {
      console.error("Error skipping setup:", error)
      toast.error("Failed to skip setup")
    }
  }

  const addEmployee = () => {
    setEmployeesForm({
      employees: [
        ...employeesForm.employees,
        { firstName: "", lastName: "", email: "", position: "", department: "" },
      ],
    })
  }

  const removeEmployee = (index: number) => {
    setEmployeesForm({
      employees: employeesForm.employees.filter((_, i) => i !== index),
    })
  }

  const addKPI = () => {
    setKpisForm({
      kpis: [
        ...kpisForm.kpis,
        { name: "", description: "", category: "", weight: 20, target: 100, unit: "%" },
      ],
    })
  }

  const removeKPI = (index: number) => {
    setKpisForm({
      kpis: kpisForm.kpis.filter((_, i) => i !== index),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentStep = SETUP_STEPS[currentStepIndex]
  const progress = ((currentStepIndex + 1) / SETUP_STEPS.length) * 100
  const StepIcon = currentStep.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Setup Wizard</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Elevate HR! 🎉</h1>
          <p className="text-muted-foreground">
            Let's get your workspace set up. This will only take a few minutes.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Step {currentStepIndex + 1} of {SETUP_STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {SETUP_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStepIndex
            const isCompleted = setupData?.setupProgress?.steps[step.id]

            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-2 flex-1 ${index < SETUP_STEPS.length - 1 ? "border-r border-border" : ""
                  }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isActive
                      ? "bg-primary text-primary-foreground scale-110"
                      : isCompleted
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <div className="text-center hidden md:block">
                  <p className={`text-xs font-medium ${isActive ? "text-primary" : ""}`}>
                    {step.title}
                  </p>
                  {step.optional && (
                    <p className="text-[10px] text-muted-foreground">(Optional)</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <Card className="p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <StepIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">
                {currentStep.title}
                {currentStep.optional && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">(Optional)</span>
                )}
              </h2>
              <p className="text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>

          {/* Step-specific forms */}
          <div className="space-y-6">
            {currentStep.id === "companyInfo" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Country</Label>
                  <Input
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                    placeholder="Kenya"
                  />
                </div>
                <div>
                  <Label>State/Province</Label>
                  <Input
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    placeholder="Nairobi"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    placeholder="Nairobi"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="+254..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Website (Optional)</Label>
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>
            )}

            {currentStep.id === "branding" && (
              <div className="space-y-6">
                {/* Logo Section */}
                <div className="border rounded-lg p-4 bg-muted/40">
                  <Label className="text-base mb-3 block">Logo (Optional)</Label>
                  <p className="text-sm text-muted-foreground mb-4">PNG or SVG format, up to 300 KB recommended</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-background transition">
                    <span className="text-sm font-medium">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setBrandingForm({ ...brandingForm, logoFile: e.target.files[0] })
                        }
                      }}
                    />
                  </label>
                  {brandingForm.logoFile && (
                    <p className="text-sm text-muted-foreground mt-2">Selected: {brandingForm.logoFile.name}</p>
                  )}
                </div>

                {/* Colors Section */}
                <div className="space-y-4">
                  <Label className="text-base">Brand Colors</Label>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Primary Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={(e) =>
                            setBrandingForm({ ...brandingForm, primaryColor: e.target.value })
                          }
                          className="w-16 h-10"
                        />
                        <Input value={brandingForm.primaryColor} readOnly className="text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Secondary Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={brandingForm.secondaryColor}
                          onChange={(e) =>
                            setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })
                          }
                          className="w-16 h-10"
                        />
                        <Input value={brandingForm.secondaryColor} readOnly className="text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Accent Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={brandingForm.accentColor}
                          onChange={(e) =>
                            setBrandingForm({ ...brandingForm, accentColor: e.target.value })
                          }
                          className="w-16 h-10"
                        />
                        <Input value={brandingForm.accentColor} readOnly className="text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    You can customize more branding options (fonts, button styles, background colors) after setup in Company Settings.
                  </p>
                </div>
              </div>
            )}

            {currentStep.id === "emailConfig" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label>Enable Company Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Send emails from your own domain
                    </p>
                  </div>
                  <Switch
                    checked={emailForm.enabled}
                    onCheckedChange={(checked) =>
                      setEmailForm({ ...emailForm, enabled: checked })
                    }
                  />
                </div>

                {emailForm.enabled && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>From Name</Label>
                      <Input
                        value={emailForm.fromName}
                        onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                        placeholder="Your Company"
                      />
                    </div>
                    <div>
                      <Label>From Email</Label>
                      <Input
                        type="email"
                        value={emailForm.fromEmail}
                        onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })}
                        placeholder="noreply@company.com"
                      />
                    </div>
                    <div>
                      <Label>SMTP Host</Label>
                      <Input
                        value={emailForm.smtpHost}
                        onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        value={emailForm.smtpPort}
                        onChange={(e) =>
                          setEmailForm({ ...emailForm, smtpPort: Number(e.target.value) })
                        }
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <Label>SMTP Username</Label>
                      <Input
                        value={emailForm.smtpUsername}
                        onChange={(e) =>
                          setEmailForm({ ...emailForm, smtpUsername: e.target.value })
                        }
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <Label>SMTP Password</Label>
                      <Input
                        type="password"
                        value={emailForm.smtpPassword}
                        onChange={(e) =>
                          setEmailForm({ ...emailForm, smtpPassword: e.target.value })
                        }
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep.id === "employees" && (
              <div className="space-y-4">
                {employeesForm.employees.map((emp, index) => (
                  <Card key={index} className="p-4 relative">
                    {employeesForm.employees.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeEmployee(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          value={emp.firstName}
                          onChange={(e) => {
                            const newEmployees = [...employeesForm.employees]
                            newEmployees[index].firstName = e.target.value
                            setEmployeesForm({ employees: newEmployees })
                          }}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input
                          value={emp.lastName}
                          onChange={(e) => {
                            const newEmployees = [...employeesForm.employees]
                            newEmployees[index].lastName = e.target.value
                            setEmployeesForm({ employees: newEmployees })
                          }}
                          placeholder="Doe"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={emp.email}
                          onChange={(e) => {
                            const newEmployees = [...employeesForm.employees]
                            newEmployees[index].email = e.target.value
                            setEmployeesForm({ employees: newEmployees })
                          }}
                          placeholder="john.doe@company.com"
                        />
                      </div>
                      <div>
                        <Label>Position</Label>
                        <Input
                          value={emp.position}
                          onChange={(e) => {
                            const newEmployees = [...employeesForm.employees]
                            newEmployees[index].position = e.target.value
                            setEmployeesForm({ employees: newEmployees })
                          }}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Department</Label>
                        <Input
                          value={emp.department}
                          onChange={(e) => {
                            const newEmployees = [...employeesForm.employees]
                            newEmployees[index].department = e.target.value
                            setEmployeesForm({ employees: newEmployees })
                          }}
                          placeholder="Engineering"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addEmployee} className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Add Another Employee
                </Button>
              </div>
            )}

            {currentStep.id === "kpis" && (
              <div className="space-y-4">
                {kpisForm.kpis.map((kpi, index) => (
                  <Card key={index} className="p-4 relative">
                    {kpisForm.kpis.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeKPI(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>KPI Name</Label>
                        <Input
                          value={kpi.name}
                          onChange={(e) => {
                            const newKPIs = [...kpisForm.kpis]
                            newKPIs[index].name = e.target.value
                            setKpisForm({ kpis: newKPIs })
                          }}
                          placeholder="Sales Revenue"
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Input
                          value={kpi.category}
                          onChange={(e) => {
                            const newKPIs = [...kpisForm.kpis]
                            newKPIs[index].category = e.target.value
                            setKpisForm({ kpis: newKPIs })
                          }}
                          placeholder="Sales"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={kpi.description}
                          onChange={(e) => {
                            const newKPIs = [...kpisForm.kpis]
                            newKPIs[index].description = e.target.value
                            setKpisForm({ kpis: newKPIs })
                          }}
                          placeholder="Measure sales performance"
                        />
                      </div>
                      <div>
                        <Label>Weight (%)</Label>
                        <Input
                          type="number"
                          value={kpi.weight}
                          onChange={(e) => {
                            const newKPIs = [...kpisForm.kpis]
                            newKPIs[index].weight = Number(e.target.value)
                            setKpisForm({ kpis: newKPIs })
                          }}
                          placeholder="20"
                        />
                      </div>
                      <div>
                        <Label>Target</Label>
                        <Input
                          type="number"
                          value={kpi.target}
                          onChange={(e) => {
                            const newKPIs = [...kpisForm.kpis]
                            newKPIs[index].target = Number(e.target.value)
                            setKpisForm({ kpis: newKPIs })
                          }}
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addKPI} className="w-full">
                  <Target className="w-4 h-4 mr-2" />
                  Add Another KPI
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={handleBack} disabled={saving || completing}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep.optional && (
              <Button variant="ghost" onClick={handleSkipStep} disabled={saving || completing}>
                Skip
              </Button>
            )}
            <Button onClick={handleNext} disabled={saving || completing}>
              {saving || completing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStepIndex === SETUP_STEPS.length - 1 ? "Completing..." : "Saving..."}
                </>
              ) : (
                <>
                  {currentStepIndex === SETUP_STEPS.length - 1 ? "Complete Setup" : "Save & Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip All Link */}
        <div className="text-center mt-6">
          <button
            onClick={skipAllSetup}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Skip setup and go to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
