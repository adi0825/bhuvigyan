import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { User, CreditCard, MapPin, Bell, Shield, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface FarmerProfile {
  fullName: string; mobile: string; email?: string;
  bankAccount: string; bankIfsc: string; bankName?: string;
  stateCode: string; districtCode: string;
  parcels: Array<{ udlrn: string; areaHa: number; landUse: string; crop?: string }>;
  notificationPrefs: { inApp: boolean; sms: boolean; whatsapp: boolean };
}

export default function FarmerProfile() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-profile"],
    queryFn: () => apiFetch<{ data: FarmerProfile }>("/v1/farmer/profile"),
  });

  const profile = data?.data;

  const maskAccount = (acc: string) => acc ? `${"*".repeat(Math.max(0, acc.length - 4))}${acc.slice(-4)}` : "—";

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Account details, bank information &amp; notification preferences</p>
      </div>

      {/* Identity Card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
          <User className="w-4 h-4" /> Personal Information
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Full Name</div>
              <div className="font-medium">{profile?.fullName ?? user?.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Mobile</div>
              <div className="font-mono">{profile?.mobile ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">State</div>
              <div>{profile?.stateCode ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">District</div>
              <div>{profile?.districtCode ?? "—"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bank Details */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4" /> Bank Account Details
          </h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex items-center gap-1">
            <Shield className="w-3 h-3" /> Verified
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Account Number</div>
              <div className="font-mono">{maskAccount(profile?.bankAccount ?? "")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">IFSC Code</div>
              <div className="font-mono">{profile?.bankIfsc ?? "—"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-0.5">Bank Name</div>
              <div>{profile?.bankName ?? "—"}</div>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          To update bank details, please visit your nearest CSC centre with valid documents.
        </p>
      </div>

      {/* Linked Parcels */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" /> Linked Land Parcels
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (profile?.parcels ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No parcels linked to your account</p>
        ) : (
          <div className="space-y-2">
            {(profile?.parcels ?? []).map((p) => (
              <div key={p.udlrn} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-mono text-xs font-semibold text-primary">{p.udlrn}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.areaHa} Ha · {p.landUse}
                    {p.crop && ` · ${p.crop}`}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4" /> Notification Preferences
        </h2>
        <div className="space-y-3">
          {[
            { key: "inApp", label: "In-App Notifications", description: "Receive updates within Bhuvigyan app" },
            { key: "sms", label: "SMS Notifications", description: "Receive claim updates via SMS" },
            { key: "whatsapp", label: "WhatsApp Notifications", description: "Get alerts on WhatsApp" },
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{pref.label}</div>
                <div className="text-xs text-muted-foreground">{pref.description}</div>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors ${
                isLoading ? "bg-muted animate-pulse" :
                profile?.notificationPrefs?.[pref.key as keyof typeof profile.notificationPrefs] ?
                "bg-primary" : "bg-muted"
              }`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Notification preferences update requires CSC operator assistance.</p>
      </div>
    </div>
  );
}
