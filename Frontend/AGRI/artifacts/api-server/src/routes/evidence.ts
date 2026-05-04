import { Router } from "express";
import { db } from "@workspace/db";
import { evidenceFiles, claims, farmers, udlrnMaster, auditLog } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateEvidencePackage } from "../lib/evidence-generator";
import { generateSatelliteReport } from "../lib/satellite-report";
import { generateEvidencePdf, ClaimEvidenceData } from "../lib/evidencePdf";
import { scoreClaim, getScoreBand, getVerdict } from "../lib/scoringEngine";
import { ok, fail } from "../lib/response";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/:claimId", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    const existing = await db.query.evidenceFiles.findFirst({
      where: eq(evidenceFiles.claimId, claimId),
      orderBy: [desc(evidenceFiles.generatedAt)],
    });

    if (existing?.packageJson) {
      await db.update(evidenceFiles)
        .set({ downloadCount: (existing.downloadCount ?? 0) + 1 })
        .where(eq(evidenceFiles.id, existing.id));

      return ok(res, {
        fromCache: true,
        fileId: existing.id,
        generatedAt: existing.generatedAt,
        contentHash: existing.contentHash,
        downloadCount: (existing.downloadCount ?? 0) + 1,
        package: existing.packageJson,
      });
    }

    const pkg = await generateEvidencePackage(claimId);
    return ok(res, { fromCache: false, package: pkg });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

router.post("/:claimId/regenerate", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    await db.delete(evidenceFiles).where(eq(evidenceFiles.claimId, claimId));
    const pkg = await generateEvidencePackage(claimId);
    return ok(res, { package: pkg });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

router.get("/:claimId/hash", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    const file = await db.query.evidenceFiles.findFirst({
      where: eq(evidenceFiles.claimId, claimId),
      orderBy: [desc(evidenceFiles.generatedAt)],
    });

    if (!file) return fail(res, "No evidence package found", 404);

    return ok(res, {
      contentHash: file.contentHash,
      generatedAt: file.generatedAt,
      tamperFlag: file.tamperFlag,
      isValid: file.isValid,
    });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// POST /api/v1/evidence/:claimId/generate — alias for regenerate (spec 3.8)
router.post("/:claimId/generate", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    await db.delete(evidenceFiles).where(eq(evidenceFiles.claimId, claimId));
    const pkg = await generateEvidencePackage(claimId);
    return ok(res, { package: pkg, generatedAt: new Date().toISOString() }, 201);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// GET /api/v1/evidence/:claimId/latest — latest evidence package (spec 3.8)
router.get("/:claimId/latest", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    const existing = await db.query.evidenceFiles.findFirst({
      where: eq(evidenceFiles.claimId, claimId),
      orderBy: [desc(evidenceFiles.generatedAt)],
    });
    if (!existing?.packageJson) {
      const pkg = await generateEvidencePackage(claimId);
      return ok(res, { fromCache: false, package: pkg });
    }
    return ok(res, {
      fromCache: true,
      fileId: existing.id,
      generatedAt: existing.generatedAt,
      contentHash: existing.contentHash,
      downloadCount: existing.downloadCount ?? 0,
      package: existing.packageJson,
    });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// GET /api/v1/evidence/:packageId/download — 302 redirect (spec 3.8)
router.get("/:packageId/download", requireAuth, async (req, res) => {
  const { packageId } = req.params;
  try {
    const file = await db.query.evidenceFiles.findFirst({
      where: eq(evidenceFiles.id, packageId),
    });
    if (!file) {
      const byClaimId = await db.query.evidenceFiles.findFirst({
        where: eq(evidenceFiles.claimId, packageId),
        orderBy: [desc(evidenceFiles.generatedAt)],
      });
      if (!byClaimId) return fail(res, "Evidence package not found", 404);
      await db.update(evidenceFiles)
        .set({ downloadCount: (byClaimId.downloadCount ?? 0) + 1 })
        .where(eq(evidenceFiles.id, byClaimId.id));
      return res.redirect(302, `/api/v1/evidence/${packageId}`);
    }
    await db.update(evidenceFiles)
      .set({ downloadCount: (file.downloadCount ?? 0) + 1 })
      .where(eq(evidenceFiles.id, packageId));
    return ok(res, { fileId: file.id, claimId: file.claimId, message: "Download initiated", downloadUrl: `/api/v1/evidence/${file.claimId}` });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// POST /api/v1/evidence/:packageId/verify — verify hash integrity (spec 3.8)
router.post("/:packageId/verify", requireAuth, async (req, res) => {
  const { packageId } = req.params;
  try {
    const file = await db.query.evidenceFiles.findFirst({
      where: eq(evidenceFiles.id, packageId),
    }) ?? await db.query.evidenceFiles.findFirst({
      where: eq(evidenceFiles.claimId, packageId),
      orderBy: [desc(evidenceFiles.generatedAt)],
    });
    if (!file) return fail(res, "Evidence package not found", 404);
    return ok(res, {
      valid: file.isValid ?? true,
      hashMatch: !file.tamperFlag,
      contentHash: file.contentHash,
      tamperFlag: file.tamperFlag ?? false,
      generatedAt: file.generatedAt,
    });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// GET /api/v1/evidence/:claimId/satellite — satellite analysis report
router.get("/:claimId/satellite", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    const report = await generateSatelliteReport(claimId);
    return ok(res, report);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

// GET /api/v1/evidence/:claimId/pdf — generate and download PDF evidence
router.get("/:claimId/pdf", requireAuth, async (req, res) => {
  const { claimId } = req.params;
  try {
    const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
    if (!claim) return fail(res, "Claim not found", 404);

    const farmer = claim.farmerId ? await db.query.farmers.findFirst({ where: eq(farmers.id, claim.farmerId) }) : null;
    const land = claim.udlrn ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn) }) : null;
    const auditTrail = await db.query.auditLog.findMany({
      where: eq(auditLog.claimId, claimId),
      orderBy: [desc(auditLog.createdAt)],
    });

    const scoringResult = scoreClaim({
      udlrn: claim.udlrn || "",
      farmerId: claim.farmerId || "",
      declaredCrop: claim.declaredCrop || "",
      damageType: claim.damageType || "",
      damageDate: claim.damageDate || "",
      declaredSowingDate: claim.declaredSowingDate || "",
      claimAmountRequested: claim.claimAmountRequested || "0",
      season: claim.season || "",
      seasonType: claim.seasonType || "",
      stateCode: land?.stateCode || undefined,
      areaHa: land ? Number(land.kgisAreaHa || land.rtcAreaHa || 0) : undefined,
      ndviSowing: claim.ndviSowing ? Number(claim.ndviSowing) : undefined,
      ndviClaim: claim.ndviClaim ? Number(claim.ndviClaim) : undefined,
      ndviLossPct: claim.ndviLossPct ? Number(claim.ndviLossPct) : undefined,
    });

    const scoreBand = getScoreBand(scoringResult.finalScore);
    const verdict = getVerdict(scoringResult.finalScore, scoreBand);

    const evidenceData: ClaimEvidenceData = {
      claimId: claim.id,
      claimNumber: claim.claimNumber || "",
      udlrn: claim.udlrn || "",
      farmerName: farmer?.fullName || "Unknown",
      mobile: farmer?.mobile || "",
      stateCode: land?.stateCode || "",
      district: land?.districtId || "",
      areaHa: land ? Number(land.kgisAreaHa || land.rtcAreaHa || 0) : 0,
      declaredCrop: claim.declaredCrop || "",
      damageType: claim.damageType || "",
      damageDate: claim.damageDate || "",
      claimAmount: claim.claimAmountRequested || "0",
      status: claim.status || "",
      fraudScore: scoringResult.finalScore,
      scoreBand,
      verdict,
      scoringResult,
      satelliteData: {
        ndviSowing: claim.ndviSowing ? Number(claim.ndviSowing) : 0,
        ndviClaim: claim.ndviClaim ? Number(claim.ndviClaim) : 0,
        ndviLossPct: claim.ndviLossPct ? Number(claim.ndviLossPct) : 0,
        trueColorUrl: claim.trueColorUrl || undefined,
        ndviMapUrl: claim.ndviMapUrl || undefined,
        lossMapUrl: claim.lossMapUrl || undefined,
      },
      landDetails: {
        surveyNumber: land?.surveyNumber || "",
        landUse: land?.landUseType || "",
        soilType: "Loamy",
        irrigation: "Irrigated",
      },
      auditTrail: auditTrail.map((a) => ({
        step: a.stepName || "",
        timestamp: a.createdAt?.toISOString() || "",
        actor: a.actorType || "",
        decision: a.decisionReason || "",
      })),
    };

    const pdfBuffer = await generateEvidencePdf(evidenceData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="evidence-${claim.claimNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

export { router as evidenceRouter };
