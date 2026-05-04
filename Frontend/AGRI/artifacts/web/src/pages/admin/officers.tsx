import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Officer {
  id: string; email: string; fullName: string; role: string;
  stateCode?: string; districtId?: string; isActive: boolean;
  lastLoginAt?: string; createdAt: string;
}

const ROLES = ["SUPER_ADMIN", "STATE_HEAD", "DC", "DISTRICT_OFFICER", "FIELD_INSPECTOR", "ANALYST"];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  STATE_HEAD: "bg-blue-100 text-blue-700",
  DC: "bg-indigo-100 text-indigo-700",
  DISTRICT_OFFICER: "bg-cyan-100 text-cyan-700",
  FIELD_INSPECTOR: "bg-teal-100 text-teal-700",
  ANALYST: "bg-gray-100 text-gray-700",
};

export default function Officers() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", mobile: "", role: "DISTRICT_OFFICER", stateCode: "", districtId: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["officers"],
    queryFn: () => apiFetch<{ data: Officer[] }>("/v1/admin/officers"),
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/v1/admin/officers", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (res: { data: { tempPassword: string } }) => {
      toast({ title: "Officer created", description: `Temp password: ${res.data?.tempPassword}` });
      qc.invalidateQueries({ queryKey: ["officers"] });
      setShowModal(false);
      setForm({ email: "", fullName: "", mobile: "", role: "DISTRICT_OFFICER", stateCode: "", districtId: "" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const officers = data?.data ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Officers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{officers.length} total officers</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Officer
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Officer", "Role", "Jurisdiction", "Last Login", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
            ))}
            {officers.map((o) => (
              <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{o.fullName}</div>
                  <div className="text-xs text-muted-foreground">{o.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[o.role] ?? "bg-gray-100 text-gray-700"}`}>
                    <Shield className="w-3 h-3" />
                    {o.role.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {o.stateCode && <div>State: {o.stateCode}</div>}
                  {o.districtId && <div>District: {o.districtId}</div>}
                  {!o.stateCode && !o.districtId && <span className="italic">National</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${o.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {o.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-border"><h3 className="font-semibold text-foreground">Add New Officer</h3></div>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="p-5 space-y-4">
              {[
                { key: "email", label: "Email *", type: "email", placeholder: "officer@state.gov.in" },
                { key: "fullName", label: "Full Name *", type: "text", placeholder: "Officer Name" },
                { key: "mobile", label: "Mobile", type: "tel", placeholder: "9XXXXXXXXX" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]} placeholder={placeholder} required={label.includes("*")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State Code</label>
                  <input type="text" value={form.stateCode} placeholder="29"
                    onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">District ID</label>
                  <input type="text" value={form.districtId} placeholder="29-0572"
                    onChange={(e) => setForm((f) => ({ ...f, districtId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {createMut.isPending ? "Creating..." : "Create Officer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
