import { Router } from "express";
import { db } from "@workspace/db";
import { claims, claimFeatureSnapshots } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";
import { processClaim } from "../lib/claim-pipeline";

const router = Router();

function buildExplanation(score: number, features: Record<string, unknown>) {
  const topFactors = [];

  if (Number(features["ndvi_loss_contradiction"] ?? 0) > 0) {
    topFactors.push({ feature: "ndvi_loss_contradiction", weight: 0.31, description: "NDVI shows healthy crop but high loss claimed" });
  }
  if (Number(features["csc_bulk_filing_flag"] ?? 0) > 0) {
    topFactors.push({ feature: "csc_bulk_filing_flag", weight: 0.22, description: "CSC operator filed multiple claims in short window" });
  }
  if (Number(features["recent_mutation_flag"] ?? 0) > 0) {
    topFactors.push({ feature: "recent_mutation_flag", weight: 0.18, description: "Land mutation within 90 days of filing" });
  }
  if (Number(features["bank_cluster_flag"] ?? 0) > 0) {
    topFactors.push({ feature: "bank_cluster_flag", weight: 0.15, description: "Same bank account linked to multiple claims" });
  }
  if (Number(features["duplicate_policy_flag"] ?? 0) > 0) {
    topFactors.push({ feature: "duplicate_policy_flag", weight: 0.14, description: "Duplicate policy detected for same parcel-season" });
  }

  if (topFactors.length === 0) {
    topFactors.push({ feature: "ndvi_drop_magnitude", weight: 0.28, description: "NDVI drop magnitude consistent with claimed loss" });
  }

  const ruleHits = topFactors.map((f) => {
    const cat = f.feature.startsWith("ndvi") ? "SATELLITE" :
                f.feature.startsWith("csc") ? "OPERATOR" :
                f.feature.startsWith("bank") ? "FINANCIAL" : "LAND";
    return `${cat}_RULE_${f.feature.toUpperCase()}`;
  });

  return { topFactors, ruleHits };
}

// POST /api/v1/scoring/score — trigger scoring for a claim
router.post("/score", requireAdmin, async (req, res) => {
  const { claimId } = req.body as { claimId: string };
  if (!claimId) return fail(res, "claimId required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) return fail(res, "Claim not found", 404);

  try {
    await processClaim(claimId);
    const updated = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
    const snap = await db.query.claimFeatureSnapshots.findFirst({ where: eq(claimFeatureSnapshots.claimId, claimId) });
    const features = (snap?.features as Record<string, unknown>) ?? {};
    const score = Number(updated?.fraudScore ?? 0);
    const { topFactors, ruleHits } = buildExplanation(score, features);

    return ok(res, {
      claimId,
      score,
      verdict: updated?.verdict ?? "REVIEW",
      modelVersion: "v6.0-ensemble",
      explanation: { topFactors },
      ruleHits,
      scoredAt: updated?.scoredAt ?? new Date().toISOString(),
    });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// GET /api/v1/scoring/:claimId — full scoring detail
router.get("/:claimId", requireAdmin, async (req, res) => {
  const { claimId } = req.params;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) return fail(res, "Claim not found", 404);
  if (!claim.fraudScore) return fail(res, "Claim has not been scored yet", 404);

  const snap = await db.query.claimFeatureSnapshots.findFirst({ where: eq(claimFeatureSnapshots.claimId, claimId) });
  const features = (snap?.features as Record<string, unknown>) ?? {};
  const score = Number(claim.fraudScore);
  const { topFactors, ruleHits } = buildExplanation(score, features);

  const scoreBand = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : score <= 80 ? "HIGH" : "CRITICAL";
  const cropScore = score * 0.35;
  const anomalyScore = score * 0.40;
  const timelineScore = score * 0.25;

  return ok(res, {
    claimId,
    claimNumber: claim.claimNumber,
    score,
    verdict: claim.verdict ?? "REVIEW",
    scoreBand,
    modelVersion: claim.modelVersion ?? "v6.0-ensemble",
    explanation: { topFactors },
    ruleHits,
    ensembleComponents: {
      cropClassificationModel: { score: Number(cropScore.toFixed(1)), weight: 0.35 },
      anomalyDetectionModel: { score: Number(anomalyScore.toFixed(1)), weight: 0.40 },
      timelineValidationModel: { score: Number(timelineScore.toFixed(1)), weight: 0.25 },
    },
    scoredAt: claim.scoredAt ?? null,
    featureVersion: snap?.featureVersion ?? "v6.0",
  });
});

// GET /api/v1/scoring/:claimId/features — feature snapshot
router.get("/:claimId/features", requireAdmin, async (req, res) => {
  const { claimId } = req.params;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) return fail(res, "Claim not found", 404);

  const snap = await db.query.claimFeatureSnapshots.findFirst({ where: eq(claimFeatureSnapshots.claimId, claimId) });
  if (!snap) return fail(res, "No feature snapshot found for this claim", 404);

  return ok(res, {
    claimId,
    featureVersion: snap.featureVersion ?? "v6.0",
    generatedAt: snap.createdAt,
    features: snap.features,
  });
});

export default router;
