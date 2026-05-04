import { Router } from "express";
import { db } from "@workspace/db";
import { farmers, claims, udlrnMaster } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /api/v1/farmers/:id — farmer detail for admin/insurer
router.get("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, id) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  return ok(res, {
    id: farmer.id,
    fullName: farmer.fullName,
    mobile: farmer.mobile,
    email: farmer.email,
    aadhaarLastFour: farmer.aadhaarHash ? farmer.aadhaarHash.slice(-4) : "****",
    stateCode: farmer.stateCode,
    districtCode: farmer.districtCode,
    isBlacklisted: farmer.isBlacklisted,
    blacklistReason: farmer.blacklistReason,
    createdAt: farmer.createdAt,
  });
});

// GET /api/v1/farmers/:id/claims — paginated claims for farmer (admin view)
router.get("/:id/claims", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, page: pageStr, size: sizeStr } = req.query as Record<string, string>;
  const page = Number(pageStr ?? 1);
  const size = Math.min(100, Number(sizeStr ?? 20));

  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, id) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  const allClaims = await db.query.claims.findMany({
    where: eq(claims.farmerId, id),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: size,
    offset: (page - 1) * size,
  });

  const filtered = status ? allClaims.filter((c) => c.status === status) : allClaims;

  return ok(res, {
    data: filtered.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      udlrn: c.udlrn,
      status: c.status,
      declaredCrop: c.declaredCrop,
      fraudScore: c.fraudScore,
      verdict: c.verdict,
      claimAmountRequested: c.claimAmountRequested,
      approvedAmount: c.approvedAmount,
      filedAt: c.filedAt,
    })),
    page,
    size,
    total: filtered.length,
  });
});

// GET /api/v1/farmers/:id/parcels — parcels for farmer
router.get("/:id/parcels", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, id) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  const parcels = await db.query.udlrnMaster.findMany({
    where: eq(udlrnMaster.farmerId, id),
  });

  return ok(res, parcels.map((p) => ({
    id: p.id,
    udlrn: p.udlrn,
    stateCode: p.stateCode,
    districtId: p.districtId,
    surveyNumber: p.surveyNumber,
    landAreaHa: p.landAreaHa,
    landUse: p.landUseType,
    declaredCrop: p.declaredCrop,
    isFrozen: p.isFrozen,
    isFraudFlagged: p.fraudFlagReason != null,
    createdAt: p.createdAt,
  })));
});

export default router;
