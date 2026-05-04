import { Router } from "express";
import { db } from "@workspace/db";
import {
  farmers, udlrnMaster, notifications, claims, carbonProjects, carbonCredits,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { requireFarmer } from "../middlewares/auth";

const router = Router();

// GET /api/v1/farmer/profile
router.get("/profile", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  // Fetch linked land parcels
  const allLand = await db.query.udlrnMaster.findMany({ where: eq(udlrnMaster.farmerId, farmerId) });
  const parcels = allLand.map((l) => ({
    udlrn: l.udlrn,
    areaHa: Number(l.kgisAreaHa ?? l.rtcAreaHa ?? 0),
    landUse: l.landUseType ?? "AGRICULTURAL",
    crop: Array.isArray(l.historicalCrops) ? (l.historicalCrops as string[])[0] : undefined,
  }));

  // Fetch bank account from land record
  const primaryLand = allLand[0];

  return ok(res, {
    id: farmer.id, mobile: farmer.mobile, fullName: farmer.fullName,
    preferredLanguage: farmer.preferredLanguage, isBlacklisted: farmer.isBlacklisted,
    carbonEligible: farmer.carbonEligible, carbonEnrolled: farmer.carbonEnrolled,
    createdAt: farmer.createdAt,
    // Bank details from land record (payout info)
    bankAccount: primaryLand?.payoutAccountNo ?? "—",
    bankIfsc: primaryLand?.payoutIfsc ?? "—",
    bankName: primaryLand?.payoutBankName ?? "—",
    stateCode: primaryLand?.stateCode ?? "—",
    districtCode: primaryLand?.districtId ?? "—",
    parcels,
    notificationPrefs: { inApp: true, sms: true, whatsapp: false },
  });
});

// PATCH /api/v1/farmers/:id
router.patch("/:id", requireFarmer, async (req, res) => {
  const farmerId = req.params["id"]!;
  const authFarmerId = req.auth!.farmerId!;

  if (farmerId !== authFarmerId) {
    return fail(res, "You can only update your own profile", 403, "FORBIDDEN");
  }

  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  const { fullName, preferredLanguage, dateOfBirth, gender } = req.body as {
    fullName?: string;
    preferredLanguage?: string;
    dateOfBirth?: string;
    gender?: string;
  };

  const updateData: any = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
  if (gender !== undefined) updateData.gender = gender;
  updateData.updatedAt = new Date();

  await db.update(farmers).set(updateData).where(eq(farmers.id, farmerId));

  const updated = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  return ok(res, {
    id: updated!.id,
    mobile: updated!.mobile,
    fullName: updated!.fullName,
    preferredLanguage: updated!.preferredLanguage,
    dateOfBirth: updated!.dateOfBirth,
    gender: updated!.gender,
    updatedAt: updated!.updatedAt,
  });
});

// GET /api/v1/farmer/land
router.get("/land", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmerId) });
  if (!land) return fail(res, "No land record found", 404);

  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  const claimsHistory = await db.query.claims.findMany({
    where: eq(claims.udlrn, land.udlrn),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 10,
  });
  const carbonProject = await db.query.carbonProjects.findFirst({ where: eq(carbonProjects.udlrn, land.udlrn) });

  return ok(res, {
    udlrn: land.udlrn,
    landOwnerName: land.landOwnerName,
    landAreaHa: land.kgisAreaHa ?? land.rtcAreaHa,
    kgisAreaHa: land.kgisAreaHa,
    rtcAreaHa: land.rtcAreaHa,
    landUseType: land.landUseType,
    surveyNumber: land.surveyNumber,
    stateCode: land.stateCode,
    centroidLat: land.centroidLat,
    centroidLng: land.centroidLng,
    isFrozen: land.isFrozen,
    frozenReason: land.frozenReason,
    payoutBankName: land.payoutBankName,
    payoutIfsc: land.payoutIfsc,
    payoutAccountNo: land.payoutAccountNo,
    historicalCrops: land.historicalCrops,
    carbonScore: land.carbonScore,
    carbonEligible: farmer?.carbonEligible,
    carbonEnrolled: farmer?.carbonEnrolled,
    carbonProjectStatus: carbonProject?.status,
    claimsHistory: claimsHistory.map((c) => ({
      id: c.id, claimNumber: c.claimNumber, status: c.status,
      declaredCrop: c.declaredCrop, filedAt: c.filedAt, approvedAmount: c.approvedAmount,
    })),
    updatedAt: land.updatedAt,
  });
});

// GET /api/v1/farmer/notifications
router.get("/notifications", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const limit = Math.min(Number(req.query["limit"]) || 50, 100);
  const notifList = await db.query.notifications.findMany({
    where: eq(notifications.farmerId, farmerId),
    limit,
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
  return ok(res, notifList.map((n) => ({
    id: n.id, title: n.title, message: n.message, channel: n.channel,
    notificationType: n.notificationType, claimId: n.claimId, readAt: n.readAt, createdAt: n.createdAt,
  })));
});

// GET /api/v1/farmer/notifications/unread-count
router.get("/notifications/unread-count", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const all = await db.query.notifications.findMany({ where: eq(notifications.farmerId, farmerId) });
  const count = all.filter((n) => !n.readAt).length;
  return ok(res, { count });
});

// POST /api/v1/farmer/notifications/mark-read/:id
router.post("/notifications/mark-read/:id", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const n = await db.query.notifications.findFirst({ where: eq(notifications.id, req.params["id"]!) });
  if (!n || n.farmerId !== farmerId) return fail(res, "Notification not found", 404);
  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, req.params["id"]!));
  return ok(res, { message: "Marked as read" });
});

// POST /api/v1/farmer/notifications/mark-all-read
router.post("/notifications/mark-all-read", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.farmerId, farmerId));
  return ok(res, { message: "All notifications marked as read" });
});

// GET /api/v1/farmer/carbon
router.get("/carbon", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmerId) });
  const project = land ? await db.query.carbonProjects.findFirst({ where: eq(carbonProjects.udlrn, land.udlrn) }) : null;
  const credit = project ? await db.query.carbonCredits.findFirst({ where: eq(carbonCredits.projectId, project.id) }) : null;

  return ok(res, {
    eligible: farmer.carbonEligible ?? false,
    enrolled: farmer.carbonEnrolled ?? false,
    practiceType: project?.projectType,
    carbonScore: land?.carbonScore ? Number(land.carbonScore) : null,
    landAreaHa: land?.kgisAreaHa ? Number(land.kgisAreaHa) : (land?.rtcAreaHa ? Number(land.rtcAreaHa) : 2.5),
    creditsEarned: credit?.creditsAmount ? Number(credit.creditsAmount) : 0,
    project: project ? { id: project.id, status: project.status, baselineNdvi: land?.landsatBaselineNdvi, createdAt: project.createdAt } : null,
  });
});

// POST /api/v1/farmer/carbon/enrol
router.post("/carbon/enrol", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const { practiceType } = req.body as { practiceType: string };
  if (!practiceType) return fail(res, "practiceType required", 400);

  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
  if (!farmer) return fail(res, "Farmer not found", 404);
  if (!farmer.carbonEligible) return fail(res, "Farmer not eligible for carbon credits", 400);
  if (farmer.carbonEnrolled) return fail(res, "Already enrolled in carbon programme", 409);

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmerId) });
  if (!land) return fail(res, "No land record found", 404);

  const verificationDate = new Date();
  verificationDate.setFullYear(verificationDate.getFullYear() + 1);

  await db.insert(carbonProjects).values({
    udlrn: land.udlrn,
    farmerId,
    projectType: practiceType,
    methodology: "VM0042",
    enrolmentDate: new Date().toISOString().split("T")[0],
    verificationDue: verificationDate.toISOString().split("T")[0],
    status: "ENROLLED",
    satelliteMonitoringEnabled: true,
  });

  await db.update(farmers).set({ carbonEnrolled: true }).where(eq(farmers.id, farmerId));

  // Notify farmer
  await db.insert(notifications).values({
    farmerId,
    recipientMobile: farmer.mobile,
    notificationType: "CARBON_ENROLMENT",
    title: "🌿 Enrolled in Carbon Programme",
    message: `You are now enrolled in the carbon credits programme (${practiceType.replace(/_/g, " ").toLowerCase()}). Your land will be monitored monthly via satellite. Credits issued after 12 months.`,
    channel: "IN_APP",
  });

  return ok(res, { message: "Enrolled successfully. Monitoring begins now." }, 201);
});

// GET /api/v1/farmer/udlrn-pdf (simple text response)
router.get("/udlrn-pdf", requireFarmer, async (req, res) => {
  const farmerId = req.auth!.farmerId!;
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmerId) });
  if (!land) return fail(res, "No land record found", 404);

  const content = `BHUVIGYAN PMFBY — UDLRN CERTIFICATE\n\n` +
    `UDLRN: ${land.udlrn}\n` +
    `Owner: ${land.landOwnerName ?? "—"}\n` +
    `Survey No: ${land.surveyNumber}\n` +
    `Area: ${land.kgisAreaHa ?? land.rtcAreaHa ?? "—"} Ha\n` +
    `State: ${land.stateCode}\n` +
    `Land Use: ${land.landUseType ?? "Agricultural"}\n` +
    `Frozen: ${land.isFrozen ? "YES" : "NO"}\n\n` +
    `Generated: ${new Date().toLocaleDateString("en-IN")}\n` +
    `This document is valid for use at CSC offices and banks.\n`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="UDLRN-${land.udlrn}.txt"`);
  res.send(content);
});

export default router;
