import { db } from "@workspace/db";
import { claims, udlrnMaster, claimFeatureSnapshots } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface SatelliteReport {
  claimId: string;
  claimNumber: string;
  dataSource: string;
  sensorType: string;
  acquisitionDate: string;
  cloudCoverPct: number;
  ndviSowing: number;
  ndviClaim: number;
  ndviLossPct: number;
  ndviBaseline10yr: number;
  ndviTimeline: Array<{ date: string; ndvi: number; source: string }>;
  sarFloodSignature: boolean;
  imdWeatherConfirmed: boolean;
  imdDisasterType?: string;
  interpretation: string;
  beforeImage: string;
  afterImage: string;
  qualityFlags: string[];
  centroidLat?: number;
  centroidLng?: number;
  landAreaHa?: number;
  historicalCrops?: string[];
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

function generateImageUrls(claimId: string, udlrn: string, sowingDate: string, claimDate: string): { before: string; after: string } {
  // Generate deterministic image paths based on claim data
  const hash = crypto.createHash("md5").update(`${claimId}-${udlrn}-${sowingDate}`).digest("hex").slice(0, 8);
  const hash2 = crypto.createHash("md5").update(`${claimId}-${udlrn}-${claimDate}`).digest("hex").slice(0, 8);
  
  return {
    before: `/storage/satellite/${udlrn}/before_${hash}.png`,
    after: `/storage/satellite/${udlrn}/after_${hash2}.png`,
  };
}

export async function generateSatelliteReport(claimIdOrUdlrn: string): Promise<SatelliteReport> {
  // Try by claim ID first, then by UDLRN
  let claim = null;
  try {
    claim = await db.query.claims.findFirst({ where: eq(claims.id, claimIdOrUdlrn) });
  } catch {
    // Not a valid UUID, try UDLRN instead
  }
  if (!claim) {
    claim = await db.query.claims.findFirst({ where: eq(claims.udlrn, claimIdOrUdlrn) });
  }
  if (!claim) throw new Error("Claim not found");

  const claimId = claim.id;

  const land = claim.udlrn
    ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn) })
    : null;

  const featureSnap = await db.query.claimFeatureSnapshots.findFirst({
    where: eq(claimFeatureSnapshots.claimId, claimId),
  });

  const ndviSowing = Number(claim.ndviSowing) || 0.55;
  const ndviClaim = Number(claim.ndviClaim) || 0.3;
  const ndviLossPct = Number(claim.ndviLossPct) || 0;
  const cloudCoverPct = Number(claim.cloudCoverPct) || 0;

  const imageUrls = generateImageUrls(
    claimId,
    claim.udlrn || "",
    String(claim.declaredSowingDate || "2024-06-15"),
    String(claim.damageDate || "2024-08-15")
  );

  const qualityFlags: string[] = [];
  if (cloudCoverPct > 50) qualityFlags.push("HIGH_CLOUD_COVER");
  if (ndviSowing < 0.2) qualityFlags.push("LOW_BASELINE_NDVI");
  if (claim.dataSource?.includes("SAR")) qualityFlags.push("SAR_FALLBACK_USED");
  if (!claim.imdWeatherConfirmed) qualityFlags.push("NO_IMD_CORROBORATION");

  const report: SatelliteReport = {
    claimId,
    claimNumber: claim.claimNumber ?? "",
    dataSource: claim.dataSource ?? "SENTINEL_2_OPTICAL",
    sensorType: claim.dataSource?.includes("SAR") ? "Synthetic Aperture Radar" : "Optical Multi-Spectral",
    acquisitionDate: String(claim.damageDate || claim.satelliteProcessedAt || new Date().toISOString().slice(0, 10)),
    cloudCoverPct,
    ndviSowing,
    ndviClaim,
    ndviLossPct,
    ndviBaseline10yr: Number(land?.landsatBaselineNdvi) || Number(featureSnap?.ndviBaseline10yr) || 0.42,
    ndviTimeline: generateNdviTimeline(ndviSowing, ndviClaim, String(claim.declaredSowingDate ?? "2024-06-15")),
    sarFloodSignature: featureSnap?.sarFloodSignature ?? false,
    imdWeatherConfirmed: claim.imdWeatherConfirmed ?? false,
    imdDisasterType: claim.imdDisasterType ?? undefined,
    interpretation: ndviLossPct > 40
      ? `Significant vegetation loss detected (${ndviLossPct.toFixed(1)}%). ${claim.imdWeatherConfirmed ? `IMD confirms ${claim.imdDisasterType || "weather event"}.` : "No IMD weather event corroborated."}`
      : `Minimal vegetation loss detected (${ndviLossPct.toFixed(1)}%). Claim damage declaration may be inconsistent with satellite observations.`,
    beforeImage: imageUrls.before,
    afterImage: imageUrls.after,
    qualityFlags,
    centroidLat: land?.centroidLat ? Number(land.centroidLat) : undefined,
    centroidLng: land?.centroidLng ? Number(land.centroidLng) : undefined,
    landAreaHa: land?.kgisAreaHa ? Number(land.kgisAreaHa) : undefined,
    historicalCrops: land?.historicalCrops as string[] ?? [],
  };

  return report;
}
