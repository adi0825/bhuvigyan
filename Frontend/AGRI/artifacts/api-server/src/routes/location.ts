import { Router } from "express";
import { db } from "@workspace/db";
import { locationStates, locationDistricts, locationTaluks, locationHoblis, locationVillages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ok } from "../lib/response";

const router = Router();

// GET /api/v1/location/states
router.get("/states", async (_req, res) => {
  const states = await db.query.locationStates.findMany({ orderBy: (s, { asc }) => [asc(s.name)] });
  return ok(res, states.map((s) => ({ code: s.code, name: s.name, landSystem: s.landSystem })));
});

// GET /api/v1/location/districts?stateCode=xx
router.get("/districts", async (req, res) => {
  const { stateCode } = req.query as { stateCode: string };
  const rows = await db.query.locationDistricts.findMany({
    where: eq(locationDistricts.stateCode, stateCode),
    orderBy: (d, { asc }) => [asc(d.name)],
  });
  return ok(res, rows.map((d) => ({ id: d.id, name: d.name, stateCode: d.stateCode })));
});

// GET /api/v1/location/taluks?districtId=xx
router.get("/taluks", async (req, res) => {
  const { districtId } = req.query as { districtId: string };
  const rows = await db.query.locationTaluks.findMany({
    where: eq(locationTaluks.districtId, districtId),
    orderBy: (t, { asc }) => [asc(t.name)],
  });
  return ok(res, rows.map((t) => ({ id: t.id, name: t.name })));
});

// GET /api/v1/location/hoblis?talukId=xx
router.get("/hoblis", async (req, res) => {
  const { talukId } = req.query as { talukId: string };
  const rows = await db.query.locationHoblis.findMany({
    where: eq(locationHoblis.talukId, talukId),
    orderBy: (h, { asc }) => [asc(h.name)],
  });
  return ok(res, rows.map((h) => ({ id: h.id, name: h.name })));
});

// GET /api/v1/location/villages?hobliId=xx
router.get("/villages", async (req, res) => {
  const { hobliId } = req.query as { hobliId: string };
  const rows = await db.query.locationVillages.findMany({
    where: eq(locationVillages.hobliId, hobliId),
    orderBy: (v, { asc }) => [asc(v.name)],
  });
  return ok(res, rows.map((v) => ({ id: v.id, name: v.name, pinCode: v.pinCode })));
});

export default router;
