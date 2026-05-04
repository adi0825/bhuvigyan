import { FeatureVector, extractFeatures, getFeatureVersion } from "./featureEngineering";

export interface ModelScore {
  score: number;
  confidence: number;
  explanation: string[];
}

export interface EnsembleResult {
  finalScore: number;
  cropModelScore: number;
  anomalyModelScore: number;
  timelineModelScore: number;
  ensembleWeights: {
    crop: number;
    anomaly: number;
    timeline: number;
  };
  explanation: string[];
  ruleHits: string[];
  modelVersion: string;
}

class CropModel {
  score(features: FeatureVector): ModelScore {
    // Crop-specific scoring based on NDVI, crop type, and yield expectations
    let score = 0.5; // baseline
    const explanation: string[] = [];

    // NDVI loss penalty
    if (features.f23_ndvi_loss_pct > 50) {
      score += 0.3;
      explanation.push(`High NDVI loss (${features.f23_ndvi_loss_pct}%)`);
    } else if (features.f23_ndvi_loss_pct > 30) {
      score += 0.15;
      explanation.push(`Moderate NDVI loss (${features.f23_ndvi_loss_pct}%)`);
    }

    // Crop type risk
    if (features.f26_crop_type_code === 1 || features.f26_crop_type_code === 2) {
      score += 0.1; // Paddy/Wheat higher risk
      explanation.push("High-risk crop type");
    }

    // Yield anomaly
    const expectedYield = features.f27_crop_normal_yield * features.f1_parcel_area_ha;
    const claimedAmount = features.f46_claim_amount_ratio * 25000 * features.f1_parcel_area_ha;
    if (claimedAmount > expectedYield * 1.5) {
      score += 0.2;
      explanation.push("Claim amount exceeds expected yield");
    }

    // Phenology mismatch
    if (features.f18_damage_date_phenology < 2) {
      score += 0.15;
      explanation.push("Damage date outside normal phenology window");
    }

    return {
      score: Math.min(score, 1.0),
      confidence: 0.85,
      explanation,
    };
  }
}

class AnomalyModel {
  score(features: FeatureVector): ModelScore {
    let score = 0.5; // baseline
    const explanation: string[] = [];

    // CSC operator fraud rate
    if (features.f11_csc_fraud_rate > 0.15) {
      score += 0.25;
      explanation.push(`High CSC fraud rate (${(features.f11_csc_fraud_rate * 100).toFixed(1)}%)`);
    }

    // Farmer claim history
    if (features.f6_farmer_claim_count_12m > 3) {
      score += 0.2;
      explanation.push(`High claim frequency (${features.f6_farmer_claim_count_12m} in 12m)`);
    }

    // Blacklist status
    if (features.f9_farmer_blacklist_status === 1) {
      score += 0.3;
      explanation.push("Farmer blacklisted");
    }

    // Cross-state flag
    if (features.f36_cross_state_flag === 1) {
      score += 0.15;
      explanation.push("Cross-state claim detected");
    }

    // Suspicious mutation
    if (features.f45_suspicious_mutation_flag === 1) {
      score += 0.25;
      explanation.push("Suspicious land ownership mutation");
    }

    // Recent mutations
    if (features.f41_recent_mutation_count > 1) {
      score += 0.1;
      explanation.push(`Multiple recent mutations (${features.f41_recent_mutation_count})`);
    }

    // Device fingerprint anomaly
    if (features.f47_device_fingerprint_hash % 100 < 5) {
      score += 0.1;
      explanation.push("Device fingerprint anomaly");
    }

    return {
      score: Math.min(score, 1.0),
      confidence: 0.8,
      explanation,
    };
  }
}

class TimelineModel {
  score(features: FeatureVector): ModelScore {
    let score = 0.5; // baseline
    const explanation: string[] = [];

    // Filing delay
    if (features.f19_claim_filing_delay_days > 30) {
      score += 0.2;
      explanation.push(`Late filing (${features.f19_claim_filing_delay_days} days)`);
    } else if (features.f19_claim_filing_delay_days > 14) {
      score += 0.1;
      explanation.push(`Delayed filing (${features.f19_claim_filing_delay_days} days)`);
    }

    // Hour of filing (suspicious patterns)
    if (features.f20_hour_of_filing >= 0 && features.f20_hour_of_filing < 6) {
      score += 0.15;
      explanation.push("Filed during unusual hours");
    }

    // Season timing
    if (features.f17_days_to_season_end < 10) {
      score += 0.1;
      explanation.push("Filed near season end");
    }

    // Sowing date anomaly
    if (features.f16_days_since_sowing > 180) {
      score += 0.15;
      explanation.push("Abnormal sowing date");
    }

    return {
      score: Math.min(score, 1.0),
      confidence: 0.75,
      explanation,
    };
  }
}

class EnsembleScorer {
  private cropModel: CropModel;
  private anomalyModel: AnomalyModel;
  private timelineModel: TimelineModel;

  constructor() {
    this.cropModel = new CropModel();
    this.anomalyModel = new AnomalyModel();
    this.timelineModel = new TimelineModel();
  }

  private calculateWeights(features: FeatureVector): { crop: number; anomaly: number; timeline: number } {
    // Dynamic weight adjustment based on feature characteristics
    let cropWeight = 0.4;
    let anomalyWeight = 0.35;
    let timelineWeight = 0.25;

    // Increase anomaly weight if high CSC fraud rate
    if (features.f11_csc_fraud_rate > 0.1) {
      anomalyWeight += 0.1;
      cropWeight -= 0.05;
      timelineWeight -= 0.05;
    }

    // Increase crop weight if significant NDVI loss
    if (features.f23_ndvi_loss_pct > 40) {
      cropWeight += 0.1;
      anomalyWeight -= 0.05;
      timelineWeight -= 0.05;
    }

    // Normalize weights
    const total = cropWeight + anomalyWeight + timelineWeight;
    return {
      crop: cropWeight / total,
      anomaly: anomalyWeight / total,
      timeline: timelineWeight / total,
    };
  }

  score(features: FeatureVector): EnsembleResult {
    const cropResult = this.cropModel.score(features);
    const anomalyResult = this.anomalyModel.score(features);
    const timelineResult = this.timelineModel.score(features);

    const weights = this.calculateWeights(features);

    const finalScore =
      cropResult.score * weights.crop +
      anomalyResult.score * weights.anomaly +
      timelineResult.score * weights.timeline;

    const allExplanations = [
      ...cropResult.explanation.map((e) => `[CROP] ${e}`),
      ...anomalyResult.explanation.map((e) => `[ANOMALY] ${e}`),
      ...timelineResult.explanation.map((e) => `[TIMELINE] ${e}`),
    ];

    const ruleHits: string[] = [];
    if (features.f9_farmer_blacklist_status === 1) ruleHits.push("FARMER_BLACKLISTED");
    if (features.f11_csc_fraud_rate > 0.15) ruleHits.push("HIGH_CSC_FRAUD_RATE");
    if (features.f36_cross_state_flag === 1) ruleHits.push("CROSS_STATE_CLAIM");
    if (features.f45_suspicious_mutation_flag === 1) ruleHits.push("SUSPICIOUS_MUTATION");
    if (features.f23_ndvi_loss_pct > 50) ruleHits.push("EXTREME_NDVI_LOSS");
    if (features.f6_farmer_claim_count_12m > 3) ruleHits.push("HIGH_CLAIM_FREQUENCY");

    return {
      finalScore: Number(finalScore.toFixed(3)),
      cropModelScore: Number(cropResult.score.toFixed(3)),
      anomalyModelScore: Number(anomalyResult.score.toFixed(3)),
      timelineModelScore: Number(timelineResult.score.toFixed(3)),
      ensembleWeights: {
        crop: Number(weights.crop.toFixed(3)),
        anomaly: Number(weights.anomaly.toFixed(3)),
        timeline: Number(weights.timeline.toFixed(3)),
      },
      explanation: allExplanations,
      ruleHits,
      modelVersion: "v1.0",
    };
  }
}

const ensembleScorer = new EnsembleScorer();

export function scoreClaim(context: any): EnsembleResult {
  const features = extractFeatures(context);
  return ensembleScorer.score(features);
}

export function getScoreBand(score: number): string {
  if (score < 0.2) return "LOW";
  if (score < 0.4) return "MEDIUM_LOW";
  if (score < 0.6) return "MEDIUM";
  if (score < 0.8) return "HIGH";
  return "CRITICAL";
}

export function getVerdict(score: number, scoreBand: string): string {
  if (score < 0.3) return "AUTO_APPROVE";
  if (score < 0.5) return "REVIEW";
  if (score < 0.7) return "FIELD_VISIT";
  return "AUTO_REJECT";
}
