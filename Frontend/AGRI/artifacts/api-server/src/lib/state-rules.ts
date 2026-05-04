import { db } from "@workspace/db";
import { ruleProfiles } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export interface StateRulePack {
  stateCode: string;
  stateName: string;
  packVersion: string;
  thresholds: {
    autoApprove: number;
    officerReview: number;
    cceVisit: number;
    autoReject: number;
    mutationDaysAlert: number;
    cscDailyBulkLimit: number;
    bankNameMatchMin: number;
    areaDeltaMaxPct: number;
    overInsuranceMaxRatio: number;
    minBaselineNdvi: number;
  };
  hardRules: HardRule[];
  extraFlags: ExtraFlag[];
}

export interface HardRule {
  ruleId: string;
  description: string;
  action: "REJECT" | "REVIEW" | "HOLD" | "ESCALATE";
  reason: string;
}

export interface ExtraFlag {
  flagId: string;
  weight: number;
  description: string;
  evidence: string;
}

const DEFAULT_THRESHOLDS = {
  autoApprove: 30,
  officerReview: 60,
  cceVisit: 80,
  autoReject: 81,
  mutationDaysAlert: 30,
  cscDailyBulkLimit: 20,
  bankNameMatchMin: 80,
  areaDeltaMaxPct: 20,
  overInsuranceMaxRatio: 1.5,
  minBaselineNdvi: 0.15,
};

const BUILT_IN_PACKS: Record<string, StateRulePack> = {
  "27": {
    stateCode: "27",
    stateName: "Maharashtra",
    packVersion: "v6.1",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      cscDailyBulkLimit: 15,
      mutationDaysAlert: 45,
      minBaselineNdvi: 0.18,
    },
    hardRules: [
      {
        ruleId: "MH-HR-001",
        description: "Commercial or government land rejection",
        action: "REJECT",
        reason: "Maharashtra: Land classified as COMMERCIAL/GOVERNMENT is ineligible for PMFBY",
      },
      {
        ruleId: "MH-HR-002",
        description: "Owner-policy overstacking — same owner across 3+ policies",
        action: "HOLD",
        reason: "Maharashtra: Same owner has 3+ concurrent PMFBY policies — potential overstacking",
      },
      {
        ruleId: "MH-HR-003",
        description: "Pre-sowing barren NDVI rejection",
        action: "REJECT",
        reason: "Maharashtra: Baseline NDVI < 0.18 indicates barren land — sowing declaration unverifiable",
      },
    ],
    extraFlags: [
      {
        flagId: "MH-CSC-BULK",
        weight: 40,
        description: "CSC submitted more than 15 claims in a single day for this district",
        evidence: "CSC_ACTIVITY",
      },
      {
        flagId: "MH-OWNER-STACK",
        weight: 35,
        description: "Same UDLRN owner found in multiple active policies this season",
        evidence: "POLICY_HISTORY",
      },
    ],
  },
  "29": {
    stateCode: "29",
    stateName: "Karnataka",
    packVersion: "v6.1",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      mutationDaysAlert: 30,
      areaDeltaMaxPct: 15,
    },
    hardRules: [
      {
        ruleId: "KA-HR-001",
        description: "Recent RTC mutation within 30 days — VAO bypass alert",
        action: "REVIEW",
        reason: "Karnataka: RTC mutation within 30 days of claim filing — potential VAO bypass escalation",
      },
      {
        ruleId: "KA-HR-002",
        description: "Non-ag reclassification freeze",
        action: "REJECT",
        reason: "Karnataka: Land reclassified from agricultural to non-agricultural — insurance ineligible",
      },
    ],
    extraFlags: [
      {
        flagId: "KA-NDVI-CONTRA",
        weight: 55,
        description: "Healthy NDVI contradicts declared damage — Karnataka-specific NDVI threshold",
        evidence: "SATELLITE",
      },
      {
        flagId: "KA-RTC-MUTATION",
        weight: 60,
        description: "RTC mutation suspiciously timed before claim filing",
        evidence: "RTC",
      },
    ],
  },
  "36": {
    stateCode: "36",
    stateName: "Telangana",
    packVersion: "v6.1",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      bankNameMatchMin: 85,
    },
    hardRules: [
      {
        ruleId: "TG-HR-001",
        description: "Boundary overlap with prohibited / forest land",
        action: "REJECT",
        reason: "Telangana: Parcel boundary overlaps with protected/forest land — ineligible for PMFBY",
      },
    ],
    extraFlags: [
      {
        flagId: "TG-GPS-MISMATCH",
        weight: 50,
        description: "GPS coordinates at submission do not match registered Dharani parcel centroid",
        evidence: "DHARANI",
      },
      {
        flagId: "TG-SAR-CONFIDENCE",
        weight: 30,
        description: "Low SAR confidence weight — direct satellite query confidence below 0.7",
        evidence: "SATELLITE",
      },
    ],
  },
  "03": {
    stateCode: "03",
    stateName: "Punjab",
    packVersion: "v6.0-beta",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      cscDailyBulkLimit: 25,
    },
    hardRules: [
      {
        ruleId: "PB-HR-001",
        description: "Khasra deduplication — same Khasra filed by different tenants",
        action: "HOLD",
        reason: "Punjab: Duplicate Khasra number detected across multiple claim filings — tenant-owner mismatch",
      },
    ],
    extraFlags: [
      {
        flagId: "PB-KHASRA-DEDUP",
        weight: 45,
        description: "Same Khasra number filed under multiple farmer IDs this season",
        evidence: "JAMABANDI",
      },
      {
        flagId: "PB-TENANT-MISMATCH",
        weight: 40,
        description: "Declared tenant does not match Jamabandi leaseholder record",
        evidence: "JAMABANDI",
      },
    ],
  },
  "09": {
    stateCode: "09",
    stateName: "Uttar Pradesh",
    packVersion: "v6.0-beta",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      cscDailyBulkLimit: 18,
      bankNameMatchMin: 75,
    },
    hardRules: [
      {
        ruleId: "UP-HR-001",
        description: "Multi-policy per Khasra block",
        action: "HOLD",
        reason: "UP: Multiple PMFBY policies filed for same Khasra block — policy stacking detected",
      },
    ],
    extraFlags: [
      {
        flagId: "UP-BANK-CLUSTER",
        weight: 50,
        description: "Clustered bank accounts — more than 5 claims to same bank branch in one day",
        evidence: "PROTEAN",
      },
      {
        flagId: "UP-FAKE-RING",
        weight: 65,
        description: "Bank account ring pattern — circular transfers detected in payout history",
        evidence: "PROTEAN",
      },
    ],
  },
  "08": {
    stateCode: "08",
    stateName: "Rajasthan",
    packVersion: "v6.0-beta",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      minBaselineNdvi: 0.12,
      autoApprove: 25,
      officerReview: 55,
    },
    hardRules: [
      {
        ruleId: "RJ-HR-001",
        description: "Historical barren land rejection",
        action: "REJECT",
        reason: "Rajasthan: 10-year Landsat data shows consistently barren land — no viable crop history",
      },
    ],
    extraFlags: [
      {
        flagId: "RJ-HEATMAP-ESCALATE",
        weight: 35,
        description: "District is in high-fraud heatmap zone — elevated scrutiny applied",
        evidence: "ANALYTICS",
      },
      {
        flagId: "RJ-ARID-NDVI",
        weight: 30,
        description: "NDVI threshold adjusted for arid/semi-arid crop — below adjusted minimum",
        evidence: "SATELLITE",
      },
    ],
  },
};

let profileCache: Map<string, StateRulePack> = new Map();
let cacheLoadedAt: Date | null = null;

async function loadRuleProfilesFromDb(): Promise<void> {
  const profiles = await db.query.ruleProfiles.findMany({
    where: eq(ruleProfiles.isActive, true),
  });

  for (const p of profiles) {
    const stateKey = p.stateCode ?? "DEFAULT";
    const existing = profileCache.get(stateKey) ?? BUILT_IN_PACKS[stateKey] ?? null;
    if (!existing) continue;

    profileCache.set(stateKey, {
      ...existing,
      thresholds: {
        ...existing.thresholds,
        autoApprove: p.autoApproveThreshold ?? existing.thresholds.autoApprove,
        officerReview: p.officerReviewThreshold ?? existing.thresholds.officerReview,
        cceVisit: p.cceVisitThreshold ?? existing.thresholds.cceVisit,
        autoReject: p.autoRejectThreshold ?? existing.thresholds.autoReject,
        mutationDaysAlert: p.mutationDaysAlert ?? existing.thresholds.mutationDaysAlert,
        cscDailyBulkLimit: p.cscDailyBulkLimit ?? existing.thresholds.cscDailyBulkLimit,
        bankNameMatchMin: p.bankNameMatchMinScore ?? existing.thresholds.bankNameMatchMin,
        areaDeltaMaxPct: Number(p.areaDeltaMaxPct) || existing.thresholds.areaDeltaMaxPct,
        overInsuranceMaxRatio: Number(p.overInsuranceMaxRatio) || existing.thresholds.overInsuranceMaxRatio,
        minBaselineNdvi: Number(p.minBaselineNdvi) || existing.thresholds.minBaselineNdvi,
      },
    });
  }
  cacheLoadedAt = new Date();
}

export async function getRulePack(stateCode: string | null | undefined): Promise<StateRulePack> {
  if (!stateCode) {
    return {
      stateCode: "DEFAULT",
      stateName: "Default",
      packVersion: "v6.0",
      thresholds: DEFAULT_THRESHOLDS,
      hardRules: [],
      extraFlags: [],
    };
  }

  const cacheStale = !cacheLoadedAt || (Date.now() - cacheLoadedAt.getTime()) > 300_000;
  if (cacheStale) {
    try { await loadRuleProfilesFromDb(); } catch {}
  }

  return profileCache.get(stateCode) ?? BUILT_IN_PACKS[stateCode] ?? {
    stateCode,
    stateName: `State ${stateCode}`,
    packVersion: "v6.0",
    thresholds: DEFAULT_THRESHOLDS,
    hardRules: [],
    extraFlags: [],
  };
}

export function getStateAdapterName(stateCode: string | null | undefined): string {
  const adapters: Record<string, string> = {
    "29": "BHOOMI_KA",
    "27": "MAHABHUMI_MH",
    "36": "DHARANI_TG",
    "03": "JAMABANDI_PB",
    "09": "BHULEKH_UP",
    "08": "APNA_KHATA_RJ",
  };
  return adapters[stateCode ?? ""] ?? "GENERIC_ADAPTER";
}

export { BUILT_IN_PACKS };
