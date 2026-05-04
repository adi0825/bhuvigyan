import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, RefreshCw, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";

function insurerFetch<T>(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("insurer_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.message ?? "Request failed");
    return j as T;
  });
}

interface EvidencePackage {
  packageId: string;
  generatedAt: string;
  claimSummary: {
    claimNumber: string;
    status: string;
    fraudScore: number;
    fraudConfidence: number;
    verdict: string;
    verdictBand: string;
    modelVersion: string;
    filedAt: string;
    decidedAt: string | null;
  };
  farmerUdlrn: {
    udlrn: string;
    landOwnerName: string;
    surveyNumber: string;
    stateCode: string;
    landUseType: string;
    kgisAreaHa: number;
    rtcAreaHa: number;
    isFrozen: boolean;
    payoutBank: string;
    payoutAccountMasked: string;
    payoutIfsc: string;
  };
  satelliteAnalysis: {
    dataSource: string;
    cloudCoverPct: number;
    ndviSowing: number;
    ndviClaim: number;
    ndviLossPct: number;
    ndviBaseline10yr: number;
    imdWeatherConfirmed: boolean;
    interpretation: string;
    ndviTimeline: Array<{ date: string; ndvi: number; source: string }>;
  };
  fraudAnalysis: {
    score: number;
    confidence: number;
    riskBand: string;
    flags: string[];
    flagBreakdown: Array<{ flag: string; weight: number; evidence: string; description: string }>;
    explainabilityReasons: string[];
    stateRulePackVersion: string;
    hardRuleOverride: string | null;
    activeStateRuleHits: string[];
  };
  mutationHistory: Array<{ mutationType: string; mutationDate: string; daysBefore: number; isSuspicious: boolean; suspicionReason: string | null }>;
  operatorFlags: { cscId: string | null; cscName: string | null; cscDailySubmissions: number; cscBulkFlag: boolean; operatorRiskScore: number };
  auditChain: Array<{ step: string; actorType: string; reason: string; timestamp: string }>;
  decisionSummary: { verdict: string; nextStep: string; approvedAmount: number | null; rejectionReason: string | null; firAlertSent: boolean };
  integrityHash: string;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score <= 30 ? "text-green-600" : score <= 60 ? "text-yellow-600" : score <= 80 ? "text-orange-600" : "text-red-600";
  const bg = score <= 30 ? "bg-green-100" : score <= 60 ? "bg-yellow-100" : score <= 80 ? "bg-orange-100" : "bg-red-100";
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <div className={`text-4xl font-black ${color}`}>{score}</div>
      <div className="text-xs text-gray-500 mt-0.5">/ 100</div>
      <div className={`text-xs font-medium mt-1 ${color}`}>FRAUD SCORE</div>
    </div>
  );
}

export default function InsurerEvidence({ params }: { params: { claimId: string } }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const claimId = params.claimId;

  const { data, isLoading, error } = useQuery({
    queryKey: ["insurer-evidence", claimId],
    queryFn: () => insurerFetch<{ data: { package: EvidencePackage; fromCache: boolean; contentHash: string } }>(`/v1/evidence/${claimId}`),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => insurerFetch(`/v1/evidence/${claimId}/regenerate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurer-evidence", claimId] }),
  });

  const pkg = data?.data?.package;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading evidence package…</div>
  );
  if (error || !pkg) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">Evidence package not available</p>
        <button onClick={() => navigate("/insurer/dashboard")} className="mt-3 text-blue-600 text-sm hover:underline">← Back to dashboard</button>
      </div>
    </div>
  );

  const sa = pkg.satelliteAnalysis;
  const fa = pkg.fraudAnalysis;
  const ds = pkg.decisionSummary;
  const fu = pkg.farmerUdlrn;

  return (
    <div className="min-h-screen bg-gray-50">
      <DevBanner />
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/insurer/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Evidence Package</h1>
            <p className="text-gray-500 text-sm">{pkg.claimSummary.claimNumber} · {pkg.packageId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </div>

        {/* Frozen alert */}
        {fu.isFrozen && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-sm font-medium">UDLRN is FROZEN — high fraud score detected. Land record locked pending investigation.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <ScoreGauge score={fa.score} />
          <div className="bg-white rounded-xl border p-4 md:col-span-2">
            <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Claim Summary</div>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-gray-500">Status</div>
              <div className="font-semibold">{pkg.claimSummary.status}</div>
              <div className="text-gray-500">Verdict Band</div>
              <div className="font-semibold text-gray-800">{pkg.claimSummary.verdictBand}</div>
              <div className="text-gray-500">Confidence</div>
              <div className="font-semibold">{(fa.confidence * 100).toFixed(1)}%</div>
              <div className="text-gray-500">Model Version</div>
              <div className="font-mono text-xs">{pkg.claimSummary.modelVersion}</div>
              <div className="text-gray-500">State Rule Pack</div>
              <div className="font-mono text-xs">{fa.stateRulePackVersion}</div>
              {fa.hardRuleOverride && <>
                <div className="text-gray-500">Hard Rule</div>
                <div className="font-medium text-red-600">{fa.hardRuleOverride}</div>
              </>}
            </div>
          </div>
        </div>

        {/* UDLRN / Land */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">UDLRN & Land Record</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><div className="text-xs text-gray-400">UDLRN</div><div className="font-mono font-bold">{fu.udlrn}</div></div>
            <div><div className="text-xs text-gray-400">Owner</div><div className="font-medium">{fu.landOwnerName}</div></div>
            <div><div className="text-xs text-gray-400">Survey No.</div><div>{fu.surveyNumber}</div></div>
            <div><div className="text-xs text-gray-400">Land Use</div><div>{fu.landUseType}</div></div>
            <div><div className="text-xs text-gray-400">KGIS Area</div><div>{fu.kgisAreaHa} Ha</div></div>
            <div><div className="text-xs text-gray-400">RTC Area</div><div>{fu.rtcAreaHa} Ha</div></div>
            <div><div className="text-xs text-gray-400">Payout Bank</div><div>{fu.payoutBank}</div></div>
            <div><div className="text-xs text-gray-400">Account</div><div className="font-mono">{fu.payoutAccountMasked}</div></div>
            <div><div className="text-xs text-gray-400">IFSC</div><div className="font-mono">{fu.payoutIfsc}</div></div>
          </div>
        </div>

        {/* Satellite Analysis */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Satellite Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "NDVI at Sowing", value: sa.ndviSowing.toFixed(3), color: "text-green-700" },
              { label: "NDVI at Claim", value: sa.ndviClaim.toFixed(3), color: "text-orange-700" },
              { label: "NDVI Loss", value: `${sa.ndviLossPct.toFixed(1)}%`, color: sa.ndviLossPct > 40 ? "text-green-700" : "text-red-700" },
              { label: "10yr Baseline", value: sa.ndviBaseline10yr.toFixed(3), color: "text-blue-700" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 mb-4">{sa.interpretation}</div>
          <div className="flex gap-4 text-sm flex-wrap">
            <span className="text-gray-500">Source: <b>{sa.dataSource}</b></span>
            <span className="text-gray-500">Cloud Cover: <b>{sa.cloudCoverPct.toFixed(1)}%</b></span>
            <span className={sa.imdWeatherConfirmed ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              IMD: {sa.imdWeatherConfirmed ? "✅ Confirmed" : "❌ No event"}
            </span>
          </div>

          {/* NDVI Timeline */}
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-500 mb-2">NDVI TIMELINE</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sa.ndviTimeline.map((t, i) => (
                <div key={i} className="flex-shrink-0 text-center">
                  <div className="text-xs text-gray-400 mb-1">{t.date}</div>
                  <div
                    className="w-12 rounded-t"
                    style={{ height: `${Math.round(t.ndvi * 80)}px`, backgroundColor: t.ndvi > 0.4 ? "#22c55e" : t.ndvi > 0.25 ? "#f59e0b" : "#ef4444" }}
                  />
                  <div className="text-xs font-mono mt-1">{t.ndvi.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fraud Flags */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Fraud Analysis — {fa.flags.length} flags</h2>
          <div className="space-y-3 mb-4">
            {fa.flagBreakdown.map((flag) => (
              <div key={flag.flag} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-red-700">{flag.flag}</span>
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">w={flag.weight}</span>
                    <span className="text-xs text-gray-400">{flag.evidence}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{flag.description}</div>
                </div>
              </div>
            ))}
            {fa.flags.length === 0 && (
              <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4" /><span className="text-sm">No fraud flags detected</span>
              </div>
            )}
          </div>

          {fa.explainabilityReasons.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">EXPLAINABILITY (AI Reasons)</div>
              <ul className="space-y-1">
                {fa.explainabilityReasons.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">›</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Decision */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Decision Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs text-gray-400">Verdict</div><div className="font-bold text-lg">{ds.verdict}</div></div>
            <div><div className="text-xs text-gray-400">Next Step</div><div className="text-gray-700">{ds.nextStep}</div></div>
            {ds.approvedAmount && <div><div className="text-xs text-gray-400">Approved Amount</div><div className="font-bold text-green-700">₹{ds.approvedAmount.toLocaleString("en-IN")}</div></div>}
            {ds.rejectionReason && <div className="md:col-span-2"><div className="text-xs text-gray-400">Rejection Reason</div><div className="text-red-600">{ds.rejectionReason}</div></div>}
            {ds.firAlertSent && <div className="md:col-span-2 flex items-center gap-2 p-3 bg-red-50 rounded-lg"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-red-700 font-medium text-sm">FIR Alert sent to district collector</span></div>}
          </div>
        </div>

        {/* Audit Chain */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Audit Chain ({pkg.auditChain.length} events)</h2>
          <div className="space-y-2">
            {pkg.auditChain.map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700">{e.step}</span>
                    <span className="text-xs text-gray-400">{e.actorType}</span>
                    <span className="text-xs text-gray-300">{new Date(e.timestamp).toLocaleString("en-IN")}</span>
                  </div>
                  {e.reason && <div className="text-xs text-gray-500 mt-0.5">{e.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrity */}
        <div className="bg-gray-50 rounded-xl border p-4 text-xs text-gray-400 font-mono break-all">
          <Shield className="w-3.5 h-3.5 inline mr-1" />
          SHA-256: {pkg.integrityHash}
        </div>
      </div>
    </div>
  );
}
