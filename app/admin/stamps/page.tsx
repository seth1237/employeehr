"use client";

import React, { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";
import api from "@/lib/api";
import { finishDataLoad, startDataLoad } from "@/lib/silent-load";
import { TableSkeleton } from "@/components/admin/ui/page-states";
import StampBuilder, { StampConfig } from "@/components/admin/stamps/stamp-builder";
import { IStamp } from "@/server/src/models/Stamp";

export default function StampsPage() {
  const [stamps, setStamps] = useState<IStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingStamp, setEditingStamp] = useState<IStamp | null>(null);
  const [stampConfig, setStampConfig] = useState<StampConfig>({
    template: "standard",
    svgTemplate: "",
    shape: "circle",
    text: "APPROVED",
    fields: { date: true, user: true, stampId: false, poBox: false, email: false },
    style: { color: "#8B0000", opacity: 0.2, rotation: 12, fontSize: 18, wordPadding: 0 },
  });
  const [stampName, setStampName] = useState("");
  const [stampDescription, setStampDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await getUser();
        setCurrentUser(user);
        await loadStamps(true);
      } catch (error) {
        console.error("Failed to initialize:", error);
      }
    };
    init();
  }, []);

  const loadStamps = async (opts?: { silent?: boolean } | boolean) => {
    const silent = startDataLoad(opts, setLoading);
    try {
      const response = await api.stamps.getAll();
      setStamps((response?.data || response) as any[] || []);
    } catch (error) {
      console.error("Failed to load stamps:", error);
      setErrorMessage("Failed to load stamps");
    } finally {
      finishDataLoad(silent, setLoading);
    }
  };

  const handleSaveStamp = async () => {
    try {
      setErrorMessage("");

      if (!stampName.trim()) {
        setErrorMessage("Stamp name is required");
        return;
      }

      if (stampConfig.template === "uploaded-svg" && !stampConfig.svgTemplate?.trim()) {
        setErrorMessage("Please upload or paste an SVG template before saving.");
        return;
      }

      if (stampConfig.template === "uploaded-svg" && !stampConfig.svgTemplate?.toLowerCase().includes("<svg")) {
        setErrorMessage("The uploaded template must contain valid SVG content.");
        return;
      }

      const payload = {
        name: stampName.trim(),
        description: stampDescription.trim(),
        template: stampConfig.template || "standard",
        svgTemplate: stampConfig.svgTemplate || "",
        shape: stampConfig.shape,
        text: stampConfig.text,
        fields: stampConfig.fields,
        style: stampConfig.style,
        isDefault: isDefault,
        createdBy: currentUser?.id || currentUser?._id || "system",
      };

      if (editingStamp) {
        // Update existing stamp
        await api.stamps.update(String(editingStamp._id), payload);
      } else {
        // Create new stamp
        await api.stamps.create(payload);
      }

      // Reset form
      setStampName("");
      setStampDescription("");
      setStampConfig({
        template: "standard",
        svgTemplate: "",
        shape: "circle",
        text: "APPROVED",
        fields: { date: true, user: true, stampId: false, poBox: false, email: false },
        style: { color: "#8B0000", opacity: 0.2, rotation: 12, fontSize: 18, wordPadding: 0 },
      });
      setIsDefault(false);
      setIsCreating(false);
      setEditingStamp(null);

      // Reload stamps
      await loadStamps(true);
    } catch (error) {
      console.error("Failed to save stamp:", error);
      setErrorMessage("Failed to save stamp. Please try again.");
    }
  };

  const handleEditStamp = (stamp: IStamp) => {
    setEditingStamp(stamp);
    setStampName(stamp.name);
    setStampDescription(stamp.description || "");
    setStampConfig({
      template: (stamp as any).template || "standard",
      svgTemplate: (stamp as any).svgTemplate || "",
      shape: stamp.shape,
      text: stamp.text,
      fields: stamp.fields,
      style: stamp.style,
    });
    setIsDefault(stamp.isDefault || false);
    setIsCreating(true);
  };

  const handleDeleteStamp = async (stampId: string) => {
    if (!confirm("Are you sure you want to delete this stamp?")) return;

    try {
      setErrorMessage("");
      await api.stamps.delete(stampId);
      await loadStamps(true);
    } catch (error) {
      console.error("Failed to delete stamp:", error);
      setErrorMessage("Failed to delete stamp. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingStamp(null);
    setStampName("");
    setStampDescription("");
    setStampConfig({
      template: "standard",
      svgTemplate: "",
      shape: "circle",
      text: "APPROVED",
      fields: { date: true, user: true, stampId: false, poBox: false, email: false },
      style: { color: "#8B0000", opacity: 0.2, rotation: 12, fontSize: 18, wordPadding: 0 },
    });
    setIsDefault(false);
    setErrorMessage("");
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full space-y-6 p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold">Stamps</h1>
            <p className="text-gray-600 mt-1">
              Design custom stamps for your documents
            </p>
          </div>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Stamp
            </button>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6 shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">
                {editingStamp ? "Edit Stamp" : "Create New Stamp"}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Stamp Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Stamp Name *
                </label>
                <input
                  type="text"
                  value={stampName}
                  onChange={(e) => setStampName(e.target.value)}
                  placeholder="e.g., Approved, Paid, Received"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={stampDescription}
                  onChange={(e) => setStampDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Default Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Set as default stamp</span>
            </label>

            {/* Stamp Builder */}
            <div className="border-t pt-8">
              <StampBuilder
                value={stampConfig}
                onChange={setStampConfig}
                showPreview={true}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end border-t pt-6">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStamp}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {editingStamp ? "Update Stamp" : "Create Stamp"}
              </button>
            </div>
          </div>
        )}

        {/* Stamps List */}
        {!isCreating && (
          <div className="space-y-4">
            {loading ? (
              <TableSkeleton rows={8} />
            ) : stamps.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-600 mb-4">No stamps yet</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first stamp
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stamps.map((stamp) => (
                  <div
                    key={String(stamp._id)}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{stamp.name}</h3>
                        {stamp.description && (
                          <p className="text-sm text-gray-600">
                            {stamp.description}
                          </p>
                        )}
                      </div>
                      {stamp.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Default
                        </span>
                      )}
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 flex items-center justify-center h-40">
                      <svg
                        viewBox="0 0 200 200"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full max-w-24 max-h-24"
                        style={{ opacity: stamp.style.opacity }}
                      >
                        <g
                          transform={`rotate(${stamp.style.rotation} 100 100)`}
                        >
                          {stamp.shape === "circle" && (
                            <>
                              <circle
                                cx="100"
                                cy="100"
                                r="90"
                                stroke={stamp.style.color}
                                fill="none"
                                strokeWidth="4"
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="88"
                                stroke={stamp.style.color}
                                fill="none"
                                strokeWidth="1"
                              />
                            </>
                          )}
                          {stamp.shape === "rectangle" && (
                            <rect
                              x="15"
                              y="50"
                              width="170"
                              height="100"
                              stroke={stamp.style.color}
                              fill="none"
                              strokeWidth="3"
                              rx="8"
                            />
                          )}
                          {stamp.shape === "badge" && (
                            <ellipse
                              cx="100"
                              cy="100"
                              rx="95"
                              ry="80"
                              stroke={stamp.style.color}
                              fill="none"
                              strokeWidth="3"
                            />
                          )}
                          <text
                            x="100"
                            y="90"
                            textAnchor="middle"
                            fill={stamp.style.color}
                            fontSize={stamp.style.fontSize || 18}
                            fontWeight="bold"
                            fontFamily="Arial, sans-serif"
                          >
                            {stamp.text}
                          </text>
                        </g>
                      </svg>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Shape:</span>{" "}
                        <span className="capitalize">{stamp.shape}</span>
                      </p>
                      <p>
                        <span className="font-medium">Color:</span>{" "}
                        <span className="font-mono">{stamp.style.color}</span>
                      </p>
                      <p>
                        <span className="font-medium">Opacity:</span>{" "}
                        <span>{Math.round(stamp.style.opacity * 100)}%</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditStamp(stamp)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStamp(String(stamp._id))}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
