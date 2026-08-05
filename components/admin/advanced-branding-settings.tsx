"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdvancedBrandingSettingsProps {
  // Glass
  glassEnabled: boolean;
  setGlassEnabled: (v: boolean) => void;
  glassOpacity: number;
  setGlassOpacity: (v: number) => void;
  glassBlur: number;
  setGlassBlur: (v: number) => void;
  glassTint: string;
  setGlassTint: (v: string) => void;
  // Buttons
  buttonShadow: string;
  setButtonShadow: (v: string) => void;
  hoverAnimation: string;
  setHoverAnimation: (v: string) => void;
  buttonGradient: boolean;
  setButtonGradient: (v: boolean) => void;
  glowEffect: string;
  setGlowEffect: (v: string) => void;
  buttonSize: string;
  setButtonSize: (v: string) => void;
  buttonPadding: string;
  setButtonPadding: (v: string) => void;
  // Animations
  animationSpeed: string;
  setAnimationSpeed: (v: string) => void;
  navigationAnimation: string;
  setNavigationAnimation: (v: string) => void;
  rippleEffect: boolean;
  setRippleEffect: (v: boolean) => void;
  transparency: number;
  setTransparency: (v: number) => void;
  // Components
  cardStyle: string;
  setCardStyle: (v: string) => void;
  sidebarStyle: string;
  setSidebarStyle: (v: string) => void;
  pageBackground: string;
  setPageBackground: (v: string) => void;
  cornerStyle: string;
  setCornerStyle: (v: string) => void;
  borderStyle: string;
  setBorderStyle: (v: string) => void;
  iconStyle: string;
  setIconStyle: (v: string) => void;
  themePreset: string;
  setThemePreset: (v: string) => void;
}

export function AdvancedBrandingSettings(props: AdvancedBrandingSettingsProps) {
  return (
    <>
      {/* Theme Presets - Prominent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme Preset</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={props.themePreset} onValueChange={props.setThemePreset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="dark-glass">Dark Glass</SelectItem>
              <SelectItem value="ocean">Ocean</SelectItem>
              <SelectItem value="emerald">Emerald</SelectItem>
              <SelectItem value="royal-blue">Royal Blue</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="vercel">Vercel</SelectItem>
              <SelectItem value="linear">Linear</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            One-click preset themes tailored for different industries
          </p>
        </CardContent>
      </Card>

      {/* Grid Layout for Advanced Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Glass Morphism */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Glass Effect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="glassEnabled"
                checked={props.glassEnabled}
                onCheckedChange={(checked) => props.setGlassEnabled(Boolean(checked))}
              />
              <Label htmlFor="glassEnabled" className="text-xs font-normal cursor-pointer">
                Enable
              </Label>
            </div>
            {props.glassEnabled && (
              <>
                <div>
                  <Label className="text-xs">Opacity: {props.glassOpacity}%</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={props.glassOpacity}
                    onChange={(e) => props.setGlassOpacity(Number(e.target.value))}
                    className="w-full h-2"
                  />
                </div>
                <div>
                  <Label className="text-xs">Blur: {props.glassBlur}px</Label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={props.glassBlur}
                    onChange={(e) => props.setGlassBlur(Number(e.target.value))}
                    className="w-full h-2"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Tint</Label>
                  <Select value={props.glassTint} onValueChange={props.setGlassTint}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Button Effects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Shadow</Label>
              <Select value={props.buttonShadow} onValueChange={props.setButtonShadow}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="floating">Floating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Hover</Label>
              <Select value={props.hoverAnimation} onValueChange={props.setHoverAnimation}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lift">Lift</SelectItem>
                  <SelectItem value="glow">Glow</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="pulse">Pulse</SelectItem>
                  <SelectItem value="rotate">Rotate</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="buttonGradient"
                checked={props.buttonGradient}
                onCheckedChange={(checked) => props.setButtonGradient(Boolean(checked))}
              />
              <Label htmlFor="buttonGradient" className="text-xs font-normal cursor-pointer">
                Gradient
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Glow & Light Effects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Effects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Glow</Label>
              <Select value={props.glowEffect} onValueChange={props.setGlowEffect}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                  <SelectItem value="neon">Neon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rippleEffect"
                checked={props.rippleEffect}
                onCheckedChange={(checked) => props.setRippleEffect(Boolean(checked))}
              />
              <Label htmlFor="rippleEffect" className="text-xs font-normal cursor-pointer">
                Ripple Effect
              </Label>
            </div>
            <div>
              <Label className="text-xs">Transparency: {props.transparency}%</Label>
              <input
                type="range"
                min="0"
                max="40"
                value={props.transparency}
                onChange={(e) => props.setTransparency(Number(e.target.value))}
                className="w-full h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Components Styling */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Cards</Label>
              <Select value={props.cardStyle} onValueChange={props.setCardStyle}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="glass">Glass</SelectItem>
                  <SelectItem value="floating">Floating</SelectItem>
                  <SelectItem value="outlined">Outlined</SelectItem>
                  <SelectItem value="shadow">Shadow</SelectItem>
                  <SelectItem value="elevated">Elevated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Sidebar</Label>
              <Select value={props.sidebarStyle} onValueChange={props.setSidebarStyle}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="glass">Glass</SelectItem>
                  <SelectItem value="floating">Floating</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sizes & Spacing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sizing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Button Size</Label>
              <Select value={props.buttonSize} onValueChange={props.setButtonSize}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">XS</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xl">XL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Padding</Label>
              <Select value={props.buttonPadding} onValueChange={props.setButtonPadding}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Animations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Animations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Speed</Label>
              <Select value={props.animationSpeed} onValueChange={props.setAnimationSpeed}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Navigation</Label>
              <Select value={props.navigationAnimation} onValueChange={props.setNavigationAnimation}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Other Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Other</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Corners</Label>
              <Select value={props.cornerStyle} onValueChange={props.setCornerStyle}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sharp">Sharp</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                  <SelectItem value="squircle">Squircle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Page BG</Label>
              <Select value={props.pageBackground} onValueChange={props.setPageBackground}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="mesh">Mesh</SelectItem>
                  <SelectItem value="animated">Animated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
