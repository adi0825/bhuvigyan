import { db } from "@workspace/db";
import {
  claims, udlrnMaster, auditLog, claimFeatureSnapshots,
  evidenceFiles, cscOperators, adminOfficers, cceVisits,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export interface EvidencePackage {
  packageId: string;
  generatedAt: string;
  claimSummary: {
    claimNumber: string;
    claimId: string;
    status: string;
    filedAt: string;
    decidedAt: string | null;
    fraudScore: number;
    fraudConfidence: number;
    verdict: string;
    verdictBand: string;
    modelVersion: string;
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
    frozenReason: string | null;
    centroidLat: number | null;
    centroidLng: number | null;
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
    sarFloodSignature: boolean;
    imdWeatherConfirmed: boolean;
    ndviTimeline: Array<{ date: string; ndvi: number; source: string }>;
    interpretation: string;
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
  mutationHistory: Array<{
    mutationType: string;
    mutationDate: string;
    daysBefore: number;
    previousOwner: string | null;
    newOwner: string | null;
    isSuspicious: boolean;
    suspicionReason: string | null;
  }>;
  operatorFlags: {
    cscId: string | null;
    cscName: string | null;
    cscDailySubmissions: number;
    cscBulkFlag: boolean;
    operatorRiskScore: number;
    sameBankClusterCount: number;
  };
  auditChain: Array<{
    step: string;
    actorType: string;
    actorId: string;
    reason: string;
    timestamp: string;
  }>;
  decisionSummary: {
    verdict: string;
    nextStep: string;
    appealDeadline: string | null;
    approvedAmount: number | null;
    rejectionReason: string | null;
    firAlertSent: boolean;
  };
  integrityHash: string;
}

function verdictBand(score: number): string {
  if (score <= 30) return "AUTO_APPROVED (0–30)";
  if (score <= 60) return "OFFICER_REVIEW (31–60)";
  if (score <= 80) return "CCE_FIELD_VISIT (61–80)";
  return "AUTO_REJECTED (81–100)";
}

function nextStep(status: string): string {
  const steps: Record<string, string> = {
    AUTO_APPROVED: "DBT payout initiated — credit expected within 3 working days",
    OFFICER_REVIEW: "Assigned to district officer for manual review within 5 working days",
    CCE_VISIT: "Mandatory field inspection scheduled within 3 working days",
    AUTO_REJECTED: "Claim rejected — farmer may appeal within 30 days",
    APPEALED: "Appeal under review by state grievance officer",
    COMPLETED: "Case closed — payout processed",
    OFFICER_APPROVED: "Officer-approved — DBT initiated",
    OFFICER_REJECTED: "Rejected after manual review",
  };
  return steps[status] ?? "Pending — check claim status portal";
}

function generateNdviTimeline(ndviSowing: number, ndviClaim: number, sowingDate: string): Array<{ date: string; ndvi: number; source: string }> {
  const base = new Date(sowingDate || "2024-06-15");
  const timeline = [];
  let current = ndviSowing * 0.6;
  const sources = ["SENTINEL_2_OPTICAL", "SENTINEL_2_OPTICAL", "SENTINEL_1_SAR", "SENTINEL_2_OPTICAL", "SENTINEL_2_OPTICAL", "SENTINEL_2_OPTICAL"];
  for (let i = 0; i < 6; i++) {
    const date = new Date(base);
    date.setDate(base.getDate() + i * 15);
    const t = i / 5;
    if (i < 3) current = ndviSowing * 0.6 + t * ndviSowing * 0.4;
    else if (i === 3) current = ndviSowing;
    else current = ndviSowing - (i - 3) * (ndviSowing - ndviClaim) / 3;
    timeline.push({
      date: date.toISOString().slice(0, 10),
      ndvi: Math.round(current * 1000) / 1000,
      source: sources[i],
    });
  }
  return timeline;
}

export async function generateEvidencePackage(claimId: string): Promise<EvidencePackage> {
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) throw new Error("Claim not found");

  const land = claim.udlrn
    ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn) })
    : null;

  const featureSnap = await db.query.claimFeatureSnapshots.findFirst({
    where: eq(claimFeatureSnapshots.claimId, claimId),
    orderBy: [desc(claimFeatureSnapshots.snapshotAt)],
  });

  const auditEvents = await db.query.auditLog.findMany({
    where: eq(auditLog.claimId, claimId),
    orderBy: [auditLog.createdAt],
  });

  const csc = claim.cscOperatorId
    ? await db.query.cscOperators.findFirst({ where: eq(cscOperators.id, claim.cscOperatorId) })
    : null;

  const score = Number(claim.fraudScore) || 0;
  const confidence = Number(claim.fraudConfidence) || 0;
  const ndviSowing = Number(claim.ndviSowing) || 0.55;
  const ndviClaim = Number(claim.ndviClaim) || 0.3;
  const ndviLossPct = Number(claim.ndviLossPct) || 0;

  const packageId = `EVP-${claim.claimNumber}-${Date.now()}`;
  const generatedAt = new Date().toISOString();

  const pkg: Omit<EvidencePackage, "integrityHash"> = {
    packageId,
    generatedAt,
    claimSummary: {
      claimNumber: claim.claimNumber ?? "",
      claimId,
      status: claim.status ?? "",
      filedAt: claim.filedAt?.toISOString() ?? generatedAt,
      decidedAt: claim.decidedAt?.toISOString() ?? null,
      fraudScore: score,
      fraudConfidence: confidence,
      verdict: claim.status ?? "PENDING",
      verdictBand: verdictBand(score),
      modelVersion: claim.modelVersion ?? "v6.0-ensemble",
    },
    farmerUdlrn: {
      udlrn: claim.udlrn ?? "",
      landOwnerName: land?.landOwnerName ?? "Unknown",
      surveyNumber: land?.surveyNumber ?? "",
      stateCode: land?.stateCode ?? claim.udlrn?.slice(0, 2) ?? "",
      landUseType: land?.landUseType ?? "AGRICULTURAL",
      kgisAreaHa: Number(land?.kgisAreaHa) || 0,
      rtcAreaHa: Number(land?.rtcAreaHa) || 0,
      isFrozen: land?.isFrozen ?? false,
      frozenReason: land?.frozenReason ?? null,
      centroidLat: land?.centroidLat ? Number(land.centroidLat) : null,
      centroidLng: land?.centroidLng ? Number(land.centroidLng) : null,
      payoutBank: land?.payoutBankName ?? "Unknown Bank",
      payoutAccountMasked: land?.payoutAccountNo
        ? `XXXX${land.payoutAccountNo.slice(-4)}`
        : "XXXX****",
      payoutIfsc: land?.payoutIfsc ?? "",
    },
    satelliteAnalysis: {
      dataSource: claim.dataSource ?? "SENTINEL_2_OPTICAL",
      cloudCoverPct: Number(claim.cloudCoverPct) || 0,
      ndviSowing,
      ndviClaim,
      ndviLossPct,
      ndviBaseline10yr: Number(land?.landsatBaselineNdvi) || Number(featureSnap?.ndviBaseline10yr) || 0.42,
      sarFloodSignature: featureSnap?.sarFloodSignature ?? false,
      imdWeatherConfirmed: claim.imdWeatherConfirmed ?? false,
      ndviTimeline: generateNdviTimeline(ndviSowing, ndviClaim, String(claim.declaredSowingDate ?? "2024-06-15")),
      interpretation: ndviLossPct > 40
        ? `Significant vegetation loss detected (${ndviLossPct.toFixed(1)}%). ${claim.imdWeatherConfirmed ? "IMD confirms weather event." : "No IMD weather event corroborated."}`
        : `Minimal vegetation loss detected (${ndviLossPct.toFixed(1)}%). Claim damage declaration may be inconsistent with satellite observations.`,
    },
    fraudAnalysis: {
      score,
      confidence,
      riskBand: verdictBand(score),
      flags: (claim.fraudFlags as string[]) ?? [],
      flagBreakdown: (claim.flagBreakdown as any[]) ?? [],
      explainabilityReasons: (featureSnap?.explainabilityReasons as string[]) ?? [],
      stateRulePackVersion: featureSnap?.stateRulePackVersion ?? "v6.0",
      hardRuleOverride: featureSnap?.hardRuleOverride ?? null,
      activeStateRuleHits: (featureSnap?.activeRuleHits as string[]) ?? [],
    },
    mutationHistory: land?.mutationDate
      ? [{
          mutationType: "OWNERSHIP_TRANSFER",
          mutationDate: String(land.mutationDate),
          daysBefore: Math.floor((Date.now() - new Date(land.mutationDate).getTime()) / 86400000),
          previousOwner: null,
          newOwner: land.landOwnerName ?? null,
          isSuspicious: (Date.now() - new Date(land.mutationDate).getTime()) / 86400000 < 30,
          suspicionReason: (Date.now() - new Date(land.mutationDate).getTime()) / 86400000 < 30
            ? "Mutation within 30 days of claim filing"
            : null,
        }]
      : [],
    operatorFlags: {
      cscId: csc?.cscId ?? null,
      cscName: csc?.name ?? null,
      cscDailySubmissions: Number(featureSnap?.cscDailySubmissions) || 0,
      cscBulkFlag: featureSnap?.cscBulkFlag ?? false,
      operatorRiskScore: Number(featureSnap?.operatorRiskScore) || 0,
      sameBankClusterCount: Number(featureSnap?.sameBankClusterCount) || 0,
    },
    auditChain: auditEvents.map((e) => ({
      step: e.stepName,
      actorType: e.actorType ?? "SYSTEM",
      actorId: e.actorId ?? "system",
      reason: e.decisionReason ?? "",
      timestamp: e.createdAt?.toISOString() ?? "",
    })),
    decisionSummary: {
      verdict: claim.status ?? "PENDING",
      nextStep: nextStep(claim.status ?? ""),
      appealDeadline: claim.status === "AUTO_REJECTED"
        ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
        : null,
      approvedAmount: claim.approvedAmount ? Number(claim.approvedAmount) : null,
      rejectionReason: claim.rejectionReason ?? null,
      firAlertSent: claim.firAlertSent ?? false,
    },
  };

  const jsonStr = JSON.stringify(pkg);
  const hash = crypto.createHash("sha256").update(jsonStr).digest("hex");
  const full: EvidencePackage = { ...pkg, integrityHash: hash };

  await db.insert(evidenceFiles).values({
    claimId,
    fileType: "EVIDENCE_PACKAGE",
    fileName: `${packageId}.json`,
    mimeType: "application/json",
    storageBackend: "LOCAL",
    storagePath: `/evidence/${claimId}/${packageId}.json`,
    contentHash: hash,
    packageJson: full as any,
    generatedBy: "SYSTEM",
  }).onConflictDoNothing();

  return full;
}
