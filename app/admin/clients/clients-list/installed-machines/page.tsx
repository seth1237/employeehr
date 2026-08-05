"use client";

import { useEffect, useState } from "react";
import { stockApi } from "@/lib/api";
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load";
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function InstalledMachinesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    clientKey: "",
    productId: "",
    serialNumber: "",
    installationLocation: "",
    installationDepartment: "",
    installationDate: "",
    warrantyUntil: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async (opts?: SilentLoadOptions) => {
    try {
      await runDataLoad(
        setLoading,
        async () => {
          const [mRes, clientsRes, productsRes] = await Promise.all([
            stockApi.getInstalledMachines(),
            stockApi.getAccountsClients(),
            stockApi.getProducts(),
          ]);
          setMachines(
            (mRes &&
              (mRes.data || Array.isArray(mRes) ? mRes.data || mRes : [])) as any[],
          );
          const clientsArray =
            clientsRes &&
            (clientsRes.data || Array.isArray(clientsRes)
              ? clientsRes.data || clientsRes
              : []);
          setClients(clientsArray as any[]);
          const productsArray =
            productsRes &&
            (productsRes.data || Array.isArray(productsRes)
              ? productsRes.data || productsRes
              : []);
          setProducts(productsArray as any[]);
        },
        opts,
        setRefreshing,
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to load installed machines");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    try {
      if (!form.clientKey) return alert("Select a client");
      if (!form.productId) return alert("Select a product");
      setSaving(true);
      const client = clients.find((c: any) => c.key === form.clientKey);
      const product = products.find((p: any) => p._id === form.productId);
      const payload = {
        client: {
          name: client.client?.name || client.name || "",
          number: client.client?.number || "",
          location: client.client?.location || "",
        },
        productId: product._id,
        productName: product.name,
        category: product.category,
        serialNumber: form.serialNumber || undefined,
        installationLocation: form.installationLocation || undefined,
        installationDepartment: form.installationDepartment || undefined,
        installationDate: form.installationDate || undefined,
        warrantyUntil: form.warrantyUntil || undefined,
        notes: form.notes || undefined,
      };
      const res = await stockApi.createInstalledMachine(payload);
      if (!res?.success && !res?.data)
        throw new Error(res?.message || "Failed to create");
      alert("Installed machine saved");
      setForm({
        clientKey: "",
        productId: "",
        serialNumber: "",
        installationLocation: "",
        installationDepartment: "",
        installationDate: "",
        warrantyUntil: "",
        notes: "",
      });
      const created = res?.data;
      if (created?._id) {
        setMachines((prev) => [created, ...prev]);
      } else {
        await load({ silent: true });
      }
    } catch (err: any) {
      alert(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoadingSkeleton title="Loading installed machines" rows={8} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Installed Machines</h1>
        <p className="text-sm text-muted-foreground">
          Registry of deployed machines per client.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Installed Machines</CardTitle>
          </CardHeader>
          <CardContent>
            {machines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No installed machines found.
              </p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Machine</th>
                      <th className="py-2">Serial</th>
                      <th className="py-2">Client</th>
                      <th className="py-2">Location</th>
                      <th className="py-2">Installed</th>
                      <th className="py-2">Warranty</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((m) => (
                      <tr key={m._id} className="border-b">
                        <td className="py-2">{m.productName}</td>
                        <td className="py-2">{m.serialNumber || "-"}</td>
                        <td className="py-2">{m.client?.name}</td>
                        <td className="py-2">
                          {m.installationLocation || m.client?.location || "-"}
                        </td>
                        <td className="py-2">
                          {m.installationDate
                            ? new Date(m.installationDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-2">
                          {m.warrantyUntil
                            ? new Date(m.warrantyUntil).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-2">{m.status || "active"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Installed Machine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Client</Label>
              <select
                value={form.clientKey}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, clientKey: e.target.value }))
                }
                className="w-full rounded border px-2 py-2"
              >
                <option value="">Select client</option>
                {clients.map((c: any) => (
                  <option key={c.key || c._id} value={c.key || c._id}>
                    {c.client?.name || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Category / Product</Label>
              <select
                value={form.productId}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, productId: e.target.value }))
                }
                className="w-full rounded border px-2 py-2"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.category ? `· ${p.category}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Note: Only products marked as Machine should be used here
                (filtering is manual in this initial release).
              </p>
            </div>

            <div>
              <Label>Serial number</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, serialNumber: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Installation location</Label>
              <Input
                value={form.installationLocation}
                onChange={(e) =>
                  setForm((p: any) => ({
                    ...p,
                    installationLocation: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Department</Label>
                <Input
                  value={form.installationDepartment}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      installationDepartment: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Installation date</Label>
                <Input
                  type="date"
                  value={form.installationDate}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      installationDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Warranty until</Label>
              <Input
                type="date"
                value={form.warrantyUntil}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, warrantyUntil: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save installation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
