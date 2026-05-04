import { db } from "@workspace/db";
import {
  modelRegistry, cropPhenologyCalendar, insurerAccounts,
  locationStates, locationDistricts, locationTaluks, locationHoblis, locationVillages,
  farmers, adminOfficers, cscOperators, udlrnMaster, claims, fraudHeatmapDaily, ruleProfiles,
} from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";
import crypto from "crypto";

function hashPw(pw: string) {
  return crypto.createHash("sha256").update(`bhuvigyan:${pw}`).digest("hex");
}

async function seedLocationData() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(locationStates);
  if (Number(cnt) > 0) return;
  logger.info("Seeding location data...");
  await db.insert(locationStates).values([
    { code: "29", name: "Karnataka", landSystem: "Bhoomi", apiType: "REST" },
    { code: "27", name: "Maharashtra", landSystem: "Mahabhulekh", apiType: "REST" },
    { code: "36", name: "Telangana", landSystem: "Dharani", apiType: "REST" },
    { code: "03", name: "Punjab", landSystem: "PLRS", apiType: "SOAP" },
    { code: "09", name: "Uttar Pradesh", landSystem: "Bhulekh", apiType: "REST" },
    { code: "08", name: "Rajasthan", landSystem: "ApnaKhata", apiType: "REST" },
  ]);
  await db.insert(locationDistricts).values([
    { id: "29-0572", stateCode: "29", name: "Tumakuru", lat: "13.337900", lng: "77.103800" },
    { id: "29-0585", stateCode: "29", name: "Bengaluru Urban", lat: "12.979400", lng: "77.590600" },
    { id: "29-0565", stateCode: "29", name: "Mandya", lat: "12.521800", lng: "76.895100" },
    { id: "27-0520", stateCode: "27", name: "Pune", lat: "18.520400", lng: "73.856700" },
    { id: "36-0536", stateCode: "36", name: "Hyderabad", lat: "17.385000", lng: "78.486700" },
  ]);
  await db.insert(locationTaluks).values([
    { id: "29-0572-T01", districtId: "29-0572", name: "Tumakuru" },
    { id: "29-0572-T02", districtId: "29-0572", name: "Koratagere" },
    { id: "29-0585-T01", districtId: "29-0585", name: "Bengaluru North" },
    { id: "29-0565-T01", districtId: "29-0565", name: "Mandya" },
    { id: "27-0520-T01", districtId: "27-0520", name: "Haveli" },
  ]);
  await db.insert(locationHoblis).values([
    { id: "29-0572-T01-H01", talukId: "29-0572-T01", name: "Tumakuru Hobli" },
    { id: "29-0572-T02-H01", talukId: "29-0572-T02", name: "Koratagere Hobli" },
    { id: "29-0585-T01-H01", talukId: "29-0585-T01", name: "Bengaluru North Hobli" },
    { id: "29-0565-T01-H01", talukId: "29-0565-T01", name: "Mandya Hobli" },
    { id: "27-0520-T01-H01", talukId: "27-0520-T01", name: "Haveli Hobli" },
  ]);
  await db.insert(locationVillages).values([
    { id: "29-0572-T01-H01-V01", hobliId: "29-0572-T01-H01", name: "Huliyar", pinCode: "572218", centroidLat: "13.34520000", centroidLng: "76.98710000" },
    { id: "29-0572-T02-H01-V01", hobliId: "29-0572-T02-H01", name: "Koratagere", pinCode: "572129", centroidLat: "13.28940000", centroidLng: "77.04210000" },
    { id: "29-0585-T01-H01-V01", hobliId: "29-0585-T01-H01", name: "Yelahanka", pinCode: "560064", centroidLat: "13.10070000", centroidLng: "77.59630000" },
    { id: "29-0565-T01-H01-V01", hobliId: "29-0565-T01-H01", name: "Mandya Town", pinCode: "571401", centroidLat: "12.52340000", centroidLng: "76.89620000" },
    { id: "27-0520-T01-H01-V01", hobliId: "27-0520-T01-H01", name: "Pune Village", pinCode: "411001", centroidLat: "18.52140000", centroidLng: "73.85730000" },
  ]);
  logger.info("Location data seeded.");
}

async function seedFarmers() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(farmers);
  if (Number(cnt) > 0) return;
  logger.info("Seeding demo farmers...");
  await db.insert(farmers).values([
    { mobile: "9900000001", fullName: "Ramesh Gowda", dateOfBirth: "1985-03-15", gender: "MALE", preferredLanguage: "kn", carbonEligible: true, carbonEnrolled: true, isDemo: true },
    { mobile: "9900000002", fullName: "Lakshmi Devi", dateOfBirth: "1990-07-22", gender: "FEMALE", preferredLanguage: "kn", carbonEligible: true, isDemo: true },
    { mobile: "9900000003", fullName: "Venkataramana", dateOfBirth: "1978-11-08", gender: "MALE", preferredLanguage: "kn", isDemo: true },
    { mobile: "9900000004", fullName: "Savitribai Patil", dateOfBirth: "1992-01-30", gender: "FEMALE", preferredLanguage: "mr", isDemo: true },
    { mobile: "9900000005", fullName: "Rajesh Reddy", dateOfBirth: "1988-05-12", gender: "MALE", preferredLanguage: "te", isDemo: true },
    { mobile: "9900000006", fullName: "Gurpreet Singh", dateOfBirth: "1983-09-25", gender: "MALE", preferredLanguage: "pa", isDemo: true },
    { mobile: "9900000007", fullName: "Suresh Kumar", dateOfBirth: "1975-12-03", gender: "MALE", preferredLanguage: "hi", isDemo: true },
  ]);
  logger.info("7 demo farmers seeded.");
}

async function seedAdminOfficers() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(adminOfficers);
  if (Number(cnt) > 0) return;
  logger.info("Seeding admin officers...");
  const ts = "JBSWY3DPEHPK3PXP";
  await db.insert(adminOfficers).values([
    { email: "superadmin@bhuvigyan.gov.in", fullName: "Super Admin", mobile: "9999999991", role: "SUPER_ADMIN", stateCode: "29", passwordHash: hashPw("Admin@123"), totpSecret: ts, isDemo: true },
    { email: "inspector.ka@bhuvigyan.gov.in", fullName: "Inspector KA", mobile: "9999999992", role: "FIELD_INSPECTOR", stateCode: "29", districtId: "29-0572", passwordHash: hashPw("Inspector@123"), totpSecret: ts, isDemo: true },
    { email: "inspector.mh@bhuvigyan.gov.in", fullName: "Inspector MH", mobile: "9999999993", role: "FIELD_INSPECTOR", stateCode: "27", districtId: "27-0520", passwordHash: hashPw("Inspector@123"), totpSecret: ts, isDemo: true },
    { email: "dc.tumkur@bhuvigyan.gov.in", fullName: "DC Tumakuru", mobile: "9999999994", role: "DC_OFFICER", stateCode: "29", districtId: "29-0572", passwordHash: hashPw("DcOfficer@123"), totpSecret: ts, isDemo: true },
    { email: "state.officer.ka@bhuvigyan.gov.in", fullName: "State Officer KA", mobile: "9999999995", role: "STATE_OFFICER", stateCode: "29", passwordHash: hashPw("StateOfficer@123"), totpSecret: ts, isDemo: true },
    { email: "dc.bengaluru@bhuvigyan.gov.in", fullName: "DC Bengaluru", mobile: "9999999996", role: "DC_OFFICER", stateCode: "29", districtId: "29-0585", passwordHash: hashPw("DcOfficer@123"), totpSecret: ts, isDemo: true },
    { email: "dc.mandya@bhuvigyan.gov.in", fullName: "DC Mandya", mobile: "9999999999", role: "DC_OFFICER", stateCode: "29", districtId: "29-0565", passwordHash: hashPw("DcOfficer@123"), totpSecret: ts, isDemo: true },
  ]);
  logger.info("7 admin officers seeded.");
}

async function seedCscOperators() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(cscOperators);
  if (Number(cnt) > 0) return;
  logger.info("Seeding CSC operators...");
  await db.insert(cscOperators).values([
    { cscId: "CSC-KA-001", name: "Mohan Kumar", mobile: "9880000001", districtId: "29-0572", totalClaims: 45, fraudFlagCount: 2, isDemo: true },
    { cscId: "CSC-KA-002", name: "Ashok Rao", mobile: "9880000002", districtId: "29-0585", totalClaims: 32, fraudFlagCount: 1, isDemo: true },
    { cscId: "CSC-MH-001", name: "Sanjay Patil", mobile: "9880000003", districtId: "27-0520", totalClaims: 28, isDemo: true },
  ]);
  logger.info("3 CSC operators seeded.");
}

async function seedModelRegistry() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(modelRegistry);
  if (Number(cnt) > 0) return;

  logger.info("Seeding model_registry with V6 ensemble models...");

  await db.insert(modelRegistry).values([
    {
      modelName: "V6 RF+IF+XGB Ensemble",
      modelType: "ENSEMBLE",
      version: "v6.0-ensemble",
      description: "Production ensemble: Random Forest (35%) + Isolation Forest (40%) + XGBoost (25%). 47 features across satellite, land, bank, weather & CSC dimensions.",
      featureCount: 47,
      featureSchema: [
        "ndvi_sowing", "ndvi_claim", "ndvi_loss_pct", "ndvi_pre_sowing", "ndvi_peak",
        "ndvi_baseline_10yr", "ndvi_anomaly_score", "sar_vv_drop", "sar_vh_drop",
        "sar_flood_signature", "cloud_cover_pct", "landsat_max_ndvi", "data_source",
        "mutation_days_before", "land_use_type", "kgis_area_ha", "rtc_area_ha",
        "area_delta_pct", "tenancy_status", "co_owner_count", "parcel_boundary_confidence",
        "bank_name_match_score", "imd_weather_confirmed", "weather_event_type_match",
        "claim_amount_requested", "district_rate_ceiling", "over_insurance_ratio",
        "csc_daily_submissions", "csc_weekly_submissions", "csc_fraud_rate", "csc_bulk_flag",
        "same_bank_cluster_count", "cross_state_flag", "duplicate_active_policy",
        "operator_risk_score", "crop_phenology_match", "declared_sowing_window_valid",
        "harvest_date_consistent", "seasonal_ndvi_pattern", "days_from_sowing_to_claim",
        "expected_growth_period_days", "state_code", "state_rule_pack_version",
        "active_rule_hits", "hard_rule_override", "confidence_score", "ensemble_score",
      ],
      metrics: {
        precision: 0.941, recall: 0.887, f1: 0.913, auc_roc: 0.967,
        accuracy: 0.942, false_positive_rate: 0.058, false_negative_rate: 0.113,
      },
      thresholds: { auto_approve: 30, officer_review: 60, cce_visit: 80, auto_reject: 81 },
      isActive: true,
      isProduction: true,
      deployedAt: new Date("2025-01-15T00:00:00Z"),
      createdBy: "system",
      totalClaimsScored: 0,
      driftAlert: false,
      driftMetrics: {},
    },
    {
      modelName: "Crop Classifier CNN",
      modelType: "CROP_CLASSIFIER",
      version: "v6.1-crop-cnn",
      description: "CNN-based crop type classifier using Sentinel-2 time series. Detects crop substitution fraud (e.g., paddy declared vs actual cotton). Feeds into ensemble.",
      featureCount: 12,
      featureSchema: [
        "ndvi_timeline_7pt", "evi_timeline_7pt", "savi_value",
        "red_edge_band", "swir1_band", "swir2_band",
        "crop_phenology_match", "seasonal_pattern", "peak_ndvi_month",
        "declared_crop", "state_code", "season_type",
      ],
      metrics: { precision: 0.923, recall: 0.901, f1: 0.912, accuracy: 0.928 },
      thresholds: { crop_match_confidence: 0.80 },
      isActive: true,
      isProduction: false,
      createdBy: "system",
      totalClaimsScored: 0,
      driftAlert: false,
      driftMetrics: {},
    },
    {
      modelName: "Isolation Forest Anomaly Detector",
      modelType: "ANOMALY_DETECTOR",
      version: "v6.0-iforest",
      description: "Unsupervised Isolation Forest trained on 200k legitimate claims. Flags statistical outliers in NDVI patterns, area claims, and CSC submission velocity.",
      featureCount: 18,
      featureSchema: [
        "ndvi_sowing", "ndvi_claim", "ndvi_loss_pct", "ndvi_anomaly_score",
        "sar_vv_drop", "sar_vh_drop", "kgis_area_ha", "area_delta_pct",
        "claim_amount_requested", "over_insurance_ratio", "csc_daily_submissions",
        "csc_weekly_submissions", "same_bank_cluster_count", "mutation_days_before",
        "days_from_sowing_to_claim", "cloud_cover_pct", "operator_risk_score", "csc_fraud_rate",
      ],
      metrics: { precision: 0.856, recall: 0.912, f1: 0.883, contamination_rate: 0.12 },
      thresholds: { anomaly_threshold: -0.1 },
      isActive: true,
      isProduction: false,
      createdBy: "system",
      totalClaimsScored: 0,
      driftAlert: false,
      driftMetrics: {},
    },
    {
      modelName: "Timeline Validator XGBoost",
      modelType: "TIMELINE_VALIDATOR",
      version: "v6.0-xgb-timeline",
      description: "XGBoost model validating crop growth timeline consistency. Detects retroactive claims, phenology mismatches, and impossible growth-to-harvest sequences.",
      featureCount: 8,
      featureSchema: [
        "declared_sowing_window_valid", "harvest_date_consistent", "crop_phenology_match",
        "days_from_sowing_to_claim", "expected_growth_period_days",
        "seasonal_ndvi_pattern", "peak_ndvi_month", "imd_weather_confirmed",
      ],
      metrics: { precision: 0.934, recall: 0.878, f1: 0.905, accuracy: 0.921 },
      thresholds: { timeline_validity_score: 0.75 },
      isActive: true,
      isProduction: false,
      createdBy: "system",
      totalClaimsScored: 0,
      driftAlert: false,
      driftMetrics: {},
    },
  ]);

  logger.info("model_registry seeded with 4 V6 models.");
}

async function seedCropPhenology() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(cropPhenologyCalendar);
  if (Number(cnt) > 0) return;

  logger.info("Seeding crop_phenology_calendar...");

  await db.insert(cropPhenologyCalendar).values([
    { cropType: "PADDY",         seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 7,  harvestMonthStart: 10, harvestMonthEnd: 11, peakNdviMonth: 9,  expectedPeakNdvi: "0.72", minHealthyNdvi: "0.40" },
    { cropType: "PADDY",         seasonType: "RABI",    sowingMonthStart: 11, sowingMonthEnd: 12, harvestMonthStart: 3,  harvestMonthEnd: 4,  peakNdviMonth: 2,  expectedPeakNdvi: "0.68", minHealthyNdvi: "0.38" },
    { cropType: "WHEAT",         seasonType: "RABI",    sowingMonthStart: 10, sowingMonthEnd: 12, harvestMonthStart: 3,  harvestMonthEnd: 4,  peakNdviMonth: 2,  expectedPeakNdvi: "0.78", minHealthyNdvi: "0.45" },
    { cropType: "COTTON",        seasonType: "KHARIF",  sowingMonthStart: 5,  sowingMonthEnd: 6,  harvestMonthStart: 10, harvestMonthEnd: 12, peakNdviMonth: 8,  expectedPeakNdvi: "0.65", minHealthyNdvi: "0.35" },
    { cropType: "SOYBEAN",       seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 7,  harvestMonthStart: 10, harvestMonthEnd: 11, peakNdviMonth: 9,  expectedPeakNdvi: "0.70", minHealthyNdvi: "0.42" },
    { cropType: "MAIZE",         seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 7,  harvestMonthStart: 9,  harvestMonthEnd: 10, peakNdviMonth: 8,  expectedPeakNdvi: "0.75", minHealthyNdvi: "0.45" },
    { cropType: "GROUNDNUT",     seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 7,  harvestMonthStart: 9,  harvestMonthEnd: 10, peakNdviMonth: 8,  expectedPeakNdvi: "0.60", minHealthyNdvi: "0.32" },
    { cropType: "SUGARCANE",     seasonType: "KHARIF",  sowingMonthStart: 2,  sowingMonthEnd: 4,  harvestMonthStart: 11, harvestMonthEnd: 2,  peakNdviMonth: 9,  expectedPeakNdvi: "0.80", minHealthyNdvi: "0.50" },
    { cropType: "MUSTARD",       seasonType: "RABI",    sowingMonthStart: 10, sowingMonthEnd: 11, harvestMonthStart: 2,  harvestMonthEnd: 3,  peakNdviMonth: 1,  expectedPeakNdvi: "0.68", minHealthyNdvi: "0.38" },
    { cropType: "SUNFLOWER",     seasonType: "RABI",    sowingMonthStart: 10, sowingMonthEnd: 12, harvestMonthStart: 2,  harvestMonthEnd: 4,  peakNdviMonth: 1,  expectedPeakNdvi: "0.62", minHealthyNdvi: "0.33" },
    { cropType: "CHICKPEA",      seasonType: "RABI",    sowingMonthStart: 10, sowingMonthEnd: 11, harvestMonthStart: 2,  harvestMonthEnd: 3,  peakNdviMonth: 1,  expectedPeakNdvi: "0.58", minHealthyNdvi: "0.30" },
    { cropType: "PIGEON_PEA",    seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 7,  harvestMonthStart: 11, harvestMonthEnd: 12, peakNdviMonth: 9,  expectedPeakNdvi: "0.62", minHealthyNdvi: "0.34" },
    { cropType: "JOWAR",         seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 7,  harvestMonthStart: 9,  harvestMonthEnd: 10, peakNdviMonth: 8,  expectedPeakNdvi: "0.65", minHealthyNdvi: "0.36" },
    { cropType: "BAJRA",         seasonType: "KHARIF",  sowingMonthStart: 7,  sowingMonthEnd: 8,  harvestMonthStart: 10, harvestMonthEnd: 11, peakNdviMonth: 9,  expectedPeakNdvi: "0.60", minHealthyNdvi: "0.30" },
    { cropType: "ONION",         seasonType: "RABI",    sowingMonthStart: 10, sowingMonthEnd: 11, harvestMonthStart: 1,  harvestMonthEnd: 3,  peakNdviMonth: 12, expectedPeakNdvi: "0.55", minHealthyNdvi: "0.28" },
    { cropType: "TOMATO",        seasonType: "KHARIF",  sowingMonthStart: 6,  sowingMonthEnd: 8,  harvestMonthStart: 9,  harvestMonthEnd: 11, peakNdviMonth: 8,  expectedPeakNdvi: "0.58", minHealthyNdvi: "0.30" },
  ]);

  logger.info("crop_phenology_calendar seeded with 16 crop-season entries.");
}

async function seedInsurerAccounts() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(insurerAccounts);
  if (Number(cnt) > 0) return;

  logger.info("Seeding insurer_accounts...");

  await db.insert(insurerAccounts).values([
    {
      insurerCode: "NICL",
      insurerName: "National Insurance Company Ltd.",
      states: ["KA", "MH", "TG", "AP"],
      passwordHash: hashPw("Nicl@2025"),
      isActive: true,
    },
    {
      insurerCode: "AIC",
      insurerName: "Agriculture Insurance Company of India Ltd.",
      states: ["KA", "MH", "RJ", "PB", "UP", "TG"],
      passwordHash: hashPw("Aic@2025"),
      isActive: true,
    },
    {
      insurerCode: "HDFC_ERGO",
      insurerName: "HDFC ERGO General Insurance Co. Ltd.",
      states: ["MH", "GJ", "PB"],
      passwordHash: hashPw("HdfcErgo@2025"),
      isActive: true,
    },
    {
      insurerCode: "RELIANCE_GI",
      insurerName: "Reliance General Insurance Co. Ltd.",
      states: ["MH", "RJ", "UP"],
      passwordHash: hashPw("RelianceGi@2025"),
      isActive: true,
    },
    {
      insurerCode: "BAJAJ_ALLIANZ",
      insurerName: "Bajaj Allianz General Insurance Co. Ltd.",
      states: ["KA", "MH", "TG", "GJ"],
      passwordHash: hashPw("BajajAllianz@2025"),
      isActive: true,
    },
    {
      insurerCode: "SBI_GI",
      insurerName: "SBI General Insurance Co. Ltd.",
      states: ["KA", "PB", "UP", "MP"],
      passwordHash: hashPw("SbiGi@2025"),
      isActive: true,
    },
  ]);

  logger.info("insurer_accounts seeded with 6 PMFBY insurers.");
}

async function seedUdlrn() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(udlrnMaster);
  if (Number(cnt) > 0) return;
  logger.info("Seeding UDLRN records...");
  const fr = await db.select({ id: farmers.id, mobile: farmers.mobile }).from(farmers);
  const fm = new Map(fr.map(f => [f.mobile, f.id]));
  await db.insert(udlrnMaster).values([
    { udlrn: "29-0572-A3F8C1-07", farmerId: fm.get("9900000001"), stateCode: "29", districtId: "29-0572", talukId: "29-0572-T01", hobliId: "29-0572-T01-H01", villageId: "29-0572-T01-H01-V01", surveyNumber: "SY7", kgisAreaHa: "2.5000", rtcAreaHa: "2.4500", landOwnerName: "Ramesh Gowda", tenancyStatus: "OWNER", landUseType: "AGRICULTURAL", centroidLat: "13.34520000", centroidLng: "76.98710000", landsatBaselineNdvi: "0.4500", historicalCrops: ["PADDY","RAGI"], payoutAccountNo: "12345678901234", payoutIfsc: "SBIN0040123", payoutBankName: "SBI", payoutBranchName: "Tumakuru", bankNameMatchScore: "95.00", isDemo: true },
    { udlrn: "29-0585-B2E9D4-15", farmerId: fm.get("9900000002"), stateCode: "29", districtId: "29-0585", talukId: "29-0585-T01", hobliId: "29-0585-T01-H01", villageId: "29-0585-T01-H01-V01", surveyNumber: "SY15", kgisAreaHa: "1.8000", rtcAreaHa: "1.7500", landOwnerName: "Lakshmi Devi", tenancyStatus: "OWNER", landUseType: "AGRICULTURAL", centroidLat: "13.10070000", centroidLng: "77.59630000", landsatBaselineNdvi: "0.5200", historicalCrops: ["PADDY"], payoutAccountNo: "98765432109876", payoutIfsc: "HDFC0001234", payoutBankName: "HDFC", payoutBranchName: "Yelahanka", bankNameMatchScore: "98.00", isDemo: true },
    { udlrn: "27-0004-C1D7E5-23", farmerId: fm.get("9900000004"), stateCode: "27", districtId: "27-0520", talukId: "27-0520-T01", hobliId: "27-0520-T01-H01", villageId: "27-0520-T01-H01-V01", surveyNumber: "SY23", kgisAreaHa: "3.2000", rtcAreaHa: "3.1000", landOwnerName: "Savitribai Patil", tenancyStatus: "OWNER", landUseType: "AGRICULTURAL", centroidLat: "18.52140000", centroidLng: "73.85730000", landsatBaselineNdvi: "0.4800", historicalCrops: ["COTTON","SOYBEAN"], payoutAccountNo: "11223344556677", payoutIfsc: "BOB0001234", payoutBankName: "BOB", payoutBranchName: "Pune", bankNameMatchScore: "92.00", isDemo: true },
    { udlrn: "29-0572-D4F0A2-11", farmerId: fm.get("9900000003"), stateCode: "29", districtId: "29-0572", talukId: "29-0572-T02", hobliId: "29-0572-T02-H01", villageId: "29-0572-T02-H01-V01", surveyNumber: "SY11", kgisAreaHa: "1.5000", rtcAreaHa: "1.4800", landOwnerName: "Venkataramana", tenancyStatus: "TENANT", landUseType: "AGRICULTURAL", centroidLat: "13.28940000", centroidLng: "77.04210000", landsatBaselineNdvi: "0.3800", historicalCrops: ["RAGI","MAIZE"], payoutAccountNo: "55667788990011", payoutIfsc: "KARN0000123", payoutBankName: "Karnataka Bank", payoutBranchName: "Koratagere", bankNameMatchScore: "88.00", isDemo: true },
    { udlrn: "29-0565-E5A1B3-09", farmerId: fm.get("9900000001"), stateCode: "29", districtId: "29-0565", talukId: "29-0565-T01", hobliId: "29-0565-T01-H01", villageId: "29-0565-T01-H01-V01", surveyNumber: "SY9", kgisAreaHa: "2.0000", rtcAreaHa: "1.9500", landOwnerName: "Ramesh Gowda", tenancyStatus: "OWNER", landUseType: "AGRICULTURAL", centroidLat: "12.52340000", centroidLng: "76.89620000", landsatBaselineNdvi: "0.5500", historicalCrops: ["PADDY","SUGARCANE"], payoutAccountNo: "22334455667788", payoutIfsc: "SBIN0040456", payoutBankName: "SBI", payoutBranchName: "Mandya", bankNameMatchScore: "96.00", isDemo: true },
    { udlrn: "36-0536-F6C2D4-05", farmerId: fm.get("9900000005"), stateCode: "36", districtId: "36-0536", surveyNumber: "SY5", kgisAreaHa: "4.0000", rtcAreaHa: "3.9000", landOwnerName: "Rajesh Reddy", tenancyStatus: "OWNER", landUseType: "AGRICULTURAL", centroidLat: "17.38500000", centroidLng: "78.48670000", landsatBaselineNdvi: "0.4200", historicalCrops: ["COTTON","PADDY"], payoutAccountNo: "99887766554433", payoutIfsc: "SBIN0020123", payoutBankName: "SBI", payoutBranchName: "Hyderabad", bankNameMatchScore: "94.00", isDemo: true },
  ]);
  logger.info("6 UDLRN records seeded.");
}

async function seedClaims() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(claims);
  if (Number(cnt) > 0) return;
  logger.info("Seeding demo claims...");
  const fr = await db.select({ id: farmers.id, mobile: farmers.mobile }).from(farmers);
  const fm = new Map(fr.map(f => [f.mobile, f.id]));
  const cr = await db.select({ id: cscOperators.id, cscId: cscOperators.cscId }).from(cscOperators);
  const cm = new Map(cr.map(c => [c.cscId, c.id]));
  await db.insert(claims).values([
    { claimNumber: "CLM-2025-KA-001", udlrn: "29-0572-A3F8C1-07", farmerId: fm.get("9900000001"), cscOperatorId: cm.get("CSC-KA-001"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "DROUGHT", damageDate: "2025-08-15", declaredSowingDate: "2025-06-15", declaredCrop: "PADDY", claimAmountRequested: "25000.00", approvedAmount: "25000.00", status: "AUTO_APPROVED", pipelineStage: "VERDICT", fraudScore: "15.00", fraudConfidence: "92.00", fraudFlags: [], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "12.50", ndviSowing: "0.4500", ndviClaim: "0.2800", ndviLossPct: "37.78", imdWeatherConfirmed: true, imdDisasterType: "DROUGHT", kgisAreaHa: "2.5000", rtcAreaHa: "2.4500", areaDeltaPct: "2.04", filedAt: new Date("2025-08-16T10:30:00Z"), landVerifiedAt: new Date("2025-08-16T10:30:05Z"), satelliteProcessedAt: new Date("2025-08-16T10:30:15Z"), scoredAt: new Date("2025-08-16T10:30:20Z"), decidedAt: new Date("2025-08-16T10:30:22Z"), cropPhenologyMatch: true, isDemo: true },
    { claimNumber: "CLM-2025-KA-002", udlrn: "29-0585-B2E9D4-15", farmerId: fm.get("9900000002"), cscOperatorId: cm.get("CSC-KA-002"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "FLOOD", damageDate: "2025-09-01", declaredSowingDate: "2025-06-20", declaredCrop: "PADDY", claimAmountRequested: "18000.00", status: "OFFICER_REVIEW", pipelineStage: "VERDICT", fraudScore: "45.00", fraudConfidence: "78.00", fraudFlags: ["AREA_DELTA_HIGH","BANK_MISMATCH"], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "35.00", ndviSowing: "0.5200", ndviClaim: "0.3100", ndviLossPct: "40.38", imdWeatherConfirmed: true, imdDisasterType: "FLOOD", kgisAreaHa: "1.8000", rtcAreaHa: "1.7500", areaDeltaPct: "2.86", filedAt: new Date("2025-09-02T14:15:00Z"), scoredAt: new Date("2025-09-02T14:15:20Z"), decidedAt: new Date("2025-09-02T14:15:22Z"), cropPhenologyMatch: true, isDemo: true },
    { claimNumber: "CLM-2025-KA-003", udlrn: "29-0572-D4F0A2-11", farmerId: fm.get("9900000003"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "DROUGHT", damageDate: "2025-08-20", declaredSowingDate: "2025-06-10", declaredCrop: "RAGI", claimAmountRequested: "12000.00", status: "CCE_VISIT", pipelineStage: "VERDICT", fraudScore: "72.00", fraudConfidence: "85.00", fraudFlags: ["MUTATION_TIMING","AREA_DELTA_HIGH"], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "8.00", ndviSowing: "0.3800", ndviClaim: "0.2200", ndviLossPct: "42.11", imdWeatherConfirmed: false, kgisAreaHa: "1.5000", rtcAreaHa: "1.4200", areaDeltaPct: "5.63", rtcMutationDaysBefore: 12, filedAt: new Date("2025-08-21T09:00:00Z"), scoredAt: new Date("2025-08-21T09:00:20Z"), decidedAt: new Date("2025-08-21T09:00:22Z"), cropPhenologyMatch: false, isDemo: true },
    { claimNumber: "CLM-2025-KA-004", udlrn: "29-0572-A3F8C1-07", farmerId: fm.get("9900000001"), cscOperatorId: cm.get("CSC-KA-001"), insurerCode: "AIC", season: "RABI-2024", seasonType: "RABI", damageType: "HAILSTORM", damageDate: "2025-01-10", declaredSowingDate: "2024-11-15", declaredCrop: "PADDY", claimAmountRequested: "30000.00", status: "AUTO_REJECTED", pipelineStage: "VERDICT", fraudScore: "88.00", fraudConfidence: "94.00", fraudFlags: ["MUTATION_TIMING","OVER_INSURANCE","DUPLICATE_POLICY","CSC_BULK"], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "5.00", ndviSowing: "0.6800", ndviClaim: "0.6500", ndviLossPct: "4.41", imdWeatherConfirmed: false, kgisAreaHa: "2.5000", rtcAreaHa: "2.4500", areaDeltaPct: "2.04", filedAt: new Date("2025-01-11T16:45:00Z"), scoredAt: new Date("2025-01-11T16:45:20Z"), decidedAt: new Date("2025-01-11T16:45:22Z"), firAlertSent: true, firAlertSentTo: "dc.tumkur@bhuvigyan.gov.in", cropPhenologyMatch: false, isDemo: true },
    { claimNumber: "CLM-2025-MH-001", udlrn: "27-0004-C1D7E5-23", farmerId: fm.get("9900000004"), cscOperatorId: cm.get("CSC-MH-001"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "DROUGHT", damageDate: "2025-08-25", declaredSowingDate: "2025-06-05", declaredCrop: "COTTON", claimAmountRequested: "35000.00", approvedAmount: "35000.00", status: "AUTO_APPROVED", pipelineStage: "VERDICT", fraudScore: "12.00", fraudConfidence: "95.00", fraudFlags: [], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "10.00", ndviSowing: "0.4800", ndviClaim: "0.2500", ndviLossPct: "47.92", imdWeatherConfirmed: true, imdDisasterType: "DROUGHT", kgisAreaHa: "3.2000", rtcAreaHa: "3.1000", areaDeltaPct: "3.23", filedAt: new Date("2025-08-26T11:00:00Z"), scoredAt: new Date("2025-08-26T11:00:20Z"), decidedAt: new Date("2025-08-26T11:00:22Z"), cropPhenologyMatch: true, isDemo: true },
    { claimNumber: "CLM-2025-KA-005", udlrn: "29-0565-E5A1B3-09", farmerId: fm.get("9900000001"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "FLOOD", damageDate: "2025-09-05", declaredSowingDate: "2025-06-25", declaredCrop: "PADDY", claimAmountRequested: "22000.00", status: "FILED", pipelineStage: "LAND_VERIFICATION", fraudFlags: [], flagBreakdown: {}, filedAt: new Date("2025-09-06T08:20:00Z"), isDemo: true },
    { claimNumber: "CLM-2025-TG-001", udlrn: "36-0536-F6C2D4-05", farmerId: fm.get("9900000005"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "DROUGHT", damageDate: "2025-08-30", declaredSowingDate: "2025-06-10", declaredCrop: "COTTON", claimAmountRequested: "40000.00", approvedAmount: "40000.00", status: "AUTO_APPROVED", pipelineStage: "VERDICT", fraudScore: "18.00", fraudConfidence: "91.00", fraudFlags: [], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "15.00", ndviSowing: "0.4200", ndviClaim: "0.2300", ndviLossPct: "45.24", imdWeatherConfirmed: true, imdDisasterType: "DROUGHT", kgisAreaHa: "4.0000", rtcAreaHa: "3.9000", areaDeltaPct: "2.56", filedAt: new Date("2025-08-31T15:00:00Z"), scoredAt: new Date("2025-08-31T15:00:20Z"), decidedAt: new Date("2025-08-31T15:00:22Z"), cropPhenologyMatch: true, isDemo: true },
    { claimNumber: "CLM-2025-KA-006", udlrn: "29-0585-B2E9D4-15", farmerId: fm.get("9900000002"), cscOperatorId: cm.get("CSC-KA-002"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "EXCESS_RAIN", damageDate: "2025-09-10", declaredSowingDate: "2025-06-18", declaredCrop: "PADDY", claimAmountRequested: "15000.00", status: "OFFICER_REVIEW", pipelineStage: "VERDICT", fraudScore: "55.00", fraudConfidence: "80.00", fraudFlags: ["BANK_MISMATCH"], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "28.00", ndviSowing: "0.5100", ndviClaim: "0.3000", ndviLossPct: "41.18", imdWeatherConfirmed: true, imdDisasterType: "EXCESS_RAIN", kgisAreaHa: "1.8000", rtcAreaHa: "1.7500", areaDeltaPct: "2.86", filedAt: new Date("2025-09-11T12:30:00Z"), scoredAt: new Date("2025-09-11T12:30:20Z"), decidedAt: new Date("2025-09-11T12:30:22Z"), cropPhenologyMatch: true, isDemo: true },
    { claimNumber: "CLM-2025-KA-007", udlrn: "29-0572-A3F8C1-07", farmerId: fm.get("9900000001"), cscOperatorId: cm.get("CSC-KA-001"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "PEST_ATTACK", damageDate: "2025-09-15", declaredSowingDate: "2025-06-12", declaredCrop: "PADDY", claimAmountRequested: "20000.00", status: "CCE_VISIT", pipelineStage: "VERDICT", fraudScore: "75.00", fraudConfidence: "82.00", fraudFlags: ["CSC_BULK","OVER_INSURANCE"], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "20.00", ndviSowing: "0.4400", ndviClaim: "0.2900", ndviLossPct: "34.09", imdWeatherConfirmed: false, kgisAreaHa: "2.5000", rtcAreaHa: "2.4500", areaDeltaPct: "2.04", filedAt: new Date("2025-09-16T10:00:00Z"), scoredAt: new Date("2025-09-16T10:00:20Z"), decidedAt: new Date("2025-09-16T10:00:22Z"), cropPhenologyMatch: false, isDemo: true },
    { claimNumber: "CLM-2025-KA-008", udlrn: "29-0572-D4F0A2-11", farmerId: fm.get("9900000003"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "DROUGHT", damageDate: "2025-08-18", declaredSowingDate: "2025-06-08", declaredCrop: "MAIZE", claimAmountRequested: "10000.00", approvedAmount: "10000.00", status: "AUTO_APPROVED", pipelineStage: "VERDICT", fraudScore: "8.00", fraudConfidence: "96.00", fraudFlags: [], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "6.00", ndviSowing: "0.3700", ndviClaim: "0.1900", ndviLossPct: "48.65", imdWeatherConfirmed: true, imdDisasterType: "DROUGHT", kgisAreaHa: "1.5000", rtcAreaHa: "1.4800", areaDeltaPct: "1.35", filedAt: new Date("2025-08-19T09:30:00Z"), scoredAt: new Date("2025-08-19T09:30:20Z"), decidedAt: new Date("2025-08-19T09:30:22Z"), cropPhenologyMatch: true, isDemo: true },
    { claimNumber: "CLM-2025-MH-002", udlrn: "27-0004-C1D7E5-23", farmerId: fm.get("9900000004"), cscOperatorId: cm.get("CSC-MH-001"), insurerCode: "AIC", season: "KHARIF-2025", seasonType: "KHARIF", damageType: "FLOOD", damageDate: "2025-09-08", declaredSowingDate: "2025-06-01", declaredCrop: "SOYBEAN", claimAmountRequested: "28000.00", status: "OFFICER_REVIEW", pipelineStage: "VERDICT", fraudScore: "52.00", fraudConfidence: "76.00", fraudFlags: ["AREA_DELTA_HIGH"], flagBreakdown: {}, modelVersion: "v6.0-ensemble", dataSource: "SENTINEL_2", cloudCoverPct: "40.00", ndviSowing: "0.4700", ndviClaim: "0.2600", ndviLossPct: "44.68", imdWeatherConfirmed: true, imdDisasterType: "FLOOD", kgisAreaHa: "3.2000", rtcAreaHa: "3.1000", areaDeltaPct: "3.23", filedAt: new Date("2025-09-09T13:45:00Z"), scoredAt: new Date("2025-09-09T13:45:20Z"), decidedAt: new Date("2025-09-09T13:45:22Z"), cropPhenologyMatch: true, isDemo: true },
  ]);
  logger.info("11 demo claims seeded.");
}

async function seedHeatmap() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(fraudHeatmapDaily);
  if (Number(cnt) > 0) return;
  logger.info("Seeding fraud heatmap...");
  const d = new Date().toISOString().split("T")[0];
  await db.insert(fraudHeatmapDaily).values([
    { districtId: "29-0572", computedDate: d, totalClaims: 45, fraudClaims: 8, approvedClaims: 30, pendingClaims: 7, fraudRate: "17.78", totalAmountRisk: "250000.00", amountSaved: "180000.00", topFraudType: "MUTATION_TIMING", topFraudFlag: "MUTATION_TIMING" },
    { districtId: "29-0585", computedDate: d, totalClaims: 32, fraudClaims: 3, approvedClaims: 25, pendingClaims: 4, fraudRate: "9.38", totalAmountRisk: "95000.00", amountSaved: "72000.00", topFraudType: "BANK_MISMATCH", topFraudFlag: "BANK_MISMATCH" },
    { districtId: "29-0565", computedDate: d, totalClaims: 28, fraudClaims: 2, approvedClaims: 22, pendingClaims: 4, fraudRate: "7.14", totalAmountRisk: "65000.00", amountSaved: "50000.00", topFraudType: "AREA_DELTA", topFraudFlag: "AREA_DELTA_HIGH" },
    { districtId: "27-0520", computedDate: d, totalClaims: 38, fraudClaims: 5, approvedClaims: 28, pendingClaims: 5, fraudRate: "13.16", totalAmountRisk: "180000.00", amountSaved: "120000.00", topFraudType: "CSC_BULK", topFraudFlag: "CSC_BULK" },
    { districtId: "36-0536", computedDate: d, totalClaims: 22, fraudClaims: 1, approvedClaims: 18, pendingClaims: 3, fraudRate: "4.55", totalAmountRisk: "40000.00", amountSaved: "30000.00", topFraudType: "OVER_INSURANCE", topFraudFlag: "OVER_INSURANCE" },
  ]);
  logger.info("5 heatmap entries seeded.");
}

async function seedRuleProfiles() {
  const [{ cnt }] = await db.select({ cnt: count() }).from(ruleProfiles);
  if (Number(cnt) > 0) return;
  logger.info("Seeding rule profiles...");
  await db.insert(ruleProfiles).values([
    { stateCode: "29", seasonType: "KHARIF", profileName: "Karnataka Kharif 2025", autoApproveThreshold: 30, officerReviewThreshold: 60, cceVisitThreshold: 80, autoRejectThreshold: 81, mutationDaysAlert: 30, cscDailyBulkLimit: 20, bankNameMatchMinScore: 80, areaDeltaMaxPct: "20", overInsuranceMaxRatio: "1.5", minBaselineNdvi: "0.1500", isActive: true, createdBy: "system" },
    { stateCode: "27", seasonType: "KHARIF", profileName: "Maharashtra Kharif 2025", autoApproveThreshold: 25, officerReviewThreshold: 55, cceVisitThreshold: 75, autoRejectThreshold: 76, mutationDaysAlert: 25, cscDailyBulkLimit: 15, bankNameMatchMinScore: 85, areaDeltaMaxPct: "15", overInsuranceMaxRatio: "1.3", minBaselineNdvi: "0.1200", isActive: true, createdBy: "system" },
    { stateCode: "36", seasonType: "KHARIF", profileName: "Telangana Kharif 2025", autoApproveThreshold: 30, officerReviewThreshold: 60, cceVisitThreshold: 80, autoRejectThreshold: 81, mutationDaysAlert: 30, cscDailyBulkLimit: 20, bankNameMatchMinScore: 80, areaDeltaMaxPct: "20", overInsuranceMaxRatio: "1.5", minBaselineNdvi: "0.1500", isActive: true, createdBy: "system" },
  ]);
  logger.info("3 rule profiles seeded.");
}

export async function runSeedIfEmpty() {
  try {
    // Sequential due to foreign-key dependencies
    await seedLocationData();
    await seedFarmers();
    await seedAdminOfficers();
    await seedCscOperators();
    await seedUdlrn();
    // Parallel-safe (no FK deps on each other)
    await Promise.all([
      seedModelRegistry(),
      seedCropPhenology(),
      seedInsurerAccounts(),
    ]);
    // Claims depend on farmers + CSC + UDLRN (already seeded above)
    await seedClaims();
    await seedHeatmap();
    await seedRuleProfiles();
    logger.info("Seed check complete.");
  } catch (err: any) {
    logger.error({ err: err.message }, "Seed error — non-fatal, continuing startup.");
  }
}
