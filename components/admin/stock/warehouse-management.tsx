"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  MouseEvent as RMouseEvent,
} from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { API_URL } from "@/lib/apiBase";
import { fetchJson } from "@/lib/fetchUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolId =
  | "pointer"
  | "hand"
  | "select"
  | "wall"
  | "door"
  | "zone"
  | "rack"
  | "shelf"
  | "bin"
  | "aisle"
  | "walkway"
  | "loading-dock"
  | "office"
  | "cold-room"
  | "charging"
  | "measure"
  | "delete";

type PlaceableTool = Exclude<
  ToolId,
  "pointer" | "hand" | "select" | "measure" | "delete"
>;

type ObjectType =
  | "wall"
  | "door"
  | "zone"
  | "rack"
  | "shelf"
  | "bin"
  | "aisle"
  | "walkway"
  | "loading-dock"
  | "office"
  | "cold-room"
  | "charging"
  | "label";

type AppMode = "design" | "operations";

interface CanvasObject {
  id: string;
  type: ObjectType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage
  height: number; // percentage
  label: string;
  color: string;
  locked?: boolean;
  hidden?: boolean;
  rotation?: number;
  meta?: Record<string, string | number>;
}

interface Warehouse {
  _id: string;
  name: string;
  rows: number;
  cols: number;
  cellPrefix?: string;
  description?: string;
  layoutObjects?: CanvasObject[];
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  category?: string;
}

interface Viewport {
  x: number; // pan offset px
  y: number; // pan offset px
  zoom: number; // scale factor
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const OBJECT_COLORS: Record<ObjectType, string> = {
  wall: "#64748b",
  door: "#3b82f6",
  zone: "#22c55e",
  rack: "#f59e0b",
  shelf: "#8b5cf6",
  bin: "#38bdf8",
  aisle: "#e2e8f0",
  walkway: "#cbd5e1",
  "loading-dock": "#f97316",
  office: "#a78bfa",
  "cold-room": "#67e8f9",
  charging: "#facc15",
  label: "#94a3b8",
};

const OBJECT_ICONS: Record<ObjectType, string> = {
  wall: "▬",
  door: "🚪",
  zone: "⬡",
  rack: "⊞",
  shelf: "≡",
  bin: "□",
  aisle: "⟵",
  walkway: "─",
  "loading-dock": "⬛",
  office: "⌂",
  "cold-room": "❄",
  charging: "⚡",
  label: "𝐓",
};

const TOOL_SECTIONS = [
  {
    label: "Tools",
    items: [
      { id: "pointer" as ToolId, icon: "↖", label: "Select" },
      { id: "hand" as ToolId, icon: "✋", label: "Pan" },
      { id: "delete" as ToolId, icon: "✕", label: "Delete" },
      { id: "measure" as ToolId, icon: "📐", label: "Measure" },
    ],
  },
  {
    label: "Areas",
    items: [
      { id: "zone" as ToolId, icon: "⬡", label: "Zone" },
      { id: "wall" as ToolId, icon: "▬", label: "Wall" },
      { id: "door" as ToolId, icon: "🚪", label: "Door" },
      { id: "aisle" as ToolId, icon: "⟵", label: "Aisle" },
      { id: "walkway" as ToolId, icon: "─", label: "Walkway" },
      { id: "loading-dock" as ToolId, icon: "⬛", label: "Loading Dock" },
      { id: "office" as ToolId, icon: "⌂", label: "Office" },
      { id: "cold-room" as ToolId, icon: "❄", label: "Cold Room" },
      { id: "charging" as ToolId, icon: "⚡", label: "Charging" },
    ],
  },
  {
    label: "Storage",
    items: [
      { id: "rack" as ToolId, icon: "⊞", label: "Rack" },
      { id: "shelf" as ToolId, icon: "≡", label: "Shelf" },
      { id: "bin" as ToolId, icon: "□", label: "Bin" },
    ],
  },
];

const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  occupied: "#f59e0b",
  reserved: "#3b82f6",
  maintenance: "#ef4444",
  inactive: "#94a3b8",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_DIMS: Record<ObjectType, { w: number; h: number }> = {
  zone: { w: 20, h: 15 },
  wall: { w: 20, h: 2 },
  door: { w: 5, h: 2 },
  aisle: { w: 20, h: 5 },
  walkway: { w: 15, h: 3 },
  "loading-dock": { w: 10, h: 8 },
  office: { w: 12, h: 10 },
  "cold-room": { w: 14, h: 12 },
  charging: { w: 8, h: 6 },
  rack: { w: 4, h: 10 },
  shelf: { w: 6, h: 4 },
  bin: { w: 3, h: 3 },
  label: { w: 8, h: 3 },
};

const buildDefaultObjects = (_wh: Warehouse): CanvasObject[] => [
  {
    id: uid(),
    type: "wall",
    x: 0,
    y: 0,
    width: 100,
    height: 2,
    label: "Back Wall",
    color: "#64748b",
    locked: true,
  },
  {
    id: uid(),
    type: "wall",
    x: 0,
    y: 98,
    width: 100,
    height: 2,
    label: "Front Wall",
    color: "#64748b",
    locked: true,
  },
  {
    id: uid(),
    type: "wall",
    x: 0,
    y: 0,
    width: 2,
    height: 100,
    label: "Left Wall",
    color: "#64748b",
    locked: true,
  },
  {
    id: uid(),
    type: "wall",
    x: 98,
    y: 0,
    width: 2,
    height: 100,
    label: "Right Wall",
    color: "#64748b",
    locked: true,
  },
  {
    id: uid(),
    type: "door",
    x: 46,
    y: 96,
    width: 8,
    height: 4,
    label: "Entrance / Exit",
    color: "#3b82f6",
  },
  {
    id: uid(),
    type: "zone",
    x: 6,
    y: 10,
    width: 24,
    height: 16,
    label: "Receiving",
    color: "#22c55e",
  },
  {
    id: uid(),
    type: "aisle",
    x: 32,
    y: 10,
    width: 36,
    height: 14,
    label: "Aisle",
    color: "#cbd5e1",
  },
  {
    id: uid(),
    type: "zone",
    x: 70,
    y: 10,
    width: 24,
    height: 16,
    label: "Quarantine",
    color: "#f59e0b",
  },
  {
    id: uid(),
    type: "walkway",
    x: 18,
    y: 38,
    width: 64,
    height: 6,
    label: "Path-ready block",
    color: "#e2e8f0",
  },
  {
    id: uid(),
    type: "zone",
    x: 6,
    y: 58,
    width: 24,
    height: 16,
    label: "Packing",
    color: "#a855f7",
  },
  {
    id: uid(),
    type: "walkway",
    x: 32,
    y: 58,
    width: 36,
    height: 6,
    label: "Path-ready block",
    color: "#e2e8f0",
  },
  {
    id: uid(),
    type: "zone",
    x: 70,
    y: 58,
    width: 24,
    height: 16,
    label: "Storage",
    color: "#06b6d4",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          w-9 h-9 rounded-lg flex items-center justify-center text-sm
          transition-all duration-150
          ${
            active
              ? "bg-blue-500 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }
        `}
      >
        {icon}
      </button>
      <div
        className="
        absolute left-12 top-1/2 -translate-y-1/2 z-50
        bg-slate-800 text-white text-xs px-2 py-1 rounded-md
        whitespace-nowrap pointer-events-none
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
      "
      >
        {label}
      </div>
    </div>
  );
}

function PropertyPanel({
  selected,
  objects,
  products,
  onUpdate,
  onDelete,
  onDuplicate,
  mode,
}: {
  selected: string | null;
  objects: CanvasObject[];
  products: Product[];
  onUpdate: (id: string, patch: Partial<CanvasObject>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  mode: AppMode;
}) {
  const obj = objects.find((o) => o.id === selected);
  const attachedProduct = obj?.meta?.productId
    ? products.find((item) => item._id === String(obj.meta?.productId))
    : null;

  if (!obj) {
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Warehouse overview
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total objects", value: objects.length },
            {
              label: "Zones",
              value: objects.filter((o) => o.type === "zone").length,
            },
            {
              label: "Racks",
              value: objects.filter((o) => o.type === "rack").length,
            },
            {
              label: "Bins",
              value: objects.filter((o) => o.type === "bin").length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-50 rounded-xl p-3 border border-slate-100"
            >
              <p className="text-[11px] text-slate-400 mb-1">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-700">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Color guide
          </p>
          {Object.entries(STATUS_COLORS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: v }} />
              <span className="text-xs text-slate-500 capitalize">{k}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto text-xs text-slate-300 text-center">
          Select an object to edit its properties
        </div>
      </div>
    );
  }

  const Field = ({
    label,
    value,
    onChange,
    type = "text",
  }: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    type?: string;
  }) => (
    <div className="mb-3">
      <label className="block text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={mode === "operations"}
        className="
          w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200
          bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
        "
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header with icon and actions */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{OBJECT_ICONS[obj.type]}</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {obj.type.replace(/-/g, " ")}
            </span>
          </div>
          {mode === "design" && (
            <div className="flex gap-1">
              <button
                onClick={() => onDuplicate(obj.id)}
                className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                Copy
              </button>
              <button
                onClick={() => onDelete(obj.id)}
                className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-400 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible sections */}
      <Accordion
        type="single"
        collapsible
        defaultValue="basic"
        className="flex-1"
      >
        {/* Basic Properties */}
        <AccordionItem value="basic" className="border-b border-slate-100 px-3">
          <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900">
            Properties
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0">
            <div className="space-y-3">
              <Field
                label="Label"
                value={obj.label}
                onChange={(v) => onUpdate(obj.id, { label: v })}
              />
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">
                  Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={obj.color}
                    onChange={(e) =>
                      onUpdate(obj.id, { color: e.target.value })
                    }
                    disabled={mode === "operations"}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-mono">
                    {obj.color}
                  </span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Position & Size */}
        <AccordionItem
          value="position"
          className="border-b border-slate-100 px-3"
        >
          <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900">
            Position & Size
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="X (%)"
                value={Math.round(obj.x)}
                type="number"
                onChange={(v) => onUpdate(obj.id, { x: Number(v) })}
              />
              <Field
                label="Y (%)"
                value={Math.round(obj.y)}
                type="number"
                onChange={(v) => onUpdate(obj.id, { y: Number(v) })}
              />
              <Field
                label="Width (%)"
                value={Math.round(obj.width)}
                type="number"
                onChange={(v) => onUpdate(obj.id, { width: Number(v) })}
              />
              <Field
                label="Height (%)"
                value={Math.round(obj.height)}
                type="number"
                onChange={(v) => onUpdate(obj.id, { height: Number(v) })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Zone Details */}
        {obj.type === "zone" && (
          <AccordionItem
            value="zone-details"
            className="border-b border-slate-100 px-3"
          >
            <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900">
              Zone Details
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Capacity</span>
                  <span className="font-medium text-slate-600">
                    {obj.meta?.capacity ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Occupancy</span>
                  <span className="font-medium text-slate-600">
                    {obj.meta?.occupancy ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Temperature</span>
                  <span className="font-medium text-slate-600">
                    {obj.meta?.temperature ?? "Ambient"}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Rack Details */}
        {obj.type === "rack" && (
          <AccordionItem
            value="rack-details"
            className="border-b border-slate-100 px-3"
          >
            <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900">
              Rack Details
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Shelves</span>
                  <span className="font-medium text-slate-600">
                    {obj.meta?.shelves ?? 4}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Weight limit</span>
                  <span className="font-medium text-slate-600">
                    {obj.meta?.weightLimit ?? "500 kg"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Utilization</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${obj.meta?.utilization ?? 65}%`,
                          background:
                            Number(obj.meta?.utilization ?? 65) > 85
                              ? "#ef4444"
                              : "#22c55e",
                        }}
                      />
                    </div>
                    <span className="font-medium text-slate-600 text-[11px]">
                      {obj.meta?.utilization ?? 65}%
                    </span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Storage Allocation */}
        {(obj.type === "rack" ||
          obj.type === "shelf" ||
          obj.type === "bin") && (
          <AccordionItem
            value="storage"
            className="border-b border-slate-100 px-3"
          >
            <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900">
              Storage Allocation
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">
                    Product
                  </label>
                  <select
                    value={String(obj.meta?.productId ?? "")}
                    onChange={(e) => {
                      const productId = e.target.value;
                      const product = products.find(
                        (item) => item._id === productId,
                      );
                      onUpdate(obj.id, {
                        meta: {
                          ...obj.meta,
                          productId,
                          product: product?.name || "",
                          productSku: product?.sku || "",
                        },
                      });
                    }}
                    disabled={mode === "design"}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Unassigned</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                        {product.sku ? ` (${product.sku})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Quantity</span>
                  <input
                    type="number"
                    value={Number(obj.meta?.quantity ?? 0)}
                    onChange={(e) =>
                      onUpdate(obj.id, {
                        meta: { ...obj.meta, quantity: Number(e.target.value) },
                      })
                    }
                    disabled={mode === "design"}
                    className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Bin Details */}
        {obj.type === "bin" && (
          <AccordionItem
            value="bin-details"
            className="border-b border-slate-100 px-3"
          >
            <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900">
              Bin Details
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Bin code</span>
                  <span className="font-mono font-medium text-slate-600">
                    {obj.label}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Available</span>
                  <span className="font-medium text-slate-600">
                    {obj.meta?.available ?? "100%"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Product</span>
                  <span className="font-medium text-slate-600">
                    {attachedProduct?.name || obj.meta?.product || "Empty"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">SKU</span>
                  <span className="font-medium text-slate-600">
                    {attachedProduct?.sku || obj.meta?.productSku || "—"}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Footer - Lock Status */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 mt-auto">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: obj.locked ? "#ef4444" : "#22c55e" }}
          />
          <span className="text-[11px] text-slate-400">
            {obj.locked ? "Locked" : "Unlocked"}
          </span>
          {mode === "design" && (
            <button
              onClick={() => onUpdate(obj.id, { locked: !obj.locked })}
              className="ml-auto text-[11px] px-2 py-0.5 rounded-md border border-slate-200 text-slate-400 hover:bg-white"
            >
              {obj.locked ? "Unlock" : "Lock"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function MiniMap({
  objects,
  viewport,
  canvasSize,
  onNavigate,
}: {
  objects: CanvasObject[];
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  onNavigate: (vp: Partial<Viewport>) => void;
}) {
  const scale = 0.12;

  return (
    <div
      className="
        absolute bottom-4 right-4 w-36 h-24 rounded-xl
        bg-white/90 backdrop-blur border border-slate-200 shadow-lg
        overflow-hidden cursor-pointer
      "
      onClick={(e) => {
        const rect = (
          e.currentTarget as HTMLDivElement
        ).getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width;
        const ry = (e.clientY - rect.top) / rect.height;
        onNavigate({
          x: -(rx * canvasSize.w - canvasSize.w / 2) * viewport.zoom,
          y: -(ry * canvasSize.h - canvasSize.h / 2) * viewport.zoom,
        });
      }}
    >
      <div className="relative w-full h-full">
        {objects
          .filter((o) => !o.hidden)
          .map((o) => (
            <div
              key={o.id}
              className="absolute rounded-sm opacity-80"
              style={{
                left: `${o.x * scale}%`,
                top: `${o.y * scale}%`,
                width: `${o.width * scale}%`,
                height: `${o.height * scale}%`,
                background: o.color,
              }}
            />
          ))}
        {/* viewport indicator */}
        <div
          className="absolute border border-blue-400 rounded bg-blue-400/10"
          style={{
            left: `${Math.max(0, (-viewport.x / (canvasSize.w * viewport.zoom)) * 100)}%`,
            top: `${Math.max(0, (-viewport.y / (canvasSize.h * viewport.zoom)) * 100)}%`,
            width: `${Math.min(100, 100 / viewport.zoom)}%`,
            height: `${Math.min(100, 100 / viewport.zoom)}%`,
          }}
        />
      </div>
    </div>
  );
}

function FloatingToolbar({
  obj,
  onEdit,
  onDuplicate,
  onDelete,
  onLock,
}: {
  obj: CanvasObject;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLock: () => void;
}) {
  return (
    <div
      className="
        absolute -top-10 left-1/2 -translate-x-1/2
        flex items-center gap-0.5
        bg-white rounded-xl shadow-lg border border-slate-200
        px-1.5 py-1 z-50
      "
    >
      {[
        { icon: "✎", label: "Edit", action: onEdit },
        { icon: "⧉", label: "Duplicate", action: onDuplicate },
        {
          icon: obj.locked ? "🔓" : "🔒",
          label: obj.locked ? "Unlock" : "Lock",
          action: onLock,
        },
        { icon: "✕", label: "Delete", action: onDelete },
      ].map(({ icon, label, action }) => (
        <button
          key={label}
          onClick={(e) => {
            e.stopPropagation();
            action();
          }}
          title={label}
          className="
            w-7 h-7 rounded-lg flex items-center justify-center text-xs
            text-slate-500 hover:text-slate-700 hover:bg-slate-100
            transition-colors
          "
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function WarehouseCanvas({
  warehouse,
  initialObjects,
  products = [],
  onSave,
}: {
  warehouse?: Warehouse;
  initialObjects?: CanvasObject[];
  products?: Product[];
  onSave?: (objects: CanvasObject[]) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [objects, setObjects] = useState<CanvasObject[]>(
    initialObjects ?? (warehouse ? buildDefaultObjects(warehouse) : []),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId>("pointer");
  const [mode, setMode] = useState<AppMode>("operations");
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [is3D, setIs3D] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // drag state
  const drag = useRef<{
    active: boolean;
    objId: string | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, objId: null, startX: 0, startY: 0, origX: 0, origY: 0 });

  // pan state (hand tool)
  const pan = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origVX: number;
    origVY: number;
  }>({ active: false, startX: 0, startY: 0, origVX: 0, origVY: 0 });

  // draw state (place new objects)
  const draw = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    previewId: string | null;
  }>({ active: false, startX: 0, startY: 0, previewId: null });

  const isDrawTool = (t: ToolId): t is PlaceableTool =>
    !["pointer", "hand", "delete", "measure", "select"].includes(t);

  const canvasSize = { w: 1200, h: 900 };

  // ── zoom wheel ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setViewport((vp) => {
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        const newZoom = Math.min(4, Math.max(0.2, vp.zoom + delta));
        setZoom(Math.round(newZoom * 100));
        return { ...vp, zoom: newZoom };
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ── keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "Escape") {
        setSelected(null);
        setActiveTool("pointer");
      }
      if (e.key === "Delete" && selected) deleteObj(selected);
      if (e.key === "v") setActiveTool("pointer");
      if (e.key === "h") setActiveTool("hand");
      if (e.key === "g") setShowGrid((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected]);

  // ── canvas mouse events ──────────────────────────────────────────────────────
  const pxToPercent = (px: number, axis: "x" | "y") => {
    const total = axis === "x" ? canvasSize.w : canvasSize.h;
    return (px / total) * 100;
  };

  const canvasMouseDown = (e: RMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const cy = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    if (activeTool === "hand") {
      pan.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origVX: viewport.x,
        origVY: viewport.y,
      };
      return;
    }

    if (isDrawTool(activeTool) && mode === "design") {
      draw.current = { active: true, startX: cx, startY: cy, previewId: uid() };
      return;
    }

    // clicking empty canvas deselects
    setSelected(null);
  };

  const canvasMouseMove = (e: RMouseEvent<HTMLDivElement>) => {
    if (pan.current.active) {
      const dx = e.clientX - pan.current.startX;
      const dy = e.clientY - pan.current.startY;
      setViewport((vp) => ({
        ...vp,
        x: pan.current.origVX + dx,
        y: pan.current.origVY + dy,
      }));
      return;
    }

    if (drag.current.active && drag.current.objId) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const cy = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      const dx = pxToPercent(cx - drag.current.startX, "x");
      const dy = pxToPercent(cy - drag.current.startY, "y");
      setObjects((objs) =>
        objs.map((o) =>
          o.id === drag.current.objId
            ? {
                ...o,
                x: Math.min(95, Math.max(0, drag.current.origX + dx)),
                y: Math.min(95, Math.max(0, drag.current.origY + dy)),
              }
            : o,
        ),
      );
    }

    if (draw.current.active && draw.current.previewId) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const cy = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      const sx = Math.min(draw.current.startX, cx);
      const sy = Math.min(draw.current.startY, cy);
      const ew = Math.abs(cx - draw.current.startX);
      const eh = Math.abs(cy - draw.current.startY);
      setObjects((objs) => {
        const filtered = objs.filter((o) => o.id !== draw.current.previewId);
        return [
          ...filtered,
          {
            id: draw.current.previewId!,
            type: activeTool as ObjectType,
            x: pxToPercent(sx, "x"),
            y: pxToPercent(sy, "y"),
            width: pxToPercent(ew, "x"),
            height: pxToPercent(eh, "y"),
            label: `New ${activeTool}`,
            color: OBJECT_COLORS[activeTool as ObjectType] ?? "#94a3b8",
          },
        ];
      });
    }
  };

  const canvasMouseUp = () => {
    pan.current.active = false;
    drag.current.active = false;

    if (draw.current.active && draw.current.previewId) {
      const id = draw.current.previewId;
      draw.current = { active: false, startX: 0, startY: 0, previewId: null };
      setSelected(id);
      setActiveTool("pointer");
    } else {
      draw.current.active = false;
    }
  };

  // ── object actions ───────────────────────────────────────────────────────────
  const updateObj = useCallback((id: string, patch: Partial<CanvasObject>) => {
    setObjects((objs) =>
      objs.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  }, []);

  const deleteObj = useCallback((id: string) => {
    setObjects((objs) => objs.filter((o) => o.id !== id));
    setSelected(null);
  }, []);

  const duplicateObj = useCallback((id: string) => {
    setObjects((objs) => {
      const orig = objs.find((o) => o.id === id);
      if (!orig) return objs;
      return [...objs, { ...orig, id: uid(), x: orig.x + 3, y: orig.y + 3 }];
    });
  }, []);

  const handleObjMouseDown = (
    e: RMouseEvent<HTMLDivElement>,
    obj: CanvasObject,
  ) => {
    e.stopPropagation();
    if (activeTool === "delete") {
      deleteObj(obj.id);
      return;
    }
    if (obj.locked || mode === "operations") return;
    if (activeTool === "hand") return;
    setSelected(obj.id);
    drag.current = {
      active: true,
      objId: obj.id,
      startX:
        (e.clientX -
          canvasRef.current!.getBoundingClientRect().left -
          viewport.x) /
        viewport.zoom,
      startY:
        (e.clientY -
          canvasRef.current!.getBoundingClientRect().top -
          viewport.y) /
        viewport.zoom,
      origX: obj.x,
      origY: obj.y,
    };
  };

  const handleSave = async () => {
    if (!warehouse?._id) {
      alert("No warehouse selected");
      return;
    }

    setIsSaving(true);
    try {
      const result = await fetchJson(`/api/stock/warehouses/${warehouse._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutObjects: objects }),
      });

      if (!result.response.ok) {
        throw new Error(result.errorMessage || "Failed to save warehouse layout");
      }

      setSavedAt(new Date());
      onSave?.(objects);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save warehouse layout");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (initialObjects) {
      setObjects(initialObjects);
      return;
    }
    if (warehouse) {
      setObjects(
        warehouse.layoutObjects?.length
          ? warehouse.layoutObjects
          : buildDefaultObjects(warehouse),
      );
    }
  }, [initialObjects, warehouse]);

  // ── search results ───────────────────────────────────────────────────────────
  const searchResults =
    search.length > 1
      ? objects.filter(
          (o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            o.type.includes(search.toLowerCase()),
        )
      : [];

  const jumpTo = (obj: CanvasObject) => {
    setSelected(obj.id);
    setSearch("");
    // center viewport on obj
    const tx = -(obj.x / 100) * canvasSize.w * viewport.zoom + 400;
    const ty = -(obj.y / 100) * canvasSize.h * viewport.zoom + 300;
    setViewport((vp) => ({ ...vp, x: tx, y: ty }));
  };

  // ── stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total: objects.length,
    zones: objects.filter((o) => o.type === "zone").length,
    racks: objects.filter((o) => o.type === "rack").length,
    bins: objects.filter((o) => o.type === "bin").length,
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans select-none overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header
        className="
        flex items-center gap-4 h-12 px-4 shrink-0
        bg-white/90 backdrop-blur border-b border-slate-200 z-30
      "
      >
        {/* left */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white text-sm">⬡</span>
          </div>
          <span className="font-semibold text-slate-700 text-sm truncate max-w-28">
            {warehouse?.name || "Warehouse outline"}
          </span>
          <span className="text-slate-300 text-xs">›</span>
          <span className="text-xs text-slate-400">Layout</span>
          <span className="text-slate-300 text-xs">›</span>
          <span className="text-xs text-slate-400">Main floor</span>
        </div>

        {/* center – search */}
        <div className="flex-1 max-w-xs mx-auto relative">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              placeholder="Search objects…"
              className="
                w-full pl-8 pr-3 py-1.5 text-sm rounded-lg
                border border-slate-200 bg-slate-50
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white
                transition-all
              "
            />
          </div>
          {searchFocus && searchResults.length > 0 && (
            <div
              className="
              absolute top-full mt-1 left-0 right-0 z-50
              bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden
            "
            >
              {searchResults.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  onMouseDown={() => jumpTo(r)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: r.color }}
                  />
                  <span className="text-sm text-slate-700 truncate">
                    {r.label}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto shrink-0">
                    {r.type.replace(/-/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* right */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-2">
            {(["design", "operations"] as AppMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setSelected(null);
                }}
                className={`
                  px-3 py-1 text-xs font-medium rounded-md capitalize transition-all
                  ${
                    mode === m
                      ? "bg-white text-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }
                `}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowGrid((v) => !v)}
            className={`
              px-2.5 py-1.5 text-xs rounded-lg border transition-all
              ${
                showGrid
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }
            `}
          >
            Grid
          </button>
          
          <button
            onClick={() => setIs3D((v) => !v)}
            className={`
              px-2.5 py-1.5 text-xs rounded-lg border transition-all ml-1
              ${
                is3D
                  ? "bg-purple-50 border-purple-200 text-purple-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }
            `}
          >
            2.5D
          </button>

          <span className="text-xs text-slate-400 px-2 border-l border-slate-200 ml-1">
            {zoom}%
          </span>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-lg
              transition-colors shadow-sm
              ${isSaving ? "bg-slate-400 text-white cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}
            `}
          >
            {isSaving ? "Saving..." : savedAt ? "Saved ✓" : "Save"}
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left Toolbar ──────────────────────────────────────────────────── */}
        <aside
          className="
          w-12 shrink-0 bg-white border-r border-slate-200
          flex flex-col items-center py-3 gap-1 z-20 overflow-y-auto
        "
        >
          {TOOL_SECTIONS.map((section, si) => (
            <React.Fragment key={si}>
              {si > 0 && <div className="w-6 border-t border-slate-200 my-1" />}
              {section.items.map((item) => (
                <ToolButton
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTool === item.id}
                  onClick={() => {
                    if (mode === "operations" && isDrawTool(item.id as ToolId))
                      return;
                    setActiveTool(item.id);
                  }}
                />
              ))}
            </React.Fragment>
          ))}
        </aside>

        {/* ── Canvas ────────────────────────────────────────────────────────── */}
        <main
          ref={canvasRef}
          className={`
            flex-1 relative overflow-hidden
            ${activeTool === "hand" ? "cursor-grab active:cursor-grabbing" : ""}
            ${isDrawTool(activeTool) && mode === "design" ? "cursor-crosshair" : ""}
          `}
          style={{
            background: showGrid
              ? `
                radial-gradient(circle, #cbd5e1 1px, transparent 1px)
                0 0 / 24px 24px,
                #f8fafc
              `
              : "#f8fafc",
          }}
          onMouseDown={canvasMouseDown}
          onMouseMove={canvasMouseMove}
          onMouseUp={canvasMouseUp}
          onMouseLeave={canvasMouseUp}
        >
          {/* pan + zoom container */}
          <div
            className="absolute origin-top-left transition-transform duration-500"
            style={{
              width: canvasSize.w,
              height: canvasSize.h,
              transformStyle: "preserve-3d",
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom}) ${is3D ? "rotateX(60deg) rotateZ(-45deg)" : ""}`,
            }}
          >
            {/* objects */}
            {objects
              .filter((o) => !o.hidden)
              .map((o) => {
                const isSelected = selected === o.id;
                return (
                  <div
                    key={o.id}
                    className={`
                    absolute transition-shadow duration-100
                    ${isSelected ? "ring-2 ring-blue-400 ring-offset-1 z-20" : "z-10"}
                    ${!o.locked && mode === "design" ? "cursor-move" : "cursor-default"}
                  `}
                    style={{
                      left: `${o.x}%`,
                      top: `${o.y}%`,
                      width: `${o.width}%`,
                      height: `${o.height}%`,
                      background: is3D && (o.type === 'wall' || o.type === 'rack') ? 'transparent' : o.color + "33",
                      border: is3D && (o.type === 'wall' || o.type === 'rack') ? 'none' : `1.5px solid ${o.color}`,
                      borderRadius: o.type === "bin" ? 4 : 8,
                      opacity: o.locked ? 0.7 : 1,
                      transformStyle: "preserve-3d",
                    }}
                    onMouseDown={(e) => handleObjMouseDown(e, o)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTool === "delete") {
                        deleteObj(o.id);
                        return;
                      }
                      setSelected(o.id);
                    }}
                  >
                    {/* floating toolbar */}
                    {isSelected && mode === "design" && !is3D && (
                      <FloatingToolbar
                        obj={o}
                        onEdit={() => {}}
                        onDuplicate={() => duplicateObj(o.id)}
                        onDelete={() => deleteObj(o.id)}
                        onLock={() => updateObj(o.id, { locked: !o.locked })}
                      />
                    )}

                    {/* 3D Extrusions */}
                    {is3D && o.type === 'wall' && Array.from({ length: 4 }).map((_, i) => (
                      <div key={`wall-${i}`} className="absolute inset-0" style={{
                        background: o.color,
                        border: `1px solid rgba(0,0,0,0.1)`,
                        transform: `translateZ(${i * 10}px)`,
                        opacity: 0.9,
                      }} />
                    ))}

                    {is3D && o.type === 'rack' && Array.from({ length: Number(o.meta?.shelves ?? 4) }).map((_, i) => (
                      <div key={`rack-${i}`} className="absolute inset-0 flex items-center justify-center" style={{
                        background: o.color + "CC",
                        border: `1.5px solid ${o.color}`,
                        transform: `translateZ(${i * 25}px)`,
                        boxShadow: i === 0 ? "none" : "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }} />
                    ))}

                    {/* label - only show on hover/selected */}
                    {isSelected && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden px-1">
                        <span
                          className="text-center font-medium leading-tight"
                          style={{
                            fontSize:
                              Math.min(12, Math.max(7, o.width * 0.9)) + "px",
                            color: o.color,
                          }}
                        >
                          {o.label}
                        </span>
                      </div>
                    )}

                    {/* type badge - only show on selected */}
                    {isSelected && (
                      <div
                        className="absolute top-0.5 right-0.5 px-1 rounded text-white"
                        style={{
                          fontSize: 7,
                          background: o.color,
                          lineHeight: "14px",
                        }}
                      >
                        {o.type.replace(/-/g, " ")}
                      </div>
                    )}

                    {/* lock indicator */}
                    {o.locked && (
                      <div className="absolute top-0.5 left-0.5 text-[8px]">
                        🔒
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* mini map */}
          <MiniMap
            objects={objects}
            viewport={viewport}
            canvasSize={canvasSize}
            onNavigate={(vp) => setViewport((v) => ({ ...v, ...vp }))}
          />

          {/* zoom controls */}
          <div
            className="
            absolute bottom-4 left-1/2 -translate-x-1/2
            flex items-center gap-1 bg-white rounded-xl border border-slate-200
            shadow-md px-2 py-1
          "
          >
            <button
              onClick={() =>
                setViewport((vp) => {
                  const z = Math.max(0.2, vp.zoom - 0.1);
                  setZoom(Math.round(z * 100));
                  return { ...vp, zoom: z };
                })
              }
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-lg"
            >
              −
            </button>
            <span className="text-xs text-slate-500 w-10 text-center font-mono">
              {zoom}%
            </span>
            <button
              onClick={() =>
                setViewport((vp) => {
                  const z = Math.min(4, vp.zoom + 0.1);
                  setZoom(Math.round(z * 100));
                  return { ...vp, zoom: z };
                })
              }
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-lg"
            >
              +
            </button>
            <button
              onClick={() => {
                setViewport({ x: 0, y: 0, zoom: 1 });
                setZoom(100);
              }}
              className="w-7 h-7 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              ⊡
            </button>
          </div>

          {/* tool hint */}
          {isDrawTool(activeTool) && mode === "design" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-800/80 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
              Click and drag to place a <strong>{activeTool}</strong>. Press Esc
              to cancel.
            </div>
          )}
        </main>

        {/* ── Right Panel ───────────────────────────────────────────────────── */}
        <aside
          className="
          w-60 shrink-0 bg-white border-l border-slate-200 z-20 overflow-hidden
          flex flex-col
        "
        >
          <div className="px-4 py-2.5 border-b border-slate-100 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {selected ? "Properties" : "Overview"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PropertyPanel
              selected={selected}
              objects={objects}
              products={products}
              onUpdate={updateObj}
              onDelete={deleteObj}
              onDuplicate={duplicateObj}
              mode={mode}
            />
          </div>
        </aside>
      </div>

      {/* ── Status Bar ───────────────────────────────────────────────────────── */}
      <footer
        className="
        flex items-center gap-4 px-4 h-8 shrink-0
        bg-white border-t border-slate-200 z-30
      "
      >
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>
            <span className="text-slate-600 font-medium">{stats.total}</span>{" "}
            objects
          </span>
          <span className="text-slate-200">|</span>
          <span>
            <span className="text-slate-600 font-medium">{stats.zones}</span>{" "}
            zones
          </span>
          <span className="text-slate-200">|</span>
          <span>
            <span className="text-slate-600 font-medium">{stats.racks}</span>{" "}
            racks
          </span>
          <span className="text-slate-200">|</span>
          <span>
            <span className="text-slate-600 font-medium">{stats.bins}</span>{" "}
            bins
          </span>
          <span className="text-slate-200">|</span>
          <span>
            Mode:{" "}
            <span
              className={`font-medium ${mode === "design" ? "text-blue-500" : "text-green-500"}`}
            >
              {mode}
            </span>
          </span>
          {savedAt && (
            <>
              <span className="text-slate-200">|</span>
              <span>
                Saved{" "}
                <span className="text-green-500 font-medium">
                  {savedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
          <span>
            Press <kbd className="bg-slate-100 px-1 rounded text-[10px]">V</kbd>{" "}
            select
          </span>
          <span>·</span>
          <span>
            <kbd className="bg-slate-100 px-1 rounded text-[10px]">H</kbd> pan
          </span>
          <span>·</span>
          <span>
            <kbd className="bg-slate-100 px-1 rounded text-[10px]">G</kbd> grid
          </span>
          <span>·</span>
          <span>
            <kbd className="bg-slate-100 px-1 rounded text-[10px]">Del</kbd>{" "}
            delete
          </span>
        </div>
      </footer>
    </div>
  );
}

// Warehouse Management Wrapper Component
function WarehouseManagementWrapper({
  branches = [],
  products = [],
  warehouseLocations = [],
  onRefreshLocations,
}: {
  branches?: any[];
  products?: Product[];
  warehouseLocations?: any[];
  onRefreshLocations?: () => void;
}) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [newWarehouseRows, setNewWarehouseRows] = useState("10");
  const [newWarehouseCols, setNewWarehouseCols] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch warehouses on mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const result = await fetchJson("/api/stock/warehouses");
        if (!result.response.ok) throw new Error(result.errorMessage || "Failed to fetch warehouses");
        const warehouseList = result.data?.data || [];
        setWarehouses(warehouseList);
        if (warehouseList.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(warehouseList[0]._id);
        }
      } catch (err) {
        console.error("Error fetching warehouses:", err);
        setError("Failed to load warehouses");
      }
    };
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      setError("Warehouse name is required");
      return;
    }

    const rows = parseInt(newWarehouseRows) || 10;
    const cols = parseInt(newWarehouseCols) || 10;

    if (rows < 1 || cols < 1) {
      setError("Rows and columns must be at least 1");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchJson("/api/stock/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWarehouseName,
          rows,
          cols,
          layoutObjects: [],
        }),
      });

      if (!result.response.ok) throw new Error(result.errorMessage || "Failed to create warehouse");
      const newWarehouse = result.data?.data;

      setWarehouses((prev) => [...prev, newWarehouse]);
      setSelectedWarehouseId(newWarehouse._id);
      setNewWarehouseName("");
      setNewWarehouseRows("10");
      setNewWarehouseCols("10");
      setShowCreateForm(false);
    } catch (err) {
      console.error("Error creating warehouse:", err);
      setError("Failed to create warehouse");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWarehouse = warehouses.find(
    (w) => w._id === selectedWarehouseId,
  );

  return (
    <div className="flex flex-col h-full">
      {/* Warehouse Selector */}
      <div className="border-b border-slate-200 bg-slate-50/50 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-slate-700">
            Warehouse:
          </label>
          <select
            value={selectedWarehouseId || ""}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Select a warehouse...</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            + New Warehouse
          </button>
        </div>

        {/* Create Warehouse Form */}
        {showCreateForm && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Create New Warehouse
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWarehouseName}
                  onChange={(e) => setNewWarehouseName(e.target.value)}
                  placeholder="Warehouse name (e.g., Main Warehouse)"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Rows
                  </label>
                  <input
                    type="number"
                    value={newWarehouseRows}
                    onChange={(e) => setNewWarehouseRows(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Columns
                  </label>
                  <input
                    type="number"
                    value={newWarehouseCols}
                    onChange={(e) => setNewWarehouseCols(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateWarehouse}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewWarehouseName("");
                  setNewWarehouseRows("10");
                  setNewWarehouseCols("10");
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        {selectedWarehouse ? (
          <WarehouseCanvas
            warehouse={selectedWarehouse}
            products={products}
            onSave={onRefreshLocations}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Please select or create a warehouse to start designing</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const WarehouseManagement = WarehouseManagementWrapper;

export default WarehouseManagementWrapper;
