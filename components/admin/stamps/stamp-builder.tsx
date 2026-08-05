"use client";

import React, { useState, useEffect } from "react";
import { generateClientStampSVG } from "@/lib/stampSvgGenerator";

export interface StampConfig {
  template?: "standard" | "sample-classic" | "uploaded-svg";
  svgTemplate?: string;
  shape: "circle" | "rectangle" | "badge";
  text: string;
  fields: {
    date: boolean;
    user: boolean;
    stampId: boolean;
    poBox: boolean;
    email: boolean;
  };
  style: {
    color: string;
    opacity: number;
    rotation: number;
    fontSize?: number;
    wordPadding?: number;
  };
}

interface StampBuilderProps {
  value?: StampConfig;
  onChange?: (config: StampConfig) => void;
  showPreview?: boolean;
}

const DEFAULT_CONFIG: StampConfig = {
  template: "standard",
  svgTemplate: "",
  shape: "circle",
  text: "APPROVED",
  fields: {
    date: true,
    user: true,
    stampId: false,
    poBox: false,
    email: false,
  },
  style: {
    color: "#8B0000",
    opacity: 0.2,
    rotation: 12,
    fontSize: 18,
    wordPadding: 0,
  },
};

export const StampBuilder: React.FC<StampBuilderProps> = ({
  value = DEFAULT_CONFIG,
  onChange,
  showPreview = true,
}) => {
  const [config, setConfig] = useState<StampConfig>(value);
  const [previewSvg, setPreviewSvg] = useState<string>("");

  useEffect(() => {
    setConfig(value);
  }, [value]);

  // Update preview
  useEffect(() => {
    generatePreview();
  }, [config]);

  const generatePreview = async () => {
    try {
      // Generate SVG on client-side (no API call needed)
      const svg = generateClientStampSVG(config);
      setPreviewSvg(svg);
    } catch (error) {
      console.error("Failed to generate preview:", error);
    }
  };

  const handleChange = (updates: Partial<StampConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleStyleChange = (key: keyof StampConfig["style"], value: any) => {
    const newConfig = {
      ...config,
      style: { ...config.style, [key]: value },
    };
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleFieldChange = (field: keyof StampConfig["fields"]) => {
    const newConfig = {
      ...config,
      fields: { ...config.fields, [field]: !config.fields[field] },
    };
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleSvgUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg")) {
      return;
    }

    const content = await file.text();
    if (!content.trim().startsWith("<svg")) {
      return;
    }

    const newConfig = {
      ...config,
      svgTemplate: content,
      template: "uploaded-svg" as const,
    };
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Controls - 2 columns */}
        <div className="lg:col-span-3 space-y-6">
          <h3 className="text-lg font-semibold">Stamp Configuration</h3>

          {/* Stamp Text */}
          <div>
            <label className="block text-sm font-medium mb-2">Design Template</label>
            <select
              value={config.template || "standard"}
              onChange={(e) => {
                const template = e.target.value as "standard" | "sample-classic" | "uploaded-svg";
                if (template === "sample-classic") {
                  handleChange({
                    template,
                    text: config.text === "APPROVED" ? "COMPANY STAMP" : config.text,
                    fields: {
                      ...config.fields,
                      date: true,
                      poBox: true,
                      email: true,
                      stampId: false,
                      user: false,
                    },
                  });
                  return;
                }
                if (template === "uploaded-svg") {
                  handleChange({
                    template,
                    text: config.text || "COMPANY STAMP",
                    fields: {
                      ...config.fields,
                      date: true,
                    },
                  });
                  return;
                }
                handleChange({ template });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="sample-classic">Sample Classic (like uploaded SVG)</option>
              <option value="uploaded-svg">Uploaded SVG (direct use)</option>
            </select>
          </div>

          {config.template === "uploaded-svg" && (
            <div className="rounded-lg border border-gray-300 p-4 space-y-3 bg-gray-50">
              <label className="block text-sm font-medium">Upload SVG Template</label>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={(e) => handleSvgUpload(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
              <p className="text-xs text-gray-600">
                Use placeholders in your SVG: {"{{date}}"}, {"{{email}}"}, {"{{poBox}}"}, {"{{user}}"}
              </p>
              <p className="text-xs text-gray-600">
                In uploaded mode, shape/style/text controls are hidden and the SVG is used directly.
              </p>
              <textarea
                value={config.svgTemplate || ""}
                onChange={(e) => handleChange({ svgTemplate: e.target.value })}
                placeholder="Paste SVG content here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
              />
            </div>
          )}

          {config.template !== "uploaded-svg" && (
            <>
              {/* Stamp Text */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {config.template === "sample-classic" ? "Header Text (e.g. COMPANY STAMP)" : "Stamp Text"}
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={config.text}
                  onChange={(e) => handleChange({ text: e.target.value })}
                  placeholder={config.template === "sample-classic" ? "COMPANY STAMP" : "APPROVED"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {config.text.length}/50 characters
                </p>
              </div>

              {/* Shape Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Shape</label>
                <div className="space-y-2">
                  {["circle", "rectangle", "badge"].map((shape) => (
                    <label key={shape} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shape"
                        value={shape}
                        checked={config.shape === shape}
                        onChange={() =>
                          handleChange({ shape: shape as StampConfig["shape"] })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm capitalize">{shape}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Fields */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Include Dynamic Fields
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fields.date}
                      onChange={() => handleFieldChange("date")}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Date</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fields.user}
                      onChange={() => handleFieldChange("user")}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">User</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fields.stampId}
                      onChange={() => handleFieldChange("stampId")}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Stamp ID</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fields.poBox}
                      onChange={() => handleFieldChange("poBox")}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">PO Box</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fields.email}
                      onChange={() => handleFieldChange("email")}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Email</span>
                  </label>
                </div>
              </div>

              {/* Style Controls */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium mb-4">Style</h4>

            {/* Color */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.style.color}
                  onChange={(e) => handleStyleChange("color", e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.style.color}
                  onChange={(e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                      handleStyleChange("color", e.target.value);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Opacity: {Math.round(config.style.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.style.opacity}
                onChange={(e) =>
                  handleStyleChange("opacity", parseFloat(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* Rotation */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Rotation: {config.style.rotation}°
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={config.style.rotation}
                onChange={(e) =>
                  handleStyleChange("rotation", parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Font Size: {config.style.fontSize || 18}px
              </label>
              <input
                type="range"
                min="8"
                max="48"
                step="1"
                value={config.style.fontSize || 18}
                onChange={(e) =>
                  handleStyleChange("fontSize", parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* Word Padding */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Word Padding: {config.style.wordPadding || 0}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={config.style.wordPadding || 0}
                onChange={(e) =>
                  handleStyleChange("wordPadding", parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>
              </div>
            </>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="lg:col-span-2 flex flex-col sticky top-24">
            <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 flex items-center justify-center min-h-[400px] shadow-inner">
              {previewSvg ? (
                <div
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                  className="w-56 h-56"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <p className="text-sm">Generating preview...</p>
                </div>
              )}
            </div>

            {/* Reset to Default */}
            <button
              onClick={() => {
                setConfig(DEFAULT_CONFIG);
                onChange?.(DEFAULT_CONFIG);
              }}
              className="mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium w-full"
            >
              Reset to Default
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StampBuilder;
