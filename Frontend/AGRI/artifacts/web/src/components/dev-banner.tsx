import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";

const PORTALS = [
  {
    label: "Farmer", link: "/farmer/login", color: "bg-green-600",
    creds: [{ k: "Mobile", v: "9900000001" }, { k: "OTP", v: "123456" }, { k: "Also", v: "…002, …003" }],
  },
  {
    label: "Admin", link: "/admin/login", color: "bg-blue-700",
    creds: [{ k: "Email", v: "superadmin@bhuvigyan.gov.in" }, { k: "Pass", v: "Admin@123" }, { k: "TOTP", v: "123456" }],
  },
  {
    label: "CSC", link: "/csc/login", color: "bg-purple-700",
    creds: [{ k: "Code", v: "CSC-KA-001" }, { k: "Pass", v: "Csc@123" }, { k: "OTP", v: "123456" }],
  },
  {
    label: "Inspector", link: "/inspector/login", color: "bg-orange-600",
    creds: [{ k: "Email", v: "inspector.ka@bhuvigyan.gov.in" }, { k: "OTP", v: "123456" }],
  },
  {
    label: "Insurer", link: "/insurer/login", color: "bg-cyan-700",
    creds: [{ k: "Code", v: "AGRI_INSURE_KA" }, { k: "Pass", v: "Insurer@123" }],
  },
];

export function DevBanner() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] shadow-md">
      <div className="bg-yellow-400 text-yellow-900 text-xs">
        <div className="flex items-center justify-between px-3 py-1.5">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2 hover:opacity-80 flex-1 text-left">
            <span className="font-bold">🚧 DEV MODE</span>
            <span className="opacity-60 hidden sm:inline">|</span>
            <span className="hidden sm:inline">OTP/TOTP: <span className="font-mono bg-yellow-300 px-1 rounded">123456</span></span>
            <span className="opacity-60 hidden sm:inline">|</span>
            <span className="hidden sm:inline">Admin: <span className="font-mono">superadmin@bhuvigyan.gov.in / Admin@123</span></span>
            <span className="opacity-60 hidden md:inline">|</span>
            <span className="hidden md:inline">Farmer: <span className="font-mono">9900000001</span></span>
            {open ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-yellow-300 rounded ml-2 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {open && (
          <div className="border-t border-yellow-500 bg-yellow-50 px-3 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PORTALS.map((p) => (
                <div key={p.label} className="bg-white rounded-lg border border-yellow-200 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${p.color}`}>{p.label}</span>
                    <Link href={p.link} className="text-blue-600 hover:text-blue-800"><ExternalLink className="w-3 h-3" /></Link>
                  </div>
                  {p.creds.map((c) => (
                    <div key={c.k} className="flex gap-1 text-[10px]">
                      <span className="text-yellow-700 shrink-0">{c.k}:</span>
                      <span className="font-mono font-bold text-gray-800 break-all">{c.v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-yellow-700">All OTPs/TOTPs accept <strong>123456</strong>. Demo farmers: 9900000001–9900000003.</div>
          </div>
        )}
      </div>
    </div>
  );
}
