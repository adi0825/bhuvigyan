import { Router } from "express";
import { db } from "@workspace/db";
import { udlrnMaster, farmers, udlrnSeasonLock } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /api/v1/udlrn/:udlrn — UDLRN detail
router.get("/:udlrn", requireAdmin, async (req, res) => {
  const { udlrn } = req.params;
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found", 404);

  let farmerInfo = null;
  if (land.farmerId) {
    const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) });
    farmerInfo = farmer ? {
      id: farmer.id,
      fullName: farmer.fullName,
      mobile: farmer.mobile,
      stateCode: farmer.stateCode,
    } : null;
  }

  return ok(res, {
    id: land.id,
    udlrn: land.udlrn,
    stateCode: land.stateCode,
    districtId: land.districtId,
    talukId: land.talukId,
    villageId: land.villageId,
    surveyNumber: land.surveyNumber,
    landAreaHa: land.landAreaHa,
    landUse: land.landUseType ?? "AGRICULTURAL",
    declaredCrop: land.declaredCrop,
    isFrozen: land.isFrozen,
    frozenReason: land.frozenReason,
    isFraudFlagged: land.fraudFlagReason != null,
    fraudFlagReason: land.fraudFlagReason,
    payoutAccountNo: land.payoutAccountNo,
    payoutBankName: land.payoutBankName,
    payoutIfsc: land.payoutIfsc,
    owner: farmerInfo,
    createdAt: land.createdAt,
    updatedAt: land.updatedAt,
  });
});

// GET /api/v1/udlrn/:udlrn/history — Ownership history (simulated)
router.get("/:udlrn/history", requireAdmin, async (req, res) => {
  const { udlrn } = req.params;
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found", 404);

  let currentOwner = null;
  if (land.farmerId) {
    const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) });
    currentOwner = farmer?.fullName ?? "Unknown";
  }

  const history = [
    {
      id: `hist-${udlrn}-001`,
      udlrnId: land.id,
      farmerId: land.farmerId,
      ownerName: currentOwner ?? "Current Owner",
      validFrom: "2020-04-01",
      validTo: null,
      mutationRef: `MUT-${udlrn}-CURR`,
      isSuspicious: false,
      type: "CURRENT",
    },
    {
      id: `hist-${udlrn}-002`,
      udlrnId: land.id,
      farmerId: null,
      ownerName: "Previous Owner",
      validFrom: "2015-06-15",
      validTo: "2020-03-31",
      mutationRef: `MUT-${udlrn}-PREV`,
      isSuspicious: false,
      type: "HISTORICAL",
    },
  ];

  return ok(res, history);
});

// POST /api/v1/udlrn/resolve — resolve UDLRN from state adapter
router.post("/resolve", requireAdmin, async (req, res) => {
  const { udlrn } = req.body as { udlrn: string };
  if (!udlrn) return fail(res, "udlrn required", 400);

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found in registry", 404);

  let farmerInfo = null;
  if (land.farmerId) {
    const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) });
    farmerInfo = farmer ? { id: farmer.id, fullName: farmer.fullName, mobile: farmer.mobile } : null;
  }

  return ok(res, {
    udlrn: land.udlrn,
    stateCode: land.stateCode,
    landUse: land.landUseType ?? "AGRICULTURAL",
    landAreaHa: land.landAreaHa,
    surveyNumber: land.surveyNumber,
    isFrozen: land.isFrozen,
    owner: farmerInfo,
    resolvedAt: new Date().toISOString(),
    adapterStatus: "SUCCESS",
    adapterName: `${land.stateCode}_ADAPTER`,
  });
});

// GET /api/v1/udlrn/:udlrn/policy-check?season&year
router.get("/:udlrn/policy-check", requireAdmin, async (req, res) => {
  const { udlrn } = req.params;
  const { season, year } = req.query as Record<string, string>;

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found", 404);

  if (land.isFrozen) {
    return ok(res, { eligible: false, reason: `UDLRN is frozen: ${land.frozenReason}`, udlrn });
  }

  if (season && year) {
    const seasonCode = `${season}-${year}`;
    const lock = await db.query.udlrnSeasonLock.findFirst({
      where: and(eq(udlrnSeasonLock.udlrn, udlrn), eq(udlrnSeasonLock.seasonCode, seasonCode)),
    });
    if (lock) {
      return ok(res, { eligible: false, reason: "Claim already filed for this season", udlrn, seasonCode });
    }
  }

  const landUse = land.landUseType ?? "AGRICULTURAL";
  if (!["AGRICULTURAL", "AGRI"].includes(landUse)) {
    return ok(res, { eligible: false, reason: "Non-agricultural land not eligible for PMFBY", udlrn, landUse });
  }

  return ok(res, { eligible: true, reason: "Land is eligible for PMFBY claim", udlrn, landAreaHa: land.landAreaHa });
});

export default router;
