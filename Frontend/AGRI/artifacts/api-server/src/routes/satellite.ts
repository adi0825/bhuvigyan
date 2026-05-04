import { Router } from "express";
import { db } from "@workspace/db";
import { satelliteJobs, claims } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

function deterministicNdvi(seed: string, min: number, max: number): number {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const val = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  return parseFloat((min + val * (max - min)).toFixed(4));
}

function runMockSatelliteAnalysis(udlrn: string, sowingDate: string, claimDate: string) {
  const seed = `${udlrn}_${sowingDate}_${claimDate}`;
  const ndviSowing = deterministicNdvi(seed + "_sow", 0.35, 0.72);
  const ndviClaim = deterministicNdvi(seed + "_claim", 0.08, 0.55);
  const ndviLossPct = parseFloat(Math.max(0, ((ndviSowing - ndviClaim) / ndviSowing) * 100).toFixed(2));
  const ndviPeak = deterministicNdvi(seed + "_peak", ndviSowing, 0.85);
  const sarVvDrop = deterministicNdvi(seed + "_sar_vv", 0, 6);
  const sarVhDrop = deterministicNdvi(seed + "_sar_vh", 0, 5);
  const cloudCoverPct = deterministicNdvi(seed + "_cloud", 0, 35);
  const imdConfirmed = deterministicNdvi(seed + "_imd", 0, 1) > 0.4;
  const fraudScore = parseFloat(Math.min(100, Math.max(0,
    (ndviLossPct < 15 ? 50 : ndviLossPct > 40 ? 10 : 25) +
    (cloudCoverPct > 25 ? 10 : 0) +
    (!imdConfirmed ? 15 : 0)
  )).toFixed(2));

  return {
    ndviSowing,
    ndviClaim,
    ndviLossPct,
    ndviPeak,
    ndviBaseline10yr: deterministicNdvi(seed + "_base10", 0.30, 0.65),
    ndviPreSowing: deterministicNdvi(seed + "_presow", 0.15, 0.35),
    ndviAnomalyScore: deterministicNdvi(seed + "_anom", 0, 0.6),
    sarVvDrop,
    sarVhDrop,
    sarFloodSignature: sarVvDrop > 3 && sarVhDrop > 2.5,
    cloudCoverPct,
    imdWeatherConfirmed: imdConfirmed,
    imdDisasterType: imdConfirmed ? "DROUGHT" : null,
    dataSource: cloudCoverPct > 30 ? "LANDSAT_8" : "SENTINEL_2",
    fraudScore,
    confidence: deterministicNdvi(seed + "_conf", 0.75, 0.98),
    trueColorUrl: `https://earthengine.google.com/map/${udlrn}_tc.png`,
    ndviMapUrl: `https://earthengine.google.com/map/${udlrn}_ndvi.png`,
    lossMapUrl: `https://earthengine.google.com/map/${udlrn}_loss.png`,
    processingTimeMs: Math.floor(deterministicNdvi(seed + "_ms", 800, 4200)),
  };
}

// POST /api/v1/satellite/analyze
// Trigger a satellite analysis job for a UDLRN. Returns jobId for polling.
router.post("/analyze", requireAdmin, async (req, res) => {
  const { udlrn, sowingDate, claimDate, claimId } = req.body as {
    udlrn: string; sowingDate: string; claimDate: string; claimId?: string;
  };
  if (!udlrn || !sowingDate || !claimDate) {
    return fail(res, "udlrn, sowingDate, claimDate required", 400);
  }

  const [job] = await db.insert(satelliteJobs).values({
    claimId: claimId ?? undefined,
    udlrn,
    status: "QUEUED",
    sowingDate,
    claimDate,
    geeTaskId: `GEE_MOCK_${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
  }).returning();

  setTimeout(async () => {
    try {
      const result = runMockSatelliteAnalysis(udlrn, sowingDate, claimDate);
      await db.update(satelliteJobs).set({
        status: "COMPLETED",
        result,
        processingTimeMs: result.processingTimeMs,
        completedAt: new Date(),
      }).where(eq(satelliteJobs.id, job!.id));
    } catch (_) {}
  }, 1500);

  return ok(res, {
    jobId: job!.id,
    status: "QUEUED",
    geeTaskId: job!.geeTaskId,
    message: "Analysis queued. Poll /v1/satellite/result/:jobId for status.",
    estimatedCompletionMs: 2000,
  }, 202);
});

// POST /api/v1/satellite/analyze/sync
// Synchronous satellite analysis — returns full result inline.
router.post("/analyze/sync", requireAdmin, async (req, res) => {
  const { udlrn, sowingDate, claimDate, claimId } = req.body as {
    udlrn: string; sowingDate: string; claimDate: string; claimId?: string;
  };
  if (!udlrn || !sowingDate || !claimDate) {
    return fail(res, "udlrn, sowingDate, claimDate required", 400);
  }

  const result = runMockSatelliteAnalysis(udlrn, sowingDate, claimDate);

  const [job] = await db.insert(satelliteJobs).values({
    claimId: claimId ?? undefined,
    udlrn,
    status: "COMPLETED",
    sowingDate,
    claimDate,
    geeTaskId: `GEE_SYNC_${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
    result,
    processingTimeMs: result.processingTimeMs,
    completedAt: new Date(),
  }).returning();

  if (claimId) {
    await db.update(claims).set({
      ndviSowing: String(result.ndviSowing),
      ndviClaim: String(result.ndviClaim),
      ndviLossPct: String(result.ndviLossPct),
      sarVvDrop: String(result.sarVvDrop),
      sarVhDrop: String(result.sarVhDrop),
      cloudCoverPct: String(result.cloudCoverPct),
      imdWeatherConfirmed: result.imdWeatherConfirmed,
      imdDisasterType: result.imdDisasterType ?? undefined,
      trueColorUrl: result.trueColorUrl,
      ndviMapUrl: result.ndviMapUrl,
      lossMapUrl: result.lossMapUrl,
      dataSource: result.dataSource,
      satelliteProcessedAt: new Date(),
    }).where(eq(claims.id, claimId));
  }

  return ok(res, {
    jobId: job!.id,
    status: "COMPLETED",
    result,
  });
});

// GET /api/v1/satellite/result/:jobId
// Poll the status/result of a satellite analysis job.
router.get("/result/:jobId", requireAdmin, async (req, res) => {
  const job = await db.query.satelliteJobs.findFirst({
    where: eq(satelliteJobs.id, req.params["jobId"]!),
  });
  if (!job) return fail(res, "Job not found", 404);

  return ok(res, {
    jobId: job.id,
    status: job.status,
    udlrn: job.udlrn,
    claimId: job.claimId,
    geeTaskId: job.geeTaskId,
    result: job.result ?? null,
    processingTimeMs: job.processingTimeMs,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

// GET /api/v1/satellite/jobs — list jobs for a claim (spec 3.6)
router.get("/jobs", requireAdmin, async (req, res) => {
  const { claimId } = req.query as Record<string, string>;
  const allJobs = await db.query.satelliteJobs.findMany({
    where: claimId ? eq(satelliteJobs.claimId, claimId) : undefined,
    orderBy: (j, { desc }) => [desc(j.createdAt)],
    limit: 50,
  });
  return ok(res, allJobs.map((j) => ({
    jobId: j.id,
    claimId: j.claimId,
    udlrn: j.udlrn,
    status: j.status,
    geeTaskId: j.geeTaskId,
    result: j.result ?? null,
    processingTimeMs: j.processingTimeMs,
    createdAt: j.createdAt,
    completedAt: j.completedAt,
  })));
});

// GET /api/v1/satellite/jobs/:id — get job by ID (spec 3.6)
router.get("/jobs/:id", requireAdmin, async (req, res) => {
  const job = await db.query.satelliteJobs.findFirst({
    where: eq(satelliteJobs.id, req.params["id"]!),
  });
  if (!job) return fail(res, "Satellite job not found", 404);
  return ok(res, {
    jobId: job.id,
    claimId: job.claimId,
    udlrn: job.udlrn,
    status: job.status,
    geeTaskId: job.geeTaskId,
    result: job.result ?? null,
    processingTimeMs: job.processingTimeMs,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

// GET /api/v1/satellite/:claimId/ndvi — NDVI timeline (spec 3.6)
router.get("/:claimId/ndvi", requireAdmin, async (req, res) => {
  const { claimId } = req.params;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) return fail(res, "Claim not found", 404);

  const udlrn = claim.udlrn ?? claimId;
  const sowDate = claim.declaredSowingDate ?? "2024-07-01";

  const seed = `${udlrn}_ndvi_timeline`;
  function seededVal(s: string, min: number, max: number) {
    const h = crypto.createHash("sha256").update(s).digest("hex");
    const v = parseInt(h.substring(0, 8), 16) / 0xffffffff;
    return parseFloat((min + v * (max - min)).toFixed(4));
  }

  const weeks = 16;
  const sowMs = new Date(sowDate).getTime();
  const timeline = Array.from({ length: weeks }, (_, i) => {
    const date = new Date(sowMs + i * 7 * 86400000).toISOString().split("T")[0]!;
    const ndvi = i < 3 ? seededVal(`${seed}_${i}_pre`, 0.15, 0.30) :
                 i < 8 ? seededVal(`${seed}_${i}_grow`, 0.35, 0.75) :
                 i < 12 ? seededVal(`${seed}_${i}_peak`, 0.55, 0.85) :
                 seededVal(`${seed}_${i}_dec`, 0.10, 0.50);
    return {
      date,
      ndvi: Number(ndvi.toFixed(3)),
      baseline10yr: Number(seededVal(`${seed}_base_${i}`, 0.40, 0.70).toFixed(3)),
    };
  });

  return ok(res, {
    claimId,
    udlrn,
    sowingDate: sowDate,
    ndviMeanSowing: claim.ndviSowing ? Number(claim.ndviSowing) : seededVal(`${seed}_sow`, 0.45, 0.75),
    ndviMeanClaim: claim.ndviClaim ? Number(claim.ndviClaim) : seededVal(`${seed}_claim`, 0.10, 0.45),
    ndviDrop: claim.ndviLossPct ? Number(claim.ndviLossPct) : seededVal(`${seed}_drop`, 10, 55),
    timeline,
    source: claim.dataSource ?? "SENTINEL2",
    cloudCoverPct: claim.cloudCoverPct ? Number(claim.cloudCoverPct) : seededVal(`${seed}_cloud`, 5, 35),
  });
});

// GET /api/v1/satellite/:claimId/images — satellite images (spec 3.6)
router.get("/:claimId/images", requireAdmin, async (req, res) => {
  const { claimId } = req.params;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) return fail(res, "Claim not found", 404);

  return ok(res, {
    claimId,
    udlrn: claim.udlrn,
    trueColorUrl: claim.trueColorUrl ?? `https://earthengine.google.com/map/${claim.udlrn}_tc.png`,
    ndviMapUrl: claim.ndviMapUrl ?? `https://earthengine.google.com/map/${claim.udlrn}_ndvi.png`,
    lossMapUrl: claim.lossMapUrl ?? `https://earthengine.google.com/map/${claim.udlrn}_loss.png`,
    source: claim.dataSource ?? "SENTINEL2",
    capturedAt: claim.satelliteProcessedAt ?? null,
  });
});

export default router;
