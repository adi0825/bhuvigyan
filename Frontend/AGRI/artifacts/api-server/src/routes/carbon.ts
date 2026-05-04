import { Router } from "express";
import { db } from "@workspace/db";
import { udlrnMaster, farmers, carbonProjects } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

const PRACTICE_RATES: Record<string, { sequestrationPerHa: number; marketPriceUsd: number; methodology: string }> = {
  DSR:            { sequestrationPerHa: 2.1, marketPriceUsd: 14.5, methodology: "VM0042" },
  NO_TILLAGE:     { sequestrationPerHa: 1.8, marketPriceUsd: 14.5, methodology: "VM0042" },
  CROP_RESIDUE:   { sequestrationPerHa: 1.5, marketPriceUsd: 12.0, methodology: "VM0042" },
  AGROFORESTRY:   { sequestrationPerHa: 3.2, marketPriceUsd: 18.0, methodology: "AMS-III.AU" },
  ORGANIC_FARMING:{ sequestrationPerHa: 2.4, marketPriceUsd: 16.0, methodology: "VM0042" },
};

const INR_PER_USD = 83.5;
const FARMER_SHARE_PCT = 0.75;
const PLATFORM_FEE_PCT = 0.05;
const REGISTRY_FEE_PCT = 0.03;

function deterministicScore(seed: string, min: number, max: number): number {
  const h = crypto.createHash("sha256").update(seed).digest("hex");
  const f = parseInt(h.substring(0, 8), 16) / 0xffffffff;
  return parseFloat((min + f * (max - min)).toFixed(4));
}

// POST /api/v1/carbon/estimate
// Estimate carbon credits for a given UDLRN + practice type.
// Used by admin analytics and by the farmer portal before enrolment.
router.post("/estimate", requireAuth, async (req, res) => {
  const {
    udlrn, farmerId, practiceType = "DSR", years = 1,
  } = req.body as {
    udlrn?: string; farmerId?: string; practiceType?: string; years?: number;
  };

  if (!udlrn && !farmerId) return fail(res, "udlrn or farmerId required", 400);

  const practice = PRACTICE_RATES[practiceType];
  if (!practice) {
    return fail(res, `Unknown practiceType. Valid: ${Object.keys(PRACTICE_RATES).join(", ")}`, 400);
  }

  let land = udlrn
    ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) })
    : await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmerId!) });

  if (!land) return fail(res, "Land record not found", 404);

  const areaHa = Number(land.kgisAreaHa ?? land.rtcAreaHa ?? 2.5);
  const seed = `${land.udlrn}_${practiceType}`;

  const baselineNdvi = Number(land.landsatBaselineNdvi ?? deterministicScore(seed + "_ndvi", 0.25, 0.55));
  const ndviBoostFactor = 1 + deterministicScore(seed + "_boost", 0.05, 0.20);
  const soilOrganicCarbonBaseline = deterministicScore(seed + "_soc", 0.5, 1.8);

  const annualSequestration = areaHa * practice.sequestrationPerHa * ndviBoostFactor;
  const totalSequestration = annualSequestration * years;

  const grossValueUsd = totalSequestration * practice.marketPriceUsd;
  const grossValueInr = grossValueUsd * INR_PER_USD;
  const farmerPayoutInr = grossValueInr * FARMER_SHARE_PCT;
  const platformFeeInr = grossValueInr * PLATFORM_FEE_PCT;
  const registryFeeInr = grossValueInr * REGISTRY_FEE_PCT;
  const netFarmerPayoutInr = farmerPayoutInr - registryFeeInr;

  const farmer = land.farmerId
    ? await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) })
    : null;

  const existingProject = await db.query.carbonProjects.findFirst({
    where: eq(carbonProjects.udlrn, land.udlrn),
  });

  return ok(res, {
    udlrn: land.udlrn,
    farmerName: farmer?.fullName ?? land.landOwnerName,
    landAreaHa: areaHa,
    stateCode: land.stateCode,
    practiceType,
    methodology: practice.methodology,
    baselineNdvi: parseFloat(baselineNdvi.toFixed(4)),
    soilOrganicCarbonBaseline: parseFloat(soilOrganicCarbonBaseline.toFixed(4)),
    projectedNdviAfterAdoption: parseFloat((baselineNdvi * ndviBoostFactor).toFixed(4)),
    years,
    annualSequestration: parseFloat(annualSequestration.toFixed(3)),
    totalSequestration: parseFloat(totalSequestration.toFixed(3)),
    marketPriceUsdPerTonne: practice.marketPriceUsd,
    grossValueUsd: parseFloat(grossValueUsd.toFixed(2)),
    grossValueInr: parseFloat(grossValueInr.toFixed(2)),
    farmerSharePct: FARMER_SHARE_PCT * 100,
    platformFeePct: PLATFORM_FEE_PCT * 100,
    registryFeePct: REGISTRY_FEE_PCT * 100,
    farmerPayoutInr: parseFloat(farmerPayoutInr.toFixed(2)),
    netFarmerPayoutInr: parseFloat(netFarmerPayoutInr.toFixed(2)),
    perHectarePayoutInr: parseFloat((netFarmerPayoutInr / areaHa).toFixed(2)),
    alreadyEnrolled: !!existingProject,
    existingProjectStatus: existingProject?.status ?? null,
    eligibilityFactors: {
      landAreaSufficient: areaHa >= 0.5,
      ndviBaseline: baselineNdvi >= 0.2,
      practiceSupported: true,
      estimatedVerificationDate: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    },
  });
});

// GET /api/v1/carbon/practices
// List supported sustainable farming practices and their credit rates.
router.get("/practices", async (_req, res) => {
  return ok(res, Object.entries(PRACTICE_RATES).map(([id, p]) => ({
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    methodology: p.methodology,
    sequestrationPerHaPerYear: p.sequestrationPerHa,
    marketPriceUsdPerTonne: p.marketPriceUsd,
    farmerSharePct: FARMER_SHARE_PCT * 100,
    estimatedPayoutPerHaInr: parseFloat((p.sequestrationPerHa * p.marketPriceUsd * INR_PER_USD * FARMER_SHARE_PCT).toFixed(2)),
  })));
});

export default router;
