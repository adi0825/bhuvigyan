import { Router } from "express";
import { db } from "@workspace/db";
import { refreshTokens, farmers, adminOfficers, udlrnMaster } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { requireAuth } from "../middlewares/auth";
import {
  signAdminAccessToken,
  signFarmerAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";

const router = Router();

// POST /api/v1/auth/refresh
// Body: { refreshToken: string }
// Returns: { accessToken, refreshToken }
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return fail(res, "refreshToken required", 400);

  let payload: { sub: string; type: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return fail(res, "Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  if (payload.type !== "refresh") return fail(res, "Invalid token type", 401, "INVALID_REFRESH_TOKEN");

  // Look up token in DB — must exist, not revoked, not expired
  const stored = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, refreshToken),
      isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, new Date()),
    ),
  });
  if (!stored) return fail(res, "Refresh token revoked or not found", 401, "INVALID_REFRESH_TOKEN");

  // Revoke the old refresh token (rotation)
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));

  const sub = payload.sub; // "admin:<adminId>" or "farmer:<farmerId>"

  let newAccessToken: string;
  let newRefreshToken: string;

  if (sub.startsWith("admin:")) {
    const adminId = sub.slice(6);
    const officer = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.id, adminId) });
    if (!officer || !officer.isActive) return fail(res, "Officer not found or inactive", 401, "INVALID_REFRESH_TOKEN");

    newAccessToken = signAdminAccessToken(officer.id, officer.email, officer.role, (officer.jurisdiction as object) ?? {});
    newRefreshToken = signRefreshToken(`admin:${officer.id}`);

    await db.insert(refreshTokens).values({
      adminId: officer.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return ok(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  }

  if (sub.startsWith("farmer:")) {
    const farmerId = sub.slice(7);
    const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, farmerId) });
    if (!farmer || farmer.isBlacklisted) return fail(res, "Farmer not found or suspended", 401, "INVALID_REFRESH_TOKEN");

    const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmer.id) });
    newAccessToken = signFarmerAccessToken(farmer.id, land?.udlrn ?? "", farmer.stateCode ?? "");
    newRefreshToken = signRefreshToken(`farmer:${farmer.id}`);

    await db.insert(refreshTokens).values({
      farmerId: farmer.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return ok(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  }

  // Other portals (csc, inspector, insurer) — reissue a generic refresh
  // These portals don't use the refreshTokens table yet, so just reject gracefully
  return fail(res, "Refresh not supported for this portal type", 400, "UNSUPPORTED_PORTAL");
});

// POST /api/v1/auth/logout
// Requires authentication
// Body: { refreshToken?: string }
// Revokes all refresh tokens for the authenticated user
router.post("/logout", requireAuth, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  const auth = req.auth!;

  const whereClause = refreshToken
    ? eq(refreshTokens.token, refreshToken)
    : auth.farmerId
    ? eq(refreshTokens.farmerId, auth.farmerId)
    : auth.adminId
    ? eq(refreshTokens.adminId, auth.adminId)
    : null;

  if (!whereClause) {
    return fail(res, "Unable to determine user for logout", 400, "INVALID_USER");
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(whereClause);

  return ok(res, { message: "Logged out successfully" });
});

export default router;
