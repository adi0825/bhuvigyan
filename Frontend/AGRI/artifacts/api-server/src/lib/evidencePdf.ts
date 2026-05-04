import PDFDocument from "pdfkit";
import { EnsembleResult } from "./scoringEngine";

type PDFDoc = InstanceType<typeof PDFDocument>;

export interface ClaimEvidenceData {
  claimId: string;
  claimNumber: string;
  udlrn: string;
  farmerName: string;
  mobile: string;
  stateCode: string;
  district: string;
  areaHa: number;
  declaredCrop: string;
  damageType: string;
  damageDate: string;
  claimAmount: string;
  status: string;
  fraudScore: number;
  scoreBand: string;
  verdict: string;
  scoringResult: EnsembleResult;
  satelliteData: {
    ndviSowing: number;
    ndviClaim: number;
    ndviLossPct: number;
    trueColorUrl?: string;
    ndviMapUrl?: string;
    lossMapUrl?: string;
  };
  landDetails: {
    surveyNumber: string;
    landUse: string;
    soilType: string;
    irrigation: string;
  };
  auditTrail: Array<{
    step: string;
    timestamp: string;
    actor: string;
    decision: string;
  }>;
}

export async function generateEvidencePdf(data: ClaimEvidenceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Page 1: Cover & Summary
    generateCoverPage(doc, data);
    
    // Page 2: Claim Details & Land Information
    doc.addPage();
    generateClaimDetailsPage(doc, data);
    
    // Page 3: Satellite Analysis
    doc.addPage();
    generateSatelliteAnalysisPage(doc, data);
    
    // Page 4: Fraud Analysis & Scoring
    doc.addPage();
    generateFraudAnalysisPage(doc, data);
    
    // Page 5: Audit Trail & Conclusion
    doc.addPage();
    generateAuditTrailPage(doc, data);

    doc.end();
  });
}

function generateCoverPage(doc: PDFDoc, data: ClaimEvidenceData): void {
  const { width, height } = doc.page;

  // Header
  doc.fontSize(24).font("Helvetica-Bold").text("BHUVIGYAN PMFBY", { align: "center" });
  doc.fontSize(16).font("Helvetica").text("Evidence Package", { align: "center" });
  doc.moveDown(2);

  // Claim Summary Box
  doc.rect(50, 150, width - 100, 200).stroke();
  doc.fontSize(14).font("Helvetica-Bold").text("CLAIM SUMMARY", 70, 170);
  
  doc.fontSize(11).font("Helvetica");
  let y = 200;
  doc.text(`Claim Number: ${data.claimNumber}`, 70, y);
  doc.text(`UDLRN: ${data.udlrn}`, 300, y);
  y += 25;
  doc.text(`Farmer: ${data.farmerName}`, 70, y);
  doc.text(`Mobile: ${data.mobile}`, 300, y);
  y += 25;
  doc.text(`Crop: ${data.declaredCrop}`, 70, y);
  doc.text(`Damage: ${data.damageType}`, 300, y);
  y += 25;
  doc.text(`Claim Amount: ₹${data.claimAmount}`, 70, y);
  doc.text(`Status: ${data.status}`, 300, y);
  y += 25;
  doc.text(`Fraud Score: ${data.fraudScore.toFixed(3)}`, 70, y);
  doc.text(`Verdict: ${data.verdict}`, 300, y);

  // Footer
  doc.fontSize(9).font("Helvetica").text(
    `Generated on: ${new Date().toLocaleString("en-IN")}`,
    50,
    height - 50,
    { align: "center" }
  );
}

function generateClaimDetailsPage(doc: PDFDoc, data: ClaimEvidenceData): void {
  const { width, height } = doc.page;

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text("CLAIM & LAND DETAILS", 50, 50);
  doc.moveDown(1);

  // Land Information
  doc.fontSize(12).font("Helvetica-Bold").text("Land Information", 50, 100);
  doc.fontSize(10).font("Helvetica");
  let y = 120;
  doc.text(`UDLRN: ${data.udlrn}`, 50, y);
  doc.text(`Survey Number: ${data.landDetails.surveyNumber}`, 300, y);
  y += 20;
  doc.text(`State: ${data.stateCode}`, 50, y);
  doc.text(`District: ${data.district}`, 300, y);
  y += 20;
  doc.text(`Area: ${data.areaHa} Ha`, 50, y);
  doc.text(`Land Use: ${data.landDetails.landUse}`, 300, y);
  y += 20;
  doc.text(`Soil Type: ${data.landDetails.soilType}`, 50, y);
  doc.text(`Irrigation: ${data.landDetails.irrigation}`, 300, y);

  // Crop Details
  y += 40;
  doc.fontSize(12).font("Helvetica-Bold").text("Crop & Damage Details", 50, y);
  y += 25;
  doc.fontSize(10).font("Helvetica");
  doc.text(`Declared Crop: ${data.declaredCrop}`, 50, y);
  doc.text(`Damage Type: ${data.damageType}`, 300, y);
  y += 20;
  doc.text(`Damage Date: ${data.damageDate}`, 50, y);
  doc.text(`Claim Amount: ₹${data.claimAmount}`, 300, y);

  // Footer
  doc.fontSize(9).font("Helvetica").text("Page 2 of 5", 50, height - 50, { align: "center" });
}

function generateSatelliteAnalysisPage(doc: PDFDoc, data: ClaimEvidenceData): void {
  const { width, height } = doc.page;

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text("SATELLITE ANALYSIS", 50, 50);
  doc.moveDown(1);

  // NDVI Data
  doc.fontSize(12).font("Helvetica-Bold").text("NDVI Analysis", 50, 100);
  doc.fontSize(10).font("Helvetica");
  let y = 120;
  doc.text(`NDVI at Sowing: ${data.satelliteData.ndviSowing.toFixed(4)}`, 50, y);
  doc.text(`NDVI at Claim: ${data.satelliteData.ndviClaim.toFixed(4)}`, 300, y);
  y += 20;
  doc.text(`NDVI Loss: ${data.satelliteData.ndviLossPct.toFixed(2)}%`, 50, y);
  y += 40;

  // Image Placeholders
  doc.fontSize(12).font("Helvetica-Bold").text("Satellite Imagery", 50, y);
  y += 25;
  doc.fontSize(9).font("Helvetica-Oblique").text("[True Color Image Placeholder]", 50, y);
  y += 15;
  doc.text("[NDVI Map Placeholder]", 50, y);
  y += 15;
  doc.text("[Loss Map Placeholder]", 50, y);

  // Analysis Summary
  y += 40;
  doc.fontSize(12).font("Helvetica-Bold").text("Analysis Summary", 50, y);
  y += 25;
  doc.fontSize(10).font("Helvetica");
  const lossSeverity = data.satelliteData.ndviLossPct > 50 ? "Severe" : data.satelliteData.ndviLossPct > 30 ? "Moderate" : "Mild";
  doc.text(`Loss Severity: ${lossSeverity}`, 50, y);
  y += 20;
  doc.text(`Vegetation Health: ${data.satelliteData.ndviClaim > 0.3 ? "Good" : "Poor"}`, 50, y);

  // Footer
  doc.fontSize(9).font("Helvetica").text("Page 3 of 5", 50, height - 50, { align: "center" });
}

function generateFraudAnalysisPage(doc: PDFDoc, data: ClaimEvidenceData): void {
  const { width, height } = doc.page;

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text("FRAUD ANALYSIS", 50, 50);
  doc.moveDown(1);

  // Scoring Summary
  doc.fontSize(12).font("Helvetica-Bold").text("Ensemble Scoring", 50, 100);
  doc.fontSize(10).font("Helvetica");
  let y = 120;
  doc.text(`Final Score: ${data.scoringResult.finalScore.toFixed(3)}`, 50, y);
  doc.text(`Score Band: ${data.scoreBand}`, 300, y);
  y += 20;
  doc.text(`Crop Model Score: ${data.scoringResult.cropModelScore.toFixed(3)}`, 50, y);
  doc.text(`Anomaly Model Score: ${data.scoringResult.anomalyModelScore.toFixed(3)}`, 300, y);
  y += 20;
  doc.text(`Timeline Model Score: ${data.scoringResult.timelineModelScore.toFixed(3)}`, 50, y);

  // Model Weights
  y += 30;
  doc.fontSize(12).font("Helvetica-Bold").text("Model Weights", 50, y);
  y += 25;
  doc.fontSize(10).font("Helvetica");
  doc.text(`Crop Model: ${(data.scoringResult.ensembleWeights.crop * 100).toFixed(1)}%`, 50, y);
  doc.text(`Anomaly Model: ${(data.scoringResult.ensembleWeights.anomaly * 100).toFixed(1)}%`, 200, y);
  doc.text(`Timeline Model: ${(data.scoringResult.ensembleWeights.timeline * 100).toFixed(1)}%`, 350, y);

  // Rule Hits
  y += 40;
  doc.fontSize(12).font("Helvetica-Bold").text("Rule Hits", 50, y);
  y += 25;
  doc.fontSize(10).font("Helvetica");
  if (data.scoringResult.ruleHits.length > 0) {
    data.scoringResult.ruleHits.forEach((rule, index) => {
      doc.text(`• ${rule}`, 50, y + (index * 15));
    });
  } else {
    doc.text("No rule violations detected", 50, y);
  }

  // Verdict
  y += 60;
  doc.fontSize(12).font("Helvetica-Bold").text("Final Verdict", 50, y);
  y += 25;
  doc.fontSize(14).font("Helvetica-Bold");
  const verdictColor = data.verdict === "AUTO_APPROVE" ? "green" : data.verdict === "AUTO_REJECT" ? "red" : "orange";
  doc.fillColor(verdictColor).text(data.verdict, 50, y);
  doc.fillColor("black");

  // Footer
  doc.fontSize(9).font("Helvetica").text("Page 4 of 5", 50, height - 50, { align: "center" });
}

function generateAuditTrailPage(doc: PDFDoc, data: ClaimEvidenceData): void {
  const { height } = doc.page;

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text("AUDIT TRAIL", 50, 50);
  doc.moveDown(1);

  // Audit Trail Table
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Step", 50, 100);
  doc.text("Timestamp", 150, 100);
  doc.text("Actor", 300, 100);
  doc.text("Decision", 400, 100);
  
  doc.moveTo(50, 110).lineTo(550, 110).stroke();

  let y = 125;
  doc.fontSize(9).font("Helvetica");
  data.auditTrail.forEach((entry) => {
    doc.text(entry.step, 50, y, { width: 90 });
    doc.text(entry.timestamp, 150, y, { width: 130 });
    doc.text(entry.actor, 300, y, { width: 80 });
    doc.text(entry.decision, 400, y, { width: 150 });
    y += 20;
  });

  // Conclusion
  y += 30;
  doc.fontSize(12).font("Helvetica-Bold").text("CONCLUSION", 50, y);
  y += 25;
  doc.fontSize(10).font("Helvetica");
  const conclusion = data.verdict === "AUTO_APPROVE"
    ? "This claim has passed all fraud detection checks and is recommended for automatic approval."
    : data.verdict === "AUTO_REJECT"
    ? "This claim has triggered multiple fraud indicators and is recommended for automatic rejection."
    : "This claim requires manual review due to moderate fraud risk indicators.";
  doc.text(conclusion, 50, y, { width: 500, align: "justify" });

  // Disclaimer
  y += 50;
  doc.fontSize(8).font("Helvetica-Oblique");
  doc.text(
    "Disclaimer: This evidence package is generated automatically by the Bhuvigyan V6 fraud detection system. " +
    "The analysis is based on satellite imagery, historical data, and statistical models. " +
    "Final approval decisions are subject to manual verification by authorized personnel.",
    50,
    y,
    { width: 500, align: "justify" }
  );

  // Footer
  doc.fontSize(9).font("Helvetica").text("Page 5 of 5", 50, height - 50, { align: "center" });
}
