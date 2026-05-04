import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import {
  claims,
  udlrnMaster,
  farmers,
  udlrnSeasonLock,
  notifications,
  claimAppeals,
  auditLog,
  claimDocuments,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { requireFarmer } from "../middlewares/auth";
import { processClaim } from "../lib/claim-pipeline";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

function generateClaimNumber(): string {
  const now = new Date();
  const yr = now.getFullYear().toString().slice(-2);
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `PMFBY${yr}${mo}${rand}`;
}

// POST /api/v1/claims/file (legacy endpoint - redirects to new two-step flow)
router.post("/file", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const {
    udlrn,
    declaredCrop,
    sowingDate,
    damageType,
    damageDate,
    claimAmountRequested,
    season,
    seasonType,
    insurerCode,
  } = req.body as Record<string, string | number>;

  if (!udlrn || !declaredCrop || !sowingDate || !damageType || !damageDate || !claimAmountRequested || !season || !seasonType) {
    return fail(res, "Missing required fields", 400);
  }

  // Verify UDLRN belongs to this farmer
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, String(udlrn)) });
  if (!land || land.farmerId !== farmerId) return fail(res, "UDLRN not found or unauthorized", 403);

  if (land.isFrozen) return fail(res, `UDLRN is frozen: ${land.frozenReason}`, 403, "UDLRN_FROZEN");

  // Check duplicate (season lock)
  const seasonCode = `${season}-${seasonType}`;
  const lock = await db.query.udlrnSeasonLock.findFirst({
    where: and(eq(udlrnSeasonLock.udlrn, String(udlrn)), eq(udlrnSeasonLock.seasonCode, seasonCode)),
  });
  if (lock) return fail(res, "Claim already filed for this UDLRN and season", 409, "DUPLICATE_CLAIM");

  const claimNumber = generateClaimNumber();
  const [claim] = await db.insert(claims).values({
    claimNumber,
    udlrn: String(udlrn),
    farmerId,
    insurerCode: insurerCode ? String(insurerCode) : undefined,
    season: String(season),
    seasonType: String(seasonType),
    damageType: String(damageType),
    damageDate: String(damageDate),
    declaredSowingDate: String(sowingDate),
    declaredCrop: String(declaredCrop),
    claimAmountRequested: String(claimAmountRequested),
    status: "DRAFT",
    pipelineStage: "DRAFT",
    traceId: req.traceId || "",
  }).returning();

  if (!claim) return fail(res, "Failed to create claim", 500);

  // Audit log
  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: String(udlrn),
    stepName: "CLAIM_DRAFTED",
    actorId: farmerId,
    actorType: "FARMER",
    inputSnapshot: req.body as object,
    outputSnapshot: { claimId: claim.id, claimNumber },
    decisionReason: "Claim drafted by farmer",
  });

  // Send notification
  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  if (farmer) {
    await db.insert(notifications).values({
      farmerId,
      recipientMobile: farmer.mobile,
      claimId: claim.id,
      notificationType: "CLAIM_DRAFTED",
      title: "Claim Draft Created",
      message: `Your claim ${claimNumber} has been created as a draft. Review and submit when ready.`,
      channel: "IN_APP",
    });
  }

  return ok(res, {
    claimId: claim.id,
    claimNumber,
    status: "DRAFT",
    message: `Claim ${claimNumber} drafted successfully. Submit when ready to begin processing.`,
  }, 201);
});

// GET /api/v1/claims/my-claims
router.get("/my-claims", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const myClaims = await db.query.claims.findMany({
    where: eq(claims.farmerId, farmerId),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 50,
  });
  return ok(res, myClaims.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    udlrn: c.udlrn,
    declaredCrop: c.declaredCrop,
    damageType: c.damageType,
    fraudScore: c.fraudScore,
    status: c.status,
    filedAt: c.filedAt,
    decidedAt: c.decidedAt,
    approvedAmount: c.approvedAmount,
  })));
});

// GET /api/v1/claims/status/:id
router.get("/status/:id", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);
  return ok(res, {
    id: claim.id,
    claimNumber: claim.claimNumber,
    status: claim.status,
    pipelineStage: claim.pipelineStage,
    declaredCrop: claim.declaredCrop,
    damageType: claim.damageType,
    filedAt: claim.filedAt,
    decidedAt: claim.decidedAt,
    approvedAmount: claim.approvedAmount,
    rejectionReason: claim.rejectionReason,
    dbtStatus: claim.dbtStatus,
  });
});

// GET /api/v1/claims — general list (spec 3.4: ?farmerId&status&page&size)
router.get("/", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const { status, page: pageStr, size: sizeStr } = req.query as Record<string, string>;
  const page = Number(pageStr ?? 1);
  const size = Math.min(100, Number(sizeStr ?? 20));

  const myClaims = await db.query.claims.findMany({
    where: eq(claims.farmerId, farmerId),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: size,
    offset: (page - 1) * size,
  });

  const filtered = status ? myClaims.filter((c) => c.status === status) : myClaims;
  return ok(res, {
    data: filtered.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      udlrn: c.udlrn,
      declaredCrop: c.declaredCrop,
      damageType: c.damageType,
      fraudScore: c.fraudScore,
      status: c.status,
      verdict: c.verdict,
      claimAmountRequested: c.claimAmountRequested,
      approvedAmount: c.approvedAmount,
      filedAt: c.filedAt,
      decidedAt: c.decidedAt,
    })),
    page,
    size,
    total: filtered.length,
  });
});

// GET /api/v1/claims/:id — single claim detail
router.get("/:id", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);
  return ok(res, {
    id: claim.id, claimNumber: claim.claimNumber, udlrn: claim.udlrn, status: claim.status,
    pipelineStage: claim.pipelineStage, declaredCrop: claim.declaredCrop, damageType: claim.damageType,
    season: claim.season, seasonType: claim.seasonType, filedAt: claim.filedAt,
    decidedAt: claim.decidedAt, approvedAmount: claim.approvedAmount, rejectionReason: claim.rejectionReason,
    fraudScore: claim.fraudScore, verdict: claim.verdict, claimAmountRequested: claim.claimAmountRequested,
    ndviSowing: claim.ndviSowing, ndviClaim: claim.ndviClaim, ndviLossPct: claim.ndviLossPct,
    trueColorUrl: claim.trueColorUrl, ndviMapUrl: claim.ndviMapUrl, lossMapUrl: claim.lossMapUrl,
    dbtStatus: claim.dbtStatus, modelVersion: claim.modelVersion,
  });
});

// PATCH /api/v1/claims/:id — update claim (only DRAFT claims)
router.patch("/:id", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const claimId = req.params["id"]!;

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);

  if (claim.status !== "DRAFT" && claim.status !== "FILED") {
    return fail(res, "Only DRAFT or FILED claims can be updated", 400, "INVALID_STATUS");
  }

  const {
    declaredCrop,
    damageType,
    damageDate,
    claimAmountRequested,
    declaredSowingDate,
  } = req.body as {
    declaredCrop?: string;
    damageType?: string;
    damageDate?: string;
    claimAmountRequested?: string;
    declaredSowingDate?: string;
  };

  const updateData: any = {};
  if (declaredCrop !== undefined) updateData.declaredCrop = declaredCrop;
  if (damageType !== undefined) updateData.damageType = damageType;
  if (damageDate !== undefined) updateData.damageDate = damageDate;
  if (claimAmountRequested !== undefined) updateData.claimAmountRequested = claimAmountRequested;
  if (declaredSowingDate !== undefined) updateData.declaredSowingDate = declaredSowingDate;

  if (Object.keys(updateData).length === 0) {
    return fail(res, "No fields to update", 400);
  }

  await db.update(claims).set(updateData).where(eq(claims.id, claimId));

  const updated = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  return ok(res, {
    id: updated!.id,
    claimNumber: updated!.claimNumber,
    status: updated!.status,
    declaredCrop: updated!.declaredCrop,
    damageType: updated!.damageType,
    damageDate: updated!.damageDate,
    claimAmountRequested: updated!.claimAmountRequested,
    declaredSowingDate: updated!.declaredSowingDate,
  });
});

// POST /api/v1/claims/:id/submit — submit DRAFT claim for processing
router.post("/:id/submit", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const claimId = req.params["id"]!;

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);

  if (claim.status !== "DRAFT") {
    return fail(res, "Only DRAFT claims can be submitted", 400, "INVALID_STATUS");
  }

  // Check season lock before submitting
  const seasonCode = `${claim.season}-${claim.seasonType}`;
  const lock = await db.query.udlrnSeasonLock.findFirst({
    where: and(eq(udlrnSeasonLock.udlrn, claim.udlrn!), eq(udlrnSeasonLock.seasonCode, seasonCode)),
  });
  if (lock) return fail(res, "Claim already filed for this UDLRN and season", 409, "DUPLICATE_CLAIM");

  // Get land for state code
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn!) });
  if (land?.isFrozen) return fail(res, `UDLRN is frozen: ${land.frozenReason}`, 403, "UDLRN_FROZEN");

  // Update claim to FILED status
  await db.update(claims).set({
    status: "FILED",
    pipelineStage: "INGESTION",
    filedAt: new Date(),
  }).where(eq(claims.id, claimId));

  // Create season lock
  await db.insert(udlrnSeasonLock).values({
    udlrn: claim.udlrn!,
    seasonCode,
    stateCode: land?.stateCode ?? undefined,
    claimId: claim.id,
  });

  // Audit log
  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: claim.udlrn ?? undefined,
    stepName: "CLAIM_SUBMITTED",
    actorId: farmerId,
    actorType: "FARMER",
    outputSnapshot: { claimId: claim.id, claimNumber: claim.claimNumber },
    decisionReason: "Claim submitted by farmer",
  });

  // Send notification
  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  if (farmer) {
    await db.insert(notifications).values({
      farmerId,
      recipientMobile: farmer.mobile,
      claimId: claim.id,
      notificationType: "CLAIM_FILED",
      title: "Claim Submitted Successfully",
      message: `Your claim ${claim.claimNumber} has been submitted. We will process it shortly.`,
      channel: "IN_APP",
    });
  }

  // Trigger async processing pipeline (non-blocking)
  setImmediate(() => processClaim(claim.id).catch(console.error));

  return ok(res, {
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    status: "FILED",
    message: `Claim ${claim.claimNumber} submitted successfully. Processing in progress.`,
  });
});

// GET /api/v1/claims/:id/documents — claim documents (spec 3.4)
router.get("/:id/documents", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);
  
  const docs = await db.query.claimDocuments.findMany({
    where: eq(claimDocuments.claimId, claim.id),
  });
  
  return ok(res, {
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    documents: docs.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      uploadedAt: d.createdAt,
    })),
  });
});

// POST /api/v1/claims/:id/documents — multipart file upload
router.post("/:id/documents", requireFarmer, upload.array("documents", 10), async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const claimId = req.params["id"]!;

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return fail(res, "No files uploaded", 400);
  }

  const uploadedDocs: any[] = [];

  for (const file of files) {
    const fileKey = `claims/${claimId}/${Date.now()}-${file.originalname}`;
    
    const [doc] = await db.insert(claimDocuments).values({
      claimId: claim.id,
      fileKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: farmerId,
    }).returning();

    if (doc) {
      uploadedDocs.push({
        id: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
      });
    }
  }

  return ok(res, {
    message: `${uploadedDocs.length} document(s) uploaded successfully`,
    documents: uploadedDocs,
  }, 201);
});

// POST /api/v1/claims/appeal/:id
router.post("/appeal/:id", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const { appealText } = req.body as { appealText: string };
  if (!appealText) return fail(res, "appealText required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim || claim.farmerId !== farmerId) return fail(res, "Claim not found", 404);
  if (!["REJECTED_FRAUD", "REJECTED"].includes(claim.status ?? "")) {
    return fail(res, "Only rejected claims can be appealed", 400);
  }

  const [appeal] = await db.insert(claimAppeals).values({
    claimId: claim.id,
    farmerId,
    appealText,
    status: "SUBMITTED",
  }).returning();

  await db.update(claims).set({ status: "APPEALED" }).where(eq(claims.id, claim.id));

  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: claim.udlrn ?? undefined,
    stepName: "APPEAL_SUBMITTED",
    actorId: farmerId,
    actorType: "FARMER",
    outputSnapshot: { appealId: appeal!.id },
    decisionReason: appealText,
  });

  return ok(res, { message: "Appeal submitted successfully", appealId: appeal!.id }, 201);
});

export default router;
