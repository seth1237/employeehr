# Backend Requirements — Machine Services Module

The updated Installed Machines page adds a **Services** module (Pending / Due /
Coming Soon / Done) on top of the existing `InstalledMachine` model. This
requires one new collection/model (`MachineService`) plus a handful of new
API routes and `stockApi` client methods. Nothing about the existing
Installed Machines endpoints needs to change.

---

## 1. New data model: `MachineService`

Each row represents a single service/maintenance event tied to one installed
machine — either scheduled (pending) or already completed.

```ts
interface MachineService {
  _id: string;
  machineId: string;          // ref -> InstalledMachine._id (required)
  serviceType?: string;       // free text, e.g. "Routine maintenance", "Repair"
  scheduledDate?: string;     // ISO date — when the service is due/planned
  completedDate?: string;     // ISO date — set once the service is done
  technician?: string;        // who performed / will perform the service
  cost?: number;              // optional cost of the service
  notes?: string;             // free text notes / parts used / observations
  createdAt: string;
  updatedAt: string;
}
```

### Suggested Mongoose schema

```js
const machineServiceSchema = new Schema(
  {
    machineId: { type: Schema.Types.ObjectId, ref: "InstalledMachine", required: true, index: true },
    serviceType: { type: String, default: "" },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    technician: { type: String, default: "" },
    cost: { type: Number },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);
```

### Status logic (computed, not stored)

The frontend derives status from dates rather than a stored enum, so the
backend does not need to maintain a status field — just return the raw dates.
For reference, the frontend classifies each service as:

- **Done** — `completedDate` is set.
- **Due** — no `completedDate`, and `scheduledDate` is today or in the past.
- **Coming Soon** — no `completedDate`, and `scheduledDate` is within the
  selected look-ahead window (7 days or 30 days) from today.
- **Pending** — the umbrella bucket of every service without a
  `completedDate` (this includes Due + Coming Soon + anything with no date
  yet set).

If you'd prefer this computed on the backend instead (e.g. for use in other
reports), replicate the same rules server-side and return a `status` field
alongside the raw dates — but keep the raw dates too, since the UI still
needs them for display.

---

## 2. New API endpoints

Suggested REST routes (adjust prefix to match the existing API, e.g.
`/api/stock/...`):

| Method | Route                                   | Purpose                                   |
|--------|------------------------------------------|--------------------------------------------|
| GET    | `/machine-services`                       | List all services (see query params below) |
| GET    | `/machine-services/:id`                   | Get a single service                        |
| POST   | `/machine-services`                       | Create a new service record                 |
| PUT    | `/machine-services/:id`                   | Update a service (incl. marking it done)    |
| DELETE | `/machine-services/:id`                   | Delete a service record                     |
| GET    | `/installed-machines/:id/services`        | (Optional) list services for one machine    |

### `GET /machine-services` — query params

- `machineId` — filter to a single machine.
- `status` — optional server-side filter: `pending` \| `due` \| `coming-soon` \| `done`.
- `withinDays` — used with `status=coming-soon` to set the look-ahead window (`7` or `30`).

If server-side filtering isn't implemented, it's fine to just return **all**
services and let the frontend bucket them client-side (this is what the
current frontend code assumes/does).

### Response shape

Each service should come back **populated** with enough machine/client info
to render the list without another round trip:

```json
{
  "data": [
    {
      "_id": "665f...",
      "machineId": "664a...",
      "machine": {
        "productName": "Industrial Mixer X200",
        "serialNumber": "SN-2024-001",
        "client": { "name": "Acme Foods Ltd", "location": "Nairobi" }
      },
      "serviceType": "Routine maintenance",
      "scheduledDate": "2026-07-10T00:00:00.000Z",
      "completedDate": null,
      "technician": "John Otieno",
      "cost": 3500,
      "notes": "Replace filter",
      "createdAt": "2026-06-01T08:00:00.000Z",
      "updatedAt": "2026-06-01T08:00:00.000Z"
    }
  ]
}
```

### POST /machine-services — body

```json
{
  "machineId": "664a...",
  "serviceType": "Routine maintenance",
  "scheduledDate": "2026-07-10T00:00:00.000Z",
  "technician": "John Otieno",
  "cost": 3500,
  "notes": "Replace filter",
  "completedDate": null
}
```

### PUT /machine-services/:id — body

Same shape as POST, partial updates allowed. The "Mark done" quick action
from the UI sends just:

```json
{ "completedDate": "2026-07-07T10:00:00.000Z" }
```

---

## 3. `stockApi` client additions (`lib/api.ts`)

The page calls the following methods, which need to be added next to the
existing `getInstalledMachines` / `createInstalledMachine` / etc.:

```ts
export const stockApi = {
  // ...existing methods (getInstalledMachines, getInstallableCandidates,
  // createInstalledMachine, updateInstalledMachine, deleteInstalledMachine)...

  getMachineServices: (params?: { machineId?: string; status?: string; withinDays?: number }) =>
    apiClient.get("/machine-services", { params }),

  getMachineService: (id: string) =>
    apiClient.get(`/machine-services/${id}`),

  createMachineService: (data: Partial<MachineService>) =>
    apiClient.post("/machine-services", data),

  updateMachineService: (id: string, data: Partial<MachineService>) =>
    apiClient.put(`/machine-services/${id}`, data),

  deleteMachineService: (id: string) =>
    apiClient.delete(`/machine-services/${id}`),
};
```

The frontend guards the initial load with
`stockApi.getMachineServices ? stockApi.getMachineServices() : Promise.resolve({ data: [] })`,
so the page won't crash before these methods exist — it will just show empty
service lists until the backend and client methods are wired up.

---

## 4. Optional: keep `InstalledMachine.nextServiceDate` in sync

The existing `InstalledMachine` model already has a `nextServiceDate` field
used for the old single-date reminder. Two options going forward:

1. **Deprecate it** in favor of the new `MachineService` records (recommended
   — one source of truth), and stop displaying/editing it once the Services
   module is live for all machines.
2. **Keep both**, and when a new `MachineService` is created for a machine,
   also update that machine's `nextServiceDate` to the soonest open
   (`!completedDate`) `scheduledDate` across its services, so any other part
   of the app still reading `nextServiceDate` stays accurate.

Either is fine functionally — just pick one so the two don't drift out of
sync.

---

## 5. Suggested indexes

```js
machineServiceSchema.index({ machineId: 1 });
machineServiceSchema.index({ completedDate: 1 });
machineServiceSchema.index({ scheduledDate: 1 });
```

These keep the Pending/Due/Coming Soon/Done queries fast as the services
collection grows.