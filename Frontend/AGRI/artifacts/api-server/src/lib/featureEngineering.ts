import { createHash } from "crypto";

export interface ClaimContext {
  udlrn: string;
  farmerId: string;
  declaredCrop: string;
  damageType: string;
  damageDate: string;
  declaredSowingDate: string;
  claimAmountRequested: string;
  season: string;
  seasonType: string;
  stateCode?: string;
  cscOperatorId?: string;
  areaHa?: number;
  ndviSowing?: number;
  ndviClaim?: number;
  ndviLossPct?: number;
}

export interface FeatureVector {
  // Land parcel features (1-5)
  f1_parcel_area_ha: number;
  f2_land_use_type: number;
  f3_soil_type_code: number;
  f4_irrigation_source: number;
  f5_slope_category: number;

  // Farmer history features (6-10)
  f6_farmer_claim_count_12m: number;
  f7_farmer_claim_count_36m: number;
  f8_farmer_avg_claim_amount: number;
  f9_farmer_blacklist_status: number;
  f10_farmer_account_age_days: number;

  // CSC operator features (11-15)
  f11_csc_fraud_rate: number;
  f12_csc_monthly_volume: number;
  f13_csc_avg_claim_amount: number;
  f14_csc_operator_tenure_days: number;
  f15_csc_district_rank: number;

  // Temporal features (16-20)
  f16_days_since_sowing: number;
  f17_days_to_season_end: number;
  f18_damage_date_phenology: number;
  f19_claim_filing_delay_days: number;
  f20_hour_of_filing: number;

  // NDVI/satellite features (21-25)
  f21_ndvi_sowing: number;
  f22_ndvi_claim: number;
  f23_ndvi_loss_pct: number;
  f24_ndvi_decline_rate: number;
  f25_cloud_cover_pct: number;

  // Crop-specific features (26-30)
  f26_crop_type_code: number;
  f27_crop_normal_yield: number;
  f28_crop_price_per_ton: number;
  f29_crop_sowing_window_start: number;
  f30_crop_sowing_window_end: number;

  // Geographic features (31-35)
  f31_state_code: number;
  f32_district_code: number;
  f33_rainfall_mm_season: number;
  f34_temperature_avg_c: number;
  f35_drought_index: number;

  // Cross-state features (36-40)
  f36_cross_state_flag: number;
  f37_distance_to_border_km: number;
  f38_nearby_state_fraud_rate: number;
  f39_interstate_claim_pattern: number;
  f40_multi_parcel_farmer: number;

  // Mutation/ownership features (41-45)
  f41_recent_mutation_count: number;
  f42_mutation_recency_days: number;
  f43_ownership_stability_score: number;
  f44_ownership_transfer_count: number;
  f45_suspicious_mutation_flag: number;

  // Behavioral features (46-47)
  f46_claim_amount_ratio: number;
  f47_device_fingerprint_hash: number;
}

function hashUdlrn(udlrn: string): number {
  const hash = createHash("sha256").update(udlrn).digest("hex");
  return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

export function extractFeatures(context: ClaimContext): FeatureVector {
  const hash = hashUdlrn(context.udlrn);
  const now = new Date();
  const damageDate = new Date(context.damageDate);
  const sowingDate = new Date(context.declaredSowingDate);

  const daysSinceSowing = Math.floor((now.getTime() - sowingDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysToSeasonEnd = Math.max(0, 90 - daysSinceSowing);
  const filingDelay = Math.floor((now.getTime() - damageDate.getTime()) / (1000 * 60 * 60 * 24));

  // Deterministic values based on hash for simulation
  const areaHa = context.areaHa || (0.5 + hash * 4.5);
  const ndviSowing = context.ndviSowing || (0.3 + hash * 0.5);
  const ndviClaim = context.ndviClaim || (0.2 + hash * 0.3);
  const ndviLossPct = context.ndviLossPct || ((ndviSowing - ndviClaim) / ndviSowing) * 100;

  // Crop type mapping
  const cropMap: Record<string, number> = {
    paddy: 1, wheat: 2, cotton: 3, sugarcane: 4, groundnut: 5, maize: 6,
    rice: 1, barley: 7, soybean: 8, mustard: 9, pulses: 10,
  };
  const cropCode = cropMap[context.declaredCrop.toLowerCase()] || 0;

  // State code mapping
  const stateMap: Record<string, number> = {
    MH: 1, KA: 2, RJ: 3, TG: 4, PB: 5, UP: 6,
  };
  const stateCode = stateMap[context.stateCode || "MH"] || 0;

  // Land use type (deterministic)
  const landUseType = Math.floor(hash * 3) + 1; // 1=Irrigated, 2=Rainfed, 3=Mixed

  return {
    // Land parcel features
    f1_parcel_area_ha: Number(areaHa.toFixed(2)),
    f2_land_use_type: landUseType,
    f3_soil_type_code: Math.floor(hash * 5) + 1,
    f4_irrigation_source: Math.floor(hash * 4) + 1,
    f5_slope_category: Math.floor(hash * 3) + 1,

    // Farmer history features (simulated from hash)
    f6_farmer_claim_count_12m: Math.floor(hash * 5),
    f7_farmer_claim_count_36m: Math.floor(hash * 10),
    f8_farmer_avg_claim_amount: Number((10000 + hash * 50000).toFixed(2)),
    f9_farmer_blacklist_status: hash > 0.95 ? 1 : 0,
    f10_farmer_account_age_days: Math.floor((hash * 365 * 5) + 30),

    // CSC operator features (simulated)
    f11_csc_fraud_rate: Number((hash * 0.15).toFixed(3)),
    f12_csc_monthly_volume: Math.floor(hash * 200) + 10,
    f13_csc_avg_claim_amount: Number((15000 + hash * 40000).toFixed(2)),
    f14_csc_operator_tenure_days: Math.floor(hash * 1825) + 90,
    f15_csc_district_rank: Math.floor(hash * 50) + 1,

    // Temporal features
    f16_days_since_sowing: daysSinceSowing,
    f17_days_to_season_end: daysToSeasonEnd,
    f18_damage_date_phenology: Math.min(5, Math.floor(daysSinceSowing / 30)) + 1,
    f19_claim_filing_delay_days: filingDelay,
    f20_hour_of_filing: now.getHours(),

    // NDVI/satellite features
    f21_ndvi_sowing: Number(ndviSowing.toFixed(4)),
    f22_ndvi_claim: Number(ndviClaim.toFixed(4)),
    f23_ndvi_loss_pct: Number(ndviLossPct.toFixed(2)),
    f24_ndvi_decline_rate: Number(((ndviSowing - ndviClaim) / daysSinceSowing).toFixed(6)),
    f25_cloud_cover_pct: Number((hash * 40).toFixed(1)),

    // Crop-specific features
    f26_crop_type_code: cropCode,
    f27_crop_normal_yield: Number((2 + hash * 5).toFixed(2)),
    f28_crop_price_per_ton: Number((1500 + hash * 3000).toFixed(2)),
    f29_crop_sowing_window_start: Math.floor(hash * 30) + 1,
    f30_crop_sowing_window_end: Math.floor(hash * 30) + 60,

    // Geographic features (simulated)
    f31_state_code: stateCode,
    f32_district_code: Math.floor(hash * 100) + 1,
    f33_rainfall_mm_season: Number((500 + hash * 1000).toFixed(1)),
    f34_temperature_avg_c: Number((20 + hash * 15).toFixed(1)),
    f35_drought_index: Number((hash * 100).toFixed(2)),

    // Cross-state features
    f36_cross_state_flag: context.udlrn.split("-")[0] !== context.stateCode ? 1 : 0,
    f37_distance_to_border_km: Math.floor(hash * 200),
    f38_nearby_state_fraud_rate: Number((hash * 0.12).toFixed(3)),
    f39_interstate_claim_pattern: Math.floor(hash * 3),
    f40_multi_parcel_farmer: hash > 0.7 ? 1 : 0,

    // Mutation/ownership features
    f41_recent_mutation_count: Math.floor(hash * 3),
    f42_mutation_recency_days: Math.floor(hash * 365) + 30,
    f43_ownership_stability_score: Number((0.5 + hash * 0.5).toFixed(3)),
    f44_ownership_transfer_count: Math.floor(hash * 2),
    f45_suspicious_mutation_flag: hash > 0.9 ? 1 : 0,

    // Behavioral features
    f46_claim_amount_ratio: Number((parseFloat(context.claimAmountRequested) / (areaHa * 25000)).toFixed(3)),
    f47_device_fingerprint_hash: Math.floor(hash * 1000000),
  };
}

export function getFeatureVersion(): string {
  return "v1.0";
}

export function getFeatureNames(): string[] {
  return Object.keys(extractFeatures({
    udlrn: "TEST-001",
    farmerId: "test",
    declaredCrop: "paddy",
    damageType: "drought",
    damageDate: "2024-01-01",
    declaredSowingDate: "2023-11-01",
    claimAmountRequested: "25000",
    season: "RABI",
    seasonType: "2023",
  }));
}
