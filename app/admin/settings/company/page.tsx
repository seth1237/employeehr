"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Loader2,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Type,
  Layout,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationSelector } from "@/components/ui/location-selector";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { MANAGER_SECTION_OPTIONS } from "@/lib/manager-access";
import { AdvancedBrandingSettings } from "@/components/admin/advanced-branding-settings";

export default function CompanySettingsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#059669");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1f2937");
  const [borderRadius, setBorderRadius] = useState("0.5rem");
  const [fontFamily, setFontFamily] = useState("system-ui");
  const [buttonStyle, setButtonStyle] = useState("rounded");
  // Advanced Branding Features
  const [glassEnabled, setGlassEnabled] = useState(true);
  const [glassOpacity, setGlassOpacity] = useState(15);
  const [glassBlur, setGlassBlur] = useState(18);
  const [glassTint, setGlassTint] = useState("white");
  const [buttonShadow, setButtonShadow] = useState("medium");
  const [hoverAnimation, setHoverAnimation] = useState("lift");
  const [buttonGradient, setButtonGradient] = useState(true);
  const [glowEffect, setGlowEffect] = useState("soft");
  const [transparency, setTransparency] = useState(0);
  const [rippleEffect, setRippleEffect] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState("normal");
  const [cardStyle, setCardStyle] = useState("glass");
  const [sidebarStyle, setSidebarStyle] = useState("glass");
  const [borderStyle, setBorderStyle] = useState("solid");
  const [cornerStyle, setCornerStyle] = useState("rounded");
  const [pageBackground, setPageBackground] = useState("gradient");
  const [iconStyle, setIconStyle] = useState("icon-left");
  const [buttonSize, setButtonSize] = useState("medium");
  const [buttonPadding, setButtonPadding] = useState("comfortable");
  const [navigationAnimation, setNavigationAnimation] = useState("slide");
  const [themePreset, setThemePreset] = useState("corporate");

  // Location & Holidays
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [allocatingDept, setAllocatingDept] = useState<any | null>(null);
  const [allocOpen, setAllocOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [newDept, setNewDept] = useState("");
  const [kpis, setKpis] = useState<any[]>([]);
  const [newKpi, setNewKpi] = useState({
    name: "",
    description: "",
    category: "Operations",
    weight: "50",
    target: "100",
    unit: "%",
    department_id: "",
  });

  useEffect(() => {
    loadBranding();
    loadDepartments();
    loadKpis();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.company.getDepartments();
      if (res?.success) setDepartments(res.data || []);
    } catch (e) {
      console.error("Failed to load departments", e);
    }
  };

  const loadKpis = async () => {
    try {
      const res = await api.kpis.getAll();
      if (res?.success) setKpis(res.data || []);
    } catch (e) {
      console.error("Failed to load KPIs", e);
    }
  };

  const loadBranding = async () => {
    try {
      setLoading(true);
      const res = await api.company.getBranding();
      if (res?.success && res.data) {
        setName(res.data.name || "");
        setLogo(res.data.logo);
        setPrimaryColor(res.data.primaryColor || "#2563eb");
        setSecondaryColor(res.data.secondaryColor || "#059669");
        setAccentColor(res.data.accentColor || "#f59e0b");
        setBackgroundColor(res.data.backgroundColor || "#ffffff");
        setTextColor(res.data.textColor || "#1f2937");
        setBorderRadius(res.data.borderRadius || "0.5rem");
        setFontFamily(res.data.fontFamily || "system-ui");
        setButtonStyle(res.data.buttonStyle || "rounded");
        // Advanced branding
        setGlassEnabled(res.data.glassEnabled ?? true);
        setGlassOpacity(res.data.glassOpacity ?? 15);
        setGlassBlur(res.data.glassBlur ?? 18);
        setGlassTint(res.data.glassTint || "white");
        setButtonShadow(res.data.buttonShadow || "medium");
        setHoverAnimation(res.data.hoverAnimation || "lift");
        setButtonGradient(res.data.buttonGradient ?? true);
        setGlowEffect(res.data.glowEffect || "soft");
        setTransparency(res.data.transparency ?? 0);
        setRippleEffect(res.data.rippleEffect ?? true);
        setAnimationSpeed(res.data.animationSpeed || "normal");
        setCardStyle(res.data.cardStyle || "glass");
        setSidebarStyle(res.data.sidebarStyle || "glass");
        setBorderStyle(res.data.borderStyle || "solid");
        setCornerStyle(res.data.cornerStyle || "rounded");
        setPageBackground(res.data.pageBackground || "gradient");
        setIconStyle(res.data.iconStyle || "icon-left");
        setButtonSize(res.data.buttonSize || "medium");
        setButtonPadding(res.data.buttonPadding || "comfortable");
        setNavigationAnimation(res.data.navigationAnimation || "slide");
        setThemePreset(res.data.themePreset || "corporate");
        setCountry(res.data.country || "");
        setState(res.data.state || "");
        setCity(res.data.city || "");
        setCountryCode(res.data.countryCode || "");

        // Apply colors immediately after loading
        setTimeout(() => {
          applyCssVarsFromApi(res.data);
        }, 0);
      }
    } catch (e: any) {
      toast({
        description: e.message || "Failed to load branding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyCssVarsFromApi = (brandingData: any) => {
    const root = document.documentElement;
    const pc = brandingData.primaryColor || "#2563eb";
    const sc = brandingData.secondaryColor || "#059669";
    const ac = brandingData.accentColor || "#f59e0b";
    const bgc = brandingData.backgroundColor || "#ffffff";
    const tc = brandingData.textColor || "#1f2937";
    const br = brandingData.borderRadius || "0.5rem";
    const ff = brandingData.fontFamily || "system-ui";
    const logo = brandingData.logo;

    // Core colors and styles
    root.style.setProperty("--brand-primary", pc);
    root.style.setProperty("--primary", pc);
    root.style.setProperty("--brand-secondary", sc);
    root.style.setProperty("--brand-accent", ac);
    root.style.setProperty("--accent", ac);
    root.style.setProperty("--brand-background", bgc);
    root.style.setProperty("--brand-text", tc);
    root.style.setProperty("--background", bgc);
    root.style.setProperty("--foreground", tc);
    root.style.setProperty("--brand-radius", br);
    root.style.setProperty("--radius", br);
    root.style.setProperty("--brand-font", ff);
    root.style.fontFamily = ff;
    root.style.backgroundColor = bgc;
    if (logo) root.style.setProperty("--company-logo-url", `url('${logo}')`);

    // Apply advanced branding vars
    const glassEnabledVal = brandingData.glassEnabled ?? true;
    const glassOpacityVal = brandingData.glassOpacity ?? 15;
    const glassBlurVal = brandingData.glassBlur ?? 18;
    const glassTintVal = brandingData.glassTint || "white";
    const buttonShadowVal = brandingData.buttonShadow || "medium";
    const hoverAnimationVal = brandingData.hoverAnimation || "lift";
    const buttonGradientVal = brandingData.buttonGradient ?? true;
    const glowEffectVal = brandingData.glowEffect || "soft";
    const transparencyVal = brandingData.transparency ?? 0;
    const rippleEffectVal = brandingData.rippleEffect ?? true;
    const animationSpeedVal = brandingData.animationSpeed || "normal";
    const cardStyleVal = brandingData.cardStyle || "glass";
    const sidebarStyleVal = brandingData.sidebarStyle || "glass";
    const borderStyleVal = brandingData.borderStyle || "solid";
    const cornerStyleVal = brandingData.cornerStyle || "rounded";
    const pageBackgroundVal = brandingData.pageBackground || "gradient";
    const iconStyleVal = brandingData.iconStyle || "icon-left";
    const buttonSizeVal = brandingData.buttonSize || "medium";
    const buttonPaddingVal = brandingData.buttonPadding || "comfortable";
    const navigationAnimationVal = brandingData.navigationAnimation || "slide";
    const themePresetVal = brandingData.themePreset || "corporate";

    root.style.setProperty("--glass-enabled", glassEnabledVal ? "1" : "0");
    root.style.setProperty("--glass-opacity", `${glassOpacityVal}%`);
    root.style.setProperty("--glass-blur", `${glassBlurVal}px`);
    root.style.setProperty("--glass-tint", glassTintVal);
    root.style.setProperty("--button-shadow", buttonShadowVal);
    root.style.setProperty("--hover-animation", hoverAnimationVal);
    root.style.setProperty("--gradient-enabled", buttonGradientVal ? "1" : "0");
    root.style.setProperty("--glow-effect", glowEffectVal);
    root.style.setProperty("--transparency", `${transparencyVal}%`);
    root.style.setProperty("--ripple-enabled", rippleEffectVal ? "1" : "0");
    const speeds = { fast: "0.15s", normal: "0.3s", slow: "0.5s" };
    root.style.setProperty(
      "--animation-duration",
      speeds[animationSpeedVal as keyof typeof speeds] || "0.3s",
    );
    root.style.setProperty("--card-style", cardStyleVal);
    root.style.setProperty("--sidebar-style", sidebarStyleVal);
    root.style.setProperty("--border-style", borderStyleVal);
    root.style.setProperty("--corner-style", cornerStyleVal);
    root.style.setProperty("--page-background", pageBackgroundVal);
    root.style.setProperty("--icon-style", iconStyleVal);
    root.style.setProperty("--button-size", buttonSizeVal);
    root.style.setProperty("--button-padding", buttonPaddingVal);
    root.style.setProperty("--nav-animation", navigationAnimationVal);
    root.style.setProperty("--theme-preset", themePresetVal);

    console.log("✓ CSS variables applied from branding data");
  };

  const onLogoFile = (file: File) => {
    if (!file) return;
    setLogoFile(file);
    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const applyCssVars = () => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primaryColor);
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--brand-secondary", secondaryColor);
    root.style.setProperty("--brand-accent", accentColor);
    root.style.setProperty("--accent", accentColor);
    root.style.setProperty("--brand-background", backgroundColor);
    root.style.setProperty("--brand-text", textColor);
    root.style.setProperty("--background", backgroundColor);
    root.style.setProperty("--foreground", textColor);
    root.style.setProperty("--brand-radius", borderRadius);
    root.style.setProperty("--radius", borderRadius);
    root.style.setProperty("--brand-font", fontFamily);
    // Actually apply the font family to the entire document
    root.style.fontFamily = fontFamily;
    // Apply to actual page background
    root.style.backgroundColor = backgroundColor;
    if (logo) root.style.setProperty("--company-logo-url", `url('${logo}')`);
    // Apply advanced branding vars
    root.style.setProperty("--glass-enabled", glassEnabled ? "1" : "0");
    root.style.setProperty("--glass-opacity", `${glassOpacity}%`);
    root.style.setProperty("--glass-blur", `${glassBlur}px`);
    root.style.setProperty("--glass-tint", glassTint);
    root.style.setProperty("--button-shadow", buttonShadow);
    root.style.setProperty("--hover-animation", hoverAnimation);
    root.style.setProperty("--gradient-enabled", buttonGradient ? "1" : "0");
    root.style.setProperty("--glow-effect", glowEffect);
    root.style.setProperty("--transparency", `${transparency}%`);
    root.style.setProperty("--ripple-enabled", rippleEffect ? "1" : "0");
    const speeds = { fast: "0.15s", normal: "0.3s", slow: "0.5s" };
    root.style.setProperty(
      "--animation-duration",
      speeds[animationSpeed as keyof typeof speeds] || "0.3s",
    );
    root.style.setProperty("--card-style", cardStyle);
    root.style.setProperty("--sidebar-style", sidebarStyle);
    root.style.setProperty("--border-style", borderStyle);
    root.style.setProperty("--corner-style", cornerStyle);
    root.style.setProperty("--page-background", pageBackground);
    root.style.setProperty("--icon-style", iconStyle);
    root.style.setProperty("--button-size", buttonSize);
    root.style.setProperty("--button-padding", buttonPadding);
    root.style.setProperty("--nav-animation", navigationAnimation);
    root.style.setProperty("--theme-preset", themePreset);
  };

  const saveBranding = async () => {
    try {
      setSaving(true);
      const res = await api.company.updateBranding({
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        borderRadius,
        fontFamily,
        buttonStyle,
        logoFile: logoFile || undefined,
        logoUrl: logoFile ? undefined : logo,
        country,
        state,
        city,
        countryCode,
        // Advanced branding
        glassEnabled,
        glassOpacity,
        glassBlur,
        glassTint,
        buttonShadow,
        hoverAnimation,
        buttonGradient,
        glowEffect,
        transparency,
        rippleEffect,
        animationSpeed,
        cardStyle,
        sidebarStyle,
        borderStyle,
        cornerStyle,
        pageBackground,
        iconStyle,
        buttonSize,
        buttonPadding,
        navigationAnimation,
        themePreset,
      });
      if (res?.success && res.data) {
        // Confirm data persisted to database
        console.log("✓ Branding saved to database:", res.data);
        // Update all state from response
        setPrimaryColor(res.data.primaryColor || primaryColor);
        setSecondaryColor(res.data.secondaryColor || secondaryColor);
        setAccentColor(res.data.accentColor || accentColor);
        setBackgroundColor(res.data.backgroundColor || backgroundColor);
        setTextColor(res.data.textColor || textColor);
        setBorderRadius(res.data.borderRadius || borderRadius);
        setFontFamily(res.data.fontFamily || fontFamily);
        setButtonStyle(res.data.buttonStyle || buttonStyle);
        // Advanced branding
        setGlassEnabled(res.data.glassEnabled ?? glassEnabled);
        setGlassOpacity(res.data.glassOpacity ?? glassOpacity);
        setGlassBlur(res.data.glassBlur ?? glassBlur);
        setGlassTint(res.data.glassTint || glassTint);
        setButtonShadow(res.data.buttonShadow || buttonShadow);
        setHoverAnimation(res.data.hoverAnimation || hoverAnimation);
        setButtonGradient(res.data.buttonGradient ?? buttonGradient);
        setGlowEffect(res.data.glowEffect || glowEffect);
        setTransparency(res.data.transparency ?? transparency);
        setRippleEffect(res.data.rippleEffect ?? rippleEffect);
        setAnimationSpeed(res.data.animationSpeed || animationSpeed);
        setCardStyle(res.data.cardStyle || cardStyle);
        setSidebarStyle(res.data.sidebarStyle || sidebarStyle);
        setBorderStyle(res.data.borderStyle || borderStyle);
        setCornerStyle(res.data.cornerStyle || cornerStyle);
        setPageBackground(res.data.pageBackground || pageBackground);
        setIconStyle(res.data.iconStyle || iconStyle);
        setButtonSize(res.data.buttonSize || buttonSize);
        setButtonPadding(res.data.buttonPadding || buttonPadding);
        setNavigationAnimation(
          res.data.navigationAnimation || navigationAnimation,
        );
        setThemePreset(res.data.themePreset || themePreset);
        // Update logo display with the server response
        setLogo(res.data.logo);
        setLogoFile(null); // Clear file input
        // Apply CSS variables directly from response data
        console.log("Applying CSS variables from saved branding data");
        applyCssVarsFromApi(res.data);
        toast({
          description:
            "✓ Branding saved successfully! All changes have been applied.",
          variant: "default",
        });
      } else {
        throw new Error("No response data");
      }
    } catch (e: any) {
      console.error("Save error:", e);
      toast({
        description: e.message || "Failed to save branding",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncHolidays = async () => {
    try {
      setSyncingHolidays(true);
      // Save location first if changed
      if (countryCode) {
        await api.company.updateBranding({ countryCode });
      }

      const res = await api.holidays.sync({ year: new Date().getFullYear() });
      if (res.success) {
        toast({
          description: `✓ ${res.message}`,
          variant: "default",
        });
      } else {
        throw new Error(res.message);
      }
    } catch (e: any) {
      toast({
        description: e.message || "Failed to sync holidays",
        variant: "destructive",
      });
    } finally {
      setSyncingHolidays(false);
    }
  };

  const resetDefaults = () => {
    setPrimaryColor("#2563eb");
    setSecondaryColor("#059669");
    setAccentColor("#f59e0b");
    setBackgroundColor("#ffffff");
    setTextColor("#1f2937");
    setBorderRadius("0.5rem");
    setFontFamily("system-ui");
    setButtonStyle("rounded");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Company Branding
            </h1>
            <p className="text-muted-foreground">
              Set your logo and brand colors. Changes apply to all users in your
              organization.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDefaults} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={saveBranding} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Components Preview:</p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-2 text-sm font-medium rounded transition ${
                  buttonGradient ? "btn-gradient" : ""
                } hover:opacity-90`}
                style={{
                  background: buttonGradient
                    ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
                    : primaryColor,
                  color: "white",
                  boxShadow: glassEnabled
                    ? `var(--button-shadow-${buttonShadow})`
                    : "none",
                  borderRadius:
                    cornerStyle === "pill"
                      ? "9999px"
                      : cornerStyle === "sharp"
                        ? "0"
                        : cornerStyle === "soft"
                          ? "12px"
                          : "6px",
                }}
              >
                Primary Button
              </button>
              <button
                className="glass px-3 py-2 text-sm font-medium rounded text-foreground transition hover:opacity-90"
                style={{
                  borderRadius:
                    cornerStyle === "pill"
                      ? "9999px"
                      : cornerStyle === "sharp"
                        ? "0"
                        : cornerStyle === "soft"
                          ? "12px"
                          : "6px",
                }}
              >
                Glass Button
              </button>
              <div
                className="p-3 rounded flex-1 min-w-32"
                style={{
                  background:
                    pageBackground === "gradient"
                      ? `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`
                      : pageBackground === "mesh"
                        ? "radial-gradient(at 20% 50%, rgba(59, 130, 246, 0.2) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(132, 204, 22, 0.2) 0px, transparent 50%)"
                        : backgroundColor,
                  borderRadius:
                    cornerStyle === "pill"
                      ? "9999px"
                      : cornerStyle === "sharp"
                        ? "0"
                        : cornerStyle === "soft"
                          ? "12px"
                          : "6px",
                }}
              >
                <p className="text-xs font-medium">Card Preview</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pageBackground} background
                </p>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Theme Preset:{" "}
            <span className="font-medium capitalize">{themePreset}</span> |
            Glass:{" "}
            <span className="font-medium">{glassEnabled ? "On" : "Off"}</span> |
            Animation:{" "}
            <span className="font-medium capitalize">{animationSpeed}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="New department name"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    if (!newDept.trim()) return;
                    try {
                      const r = await api.company.createDepartment({
                        name: newDept.trim(),
                      });
                      if (r?.success) {
                        setNewDept("");
                        loadDepartments();
                        toast({ description: "Department created" });
                      }
                    } catch (err: any) {
                      toast({
                        description:
                          err.message || "Failed to create department",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Create
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d: any) => (
                  <div key={d._id} className="flex items-center gap-2">
                    <Badge>{d.name}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const newName = window.prompt(
                          "Rename department",
                          d.name,
                        );
                        if (!newName) return;
                        try {
                          const r = await api.company.updateDepartment(d._id, {
                            name: newName.trim(),
                          });
                          if (r?.success) {
                            toast({ description: "Department renamed" });
                            loadDepartments();
                          }
                        } catch (err: any) {
                          toast({
                            description:
                              err.message || "Failed to rename department",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm(`Delete department "${d.name}"?`)) return;
                        try {
                          const r = await api.company.deleteDepartment(d._id);
                          if (r?.success) {
                            toast({ description: "Department deleted" });
                            loadDepartments();
                          }
                        } catch (err: any) {
                          toast({
                            description:
                              err.message || "Failed to delete department",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <Dialog
                      open={allocOpen && allocatingDept?._id === d._id}
                      onOpenChange={(open) => {
                        setAllocOpen(open);
                        if (!open) setAllocatingDept(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAllocatingDept(d);
                            setSelectedSections(
                              Array.isArray(d.sidebarSections)
                                ? d.sidebarSections
                                : [],
                            );
                            setAllocOpen(true);
                          }}
                        >
                          Allocate Sidebar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Allocate Sidebar Access — {d.name}
                          </DialogTitle>
                          <DialogDescription>
                            Select which sidebar sections should be available to
                            this department's managers.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-2">
                          {MANAGER_SECTION_OPTIONS.map((s) => (
                            <div key={s} className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedSections.includes(s)}
                                onCheckedChange={(val) => {
                                  const checked = !!val;
                                  setSelectedSections((prev) =>
                                    checked
                                      ? Array.from(new Set([...prev, s]))
                                      : prev.filter((x) => x !== s),
                                  );
                                }}
                              />
                              <div className="text-sm">{s}</div>
                            </div>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setAllocOpen(false);
                              setAllocatingDept(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={async () => {
                              if (!allocatingDept) return;
                              try {
                                const res = await api.company.updateDepartment(
                                  allocatingDept._id,
                                  { sidebarSections: selectedSections },
                                );
                                if (res?.success) {
                                  toast({
                                    description: "Sidebar access updated",
                                  });
                                  loadDepartments();
                                  setAllocOpen(false);
                                  setAllocatingDept(null);
                                }
                              } catch (err: any) {
                                toast({
                                  description:
                                    err.message ||
                                    "Failed to update sidebar access",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Save
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department KPIs (collapsible) */}
        <Collapsible defaultOpen={false}>
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-base flex items-center gap-2">
                  Department KPIs
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Toggle
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="KPI name"
                    value={newKpi.name}
                    onChange={(e) =>
                      setNewKpi({ ...newKpi, name: e.target.value })
                    }
                  />
                  <Select
                    value={newKpi.department_id}
                    onValueChange={(v) =>
                      setNewKpi({ ...newKpi, department_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Category"
                    value={newKpi.category}
                    onChange={(e) =>
                      setNewKpi({ ...newKpi, category: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Unit"
                    value={newKpi.unit}
                    onChange={(e) =>
                      setNewKpi({ ...newKpi, unit: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Weight"
                    type="number"
                    value={newKpi.weight}
                    onChange={(e) =>
                      setNewKpi({ ...newKpi, weight: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Target"
                    type="number"
                    value={newKpi.target}
                    onChange={(e) =>
                      setNewKpi({ ...newKpi, target: e.target.value })
                    }
                  />
                </div>
                <Input
                  placeholder="Description"
                  value={newKpi.description}
                  onChange={(e) =>
                    setNewKpi({ ...newKpi, description: e.target.value })
                  }
                />
                <Button
                  onClick={async () => {
                    if (!newKpi.name.trim()) return;
                    try {
                      const r = await api.kpis.create({
                        name: newKpi.name.trim(),
                        description: newKpi.description.trim(),
                        category: newKpi.category.trim(),
                        weight: Number(newKpi.weight) || 50,
                        target: Number(newKpi.target) || 100,
                        unit: newKpi.unit.trim(),
                        department_id: newKpi.department_id || undefined,
                      } as any);
                      if (r?.success) {
                        toast({ description: "KPI created" });
                        setNewKpi({
                          name: "",
                          description: "",
                          category: "Operations",
                          weight: "50",
                          target: "100",
                          unit: "%",
                          department_id: "",
                        });
                        loadKpis();
                      }
                    } catch (err: any) {
                      toast({
                        description: err.message || "Failed to create KPI",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Create KPI
                </Button>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {kpis.map((kpi: any) => (
                    <div
                      key={kpi._id}
                      className="flex items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div>
                        <div className="font-medium">{kpi.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {kpi.category} •{" "}
                          {departments.find((d) => d._id === kpi.department_id)
                            ?.name || "All departments"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Delete KPI \"${kpi.name}\"?`)) return;
                          try {
                            const r = await api.kpis.delete(kpi._id);
                            if (r?.success) {
                              toast({ description: "KPI deleted" });
                              loadKpis();
                            }
                          } catch (err: any) {
                            toast({
                              description:
                                err.message || "Failed to delete KPI",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Location & Holidays */}
        <Card className="md:col-span-2 border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Location & Holidays
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncHolidays}
                disabled={syncingHolidays || !countryCode}
              >
                {syncingHolidays ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Public Holidays
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationSelector
              country={country}
              state={state}
              city={city}
              onCountryChange={(name, code) => {
                setCountry(name);
                setCountryCode(code);
                setState("");
                setCity("");
              }}
              onStateChange={(name) => {
                setState(name);
                setCity("");
              }}
              onCityChange={(name) => setCity(name)}
              disabled={saving || loading}
            />
            {!countryCode && (
              <p className="text-sm text-yellow-600">
                Please select a country to enable holiday synchronization.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Company Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo preview"
                  className="w-20 h-20 border rounded object-contain"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.warn("Logo failed to load:", logo);
                    // hide the broken image and clear the logo state so UI shows placeholder
                    e.currentTarget.style.display = "none";
                    setLogo(undefined);
                  }}
                />
              ) : (
                <div className="w-20 h-20 border rounded bg-center bg-no-repeat bg-contain bg-gray-100" />
              )}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  PNG or SVG, up to ~300 KB recommended
                </p>
                {logo && (
                  <p className="text-xs text-gray-500 mb-2 break-all">{logo}</p>
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-secondary">
                  <ImageIcon className="w-4 h-4" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && onLogoFile(e.target.files[0])
                    }
                  />
                </label>
              </div>
            </div>
            <div>
              <Label>Or Logo URL</Label>
              <Input
                placeholder="https://.../logo.png"
                value={logo || ""}
                onChange={(e) => setLogo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Primary & Secondary Colors */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Primary & Secondary Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Primary</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded border cursor-pointer"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Secondary</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded border cursor-pointer"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Accent</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded border cursor-pointer"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background & Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Background & Text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Background</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded border cursor-pointer"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Text</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded border cursor-pointer"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography & Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="w-4 h-4" />
              Typography & Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Font Family</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system-ui">System UI</SelectItem>
                  <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                  <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">
                    Open Sans
                  </SelectItem>
                  <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                  <SelectItem value="'Montserrat', sans-serif">
                    Montserrat
                  </SelectItem>
                  <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Border Radius</Label>
              <Select value={borderRadius} onValueChange={setBorderRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (0)</SelectItem>
                  <SelectItem value="0.25rem">Small (0.25rem)</SelectItem>
                  <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                  <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                  <SelectItem value="1rem">Extra Large (1rem)</SelectItem>
                  <SelectItem value="9999px">Full (Pill)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Button Style</Label>
              <Select value={buttonStyle} onValueChange={setButtonStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="sharp">Sharp</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border p-6 space-y-4"
            style={{
              background: backgroundColor,
              color: textColor,
              fontFamily: fontFamily,
            }}
          >
            <h3 className="text-lg font-semibold">Sample Card</h3>
            <p className="text-sm opacity-80">
              This is how your branding will appear across the platform.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                className="px-4 py-2 text-white font-medium transition hover:opacity-90"
                style={{
                  background: primaryColor,
                  borderRadius:
                    buttonStyle === "pill"
                      ? "9999px"
                      : buttonStyle === "sharp"
                        ? "0"
                        : borderRadius,
                }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 text-white font-medium transition hover:opacity-90"
                style={{
                  background: secondaryColor,
                  borderRadius:
                    buttonStyle === "pill"
                      ? "9999px"
                      : buttonStyle === "sharp"
                        ? "0"
                        : borderRadius,
                }}
              >
                Secondary Button
              </button>
              <button
                className="px-4 py-2 text-white font-medium transition hover:opacity-90"
                style={{
                  background: accentColor,
                  borderRadius:
                    buttonStyle === "pill"
                      ? "9999px"
                      : buttonStyle === "sharp"
                        ? "0"
                        : borderRadius,
                }}
              >
                Accent Button
              </button>
            </div>
            {logo && (
              <div
                className="pt-4 border-t"
                style={{ borderColor: textColor + "20" }}
              >
                <p className="text-xs opacity-60 mb-2">Logo:</p>
                <div
                  className="w-32 h-12 bg-center bg-no-repeat bg-contain"
                  style={{ backgroundImage: `url('${logo}')` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Branding Features */}
      <AdvancedBrandingSettings
        glassEnabled={glassEnabled}
        setGlassEnabled={setGlassEnabled}
        glassOpacity={glassOpacity}
        setGlassOpacity={setGlassOpacity}
        glassBlur={glassBlur}
        setGlassBlur={setGlassBlur}
        glassTint={glassTint}
        setGlassTint={setGlassTint}
        buttonShadow={buttonShadow}
        setButtonShadow={setButtonShadow}
        hoverAnimation={hoverAnimation}
        setHoverAnimation={setHoverAnimation}
        buttonGradient={buttonGradient}
        setButtonGradient={setButtonGradient}
        glowEffect={glowEffect}
        setGlowEffect={setGlowEffect}
        transparency={transparency}
        setTransparency={setTransparency}
        rippleEffect={rippleEffect}
        setRippleEffect={setRippleEffect}
        animationSpeed={animationSpeed}
        setAnimationSpeed={setAnimationSpeed}
        cardStyle={cardStyle}
        setCardStyle={setCardStyle}
        sidebarStyle={sidebarStyle}
        setSidebarStyle={setSidebarStyle}
        borderStyle={borderStyle}
        setBorderStyle={setBorderStyle}
        cornerStyle={cornerStyle}
        setCornerStyle={setCornerStyle}
        pageBackground={pageBackground}
        setPageBackground={setPageBackground}
        iconStyle={iconStyle}
        setIconStyle={setIconStyle}
        buttonSize={buttonSize}
        setButtonSize={setButtonSize}
        buttonPadding={buttonPadding}
        setButtonPadding={setButtonPadding}
        navigationAnimation={navigationAnimation}
        setNavigationAnimation={setNavigationAnimation}
        themePreset={themePreset}
        setThemePreset={setThemePreset}
      />

      <Card>
        <CardContent className="text-sm text-muted-foreground p-4">
          Organization:{" "}
          <span className="font-medium">{name || "Your Company"}</span>
        </CardContent>
      </Card>
    </div>
  );
}
