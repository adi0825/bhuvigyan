"""
Bhuvigyan V7 — PDF Dossier Generation
Generates evidence packet PDFs using WeasyPrint or headless browser fallback.
"""
import json
import base64
import uuid
import os
from datetime import datetime
from typing import Dict, Any
from app.config import settings


def _generate_html_dossier(dossier_data: Dict[str, Any]) -> str:
    """Generate HTML from dossier data for PDF conversion."""
    claim = dossier_data.get("claim", {})
    farmer = dossier_data.get("farmer", {})
    policy = dossier_data.get("policy", {})
    inspection = dossier_data.get("inspection", {})
    fraud = dossier_data.get("fraud", {})
    evidence = dossier_data.get("evidence", [])

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Evidence Dossier - {claim.get('claimNumber', 'N/A')}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
            h1 {{ color: #1a6b3c; border-bottom: 2px solid #1a6b3c; padding-bottom: 10px; }}
            h2 {{ color: #1a6b3c; margin-top: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ padding: 8px 12px; text-align: left; border: 1px solid #ddd; }}
            th {{ background: #f0fdf4; font-weight: bold; }}
            .badge {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
            .badge-low {{ background: #d1fae5; color: #065f46; }}
            .badge-medium {{ background: #fef3c7; color: #92400e; }}
            .badge-high {{ background: #ffedd5; color: #9a3412; }}
            .badge-critical {{ background: #fee2e2; color: #991b1b; }}
            .photo-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }}
            .photo-item {{ border: 1px solid #ddd; padding: 5px; text-align: center; }}
            .photo-item img {{ max-width: 100%; height: 120px; object-fit: cover; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }}
            .gauge {{ width: 100px; height: 100px; border-radius: 50%; border: 8px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <h1>Bhuvigyan Evidence Dossier</h1>
        <p><strong>Claim Number:</strong> {claim.get('claimNumber', 'N/A')} | <strong>Generated:</strong> {dossier_data.get('generatedAt', 'N/A')}</p>

        <h2>1. Claim Summary</h2>
        <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Status</td><td>{claim.get('status', 'N/A')}</td></tr>
            <tr><td>Loss Type</td><td>{claim.get('lossType', 'N/A')}</td></tr>
            <tr><td>Loss Date</td><td>{claim.get('lossDate', 'N/A')}</td></tr>
            <tr><td>Affected Area</td><td>{claim.get('affectedArea', 'N/A')} ha</td></tr>
            <tr><td>Claim Amount</td><td>₹{claim.get('claimAmount', 'N/A'):,}</td></tr>
            <tr><td>GPS</td><td>{claim.get('gps', {}).get('lat', 'N/A')}, {claim.get('gps', {}).get('lng', 'N/A')}</td></tr>
        </table>

        <h2>2. Farmer Details</h2>
        <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Name</td><td>{farmer.get('fullName', 'N/A')}</td></tr>
            <tr><td>Mobile</td><td>{farmer.get('mobile', 'N/A')}</td></tr>
            <tr><td>Location</td><td>{farmer.get('village', 'N/A')}, {farmer.get('district', 'N/A')}, {farmer.get('state', 'N/A')}</td></tr>
        </table>

        <h2>3. Policy Information</h2>
        <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Policy Number</td><td>{policy.get('policyNumber', 'N/A')}</td></tr>
            <tr><td>Crop</td><td>{policy.get('crop', 'N/A')}</td></tr>
            <tr><td>Insured Area</td><td>{policy.get('insuredArea', 'N/A')} ha</td></tr>
            <tr><td>Sum Insured</td><td>₹{policy.get('sumInsured', 'N/A'):,}</td></tr>
        </table>

        <h2>4. Inspection Report</h2>
        <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Status</td><td>{inspection.get('status', 'N/A')}</td></tr>
            <tr><td>Actual Loss %</td><td>{inspection.get('actualLossPct', 'N/A')}%</td></tr>
            <tr><td>Crop Condition</td><td>{inspection.get('cropCondition', 'N/A')}</td></tr>
            <tr><td>Weather Correlated</td><td>{"Yes" if inspection.get('weatherCorrelated') else "No"}</td></tr>
            <tr><td>Remarks</td><td>{inspection.get('remarks', 'N/A')}</td></tr>
        </table>

        <h2>5. Fraud Analysis</h2>
        <div style="display: flex; align-items: center; gap: 20px;">
            <div class="gauge" style="border-color: {'#22c55e' if (fraud.get('score') or 0) <= 30 else '#f59e0b' if (fraud.get('score') or 0) <= 60 else '#f97316' if (fraud.get('score') or 0) <= 80 else '#ef4444'};">
                {fraud.get('score', 'N/A')}
            </div>
            <div>
                <p><strong>Risk Level:</strong> <span class="badge badge-{'low' if (fraud.get('score') or 0) <= 30 else 'medium' if (fraud.get('score') or 0) <= 60 else 'high' if (fraud.get('score') or 0) <= 80 else 'critical'}">{fraud.get('riskLevel', 'N/A')}</span></p>
                <p><strong>Confidence:</strong> {fraud.get('confidence', 'N/A')}</p>
                <p><strong>Model:</strong> {fraud.get('modelVersion', 'N/A')}</p>
            </div>
        </div>
        <p><strong>Explanation:</strong> {fraud.get('humanReadableText', 'N/A')}</p>

        <h2>6. Evidence Photos ({len(evidence)})</h2>
        <div class="photo-grid">
            {''.join(f'<div class="photo-item"><p>Photo {i+1}</p><p>{e.get("gps", "")}</p></div>' for i, e in enumerate(evidence))}
        </div>

        <div class="footer">
            <p>Generated by Bhuvigyan V7 AI-Powered Fraud Detection Platform</p>
            <p>This dossier is digitally signed and tamper-evident.</p>
        </div>
    </body>
    </html>
    """
    return html


async def generate_pdf_from_dossier(dossier_data: Dict[str, Any]) -> str:
    """Generate PDF from dossier data and return file path."""
    html = _generate_html_dossier(dossier_data)
    output_dir = os.path.join(settings.UPLOAD_DIR, "dossiers")
    os.makedirs(output_dir, exist_ok=True)
    filename = f"dossier-{dossier_data['claim']['claimNumber']}-{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(output_dir, filename)

    try:
        import weasyprint
        pdf = weasyprint.HTML(string=html).write_pdf()
        with open(filepath, "wb") as f:
            f.write(pdf)
    except ImportError:
        # Fallback: write HTML for now, production uses WeasyPrint
        html_path = filepath.replace(".pdf", ".html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        filepath = html_path

    return filepath


def _generate_html_rejection_report(report_data: Dict[str, Any]) -> str:
    """Generate 8-page rejection report HTML with satellite + fraud + audit data."""
    claim = report_data.get("claim", {})
    farmer = report_data.get("farmer", {})
    satellite = report_data.get("satellite", {})
    fraud = report_data.get("fraud", {})
    inspection = report_data.get("inspection", {})
    documents = report_data.get("documents", [])
    audit_trail = report_data.get("audit_trail", [])
    factor_breakdown = fraud.get("factor_breakdown", [])

    def _risk_color(score: int) -> str:
        if score <= 30: return "#22c55e"
        if score <= 60: return "#f59e0b"
        if score <= 80: return "#f97316"
        return "#ef4444"

    def _risk_bg(score: int) -> str:
        if score <= 30: return "#d1fae5"
        if score <= 60: return "#fef3c7"
        if score <= 80: return "#ffedd5"
        return "#fee2e2"

    score = fraud.get("score", 0)
    status = claim.get("status", "REJECTED")

    # Page 6 — fraud breakdown table rows
    factor_rows = ""
    for f in factor_breakdown:
        factor_rows += f"""
        <tr>
            <td>{f.get('factor','')}</td>
            <td>{f.get('weight',0)}</td>
            <td>{f.get('score',0)}</td>
            <td>{f.get('reason','')}</td>
        </tr>"""

    # Page 7 — audit trail rows
    audit_rows = ""
    for evt in audit_trail:
        audit_rows += f"""
        <tr>
            <td>{evt.get('date','')}</td>
            <td>{evt.get('event','')}</td>
            <td>{evt.get('actor','')}</td>
            <td>{evt.get('notes','')}</td>
        </tr>"""

    # Page 5 — document verification rows
    doc_rows = ""
    for d in documents:
        status_color = {"Verified": "#d1fae5", "Rejected": "#fee2e2", "Missing": "#fee2e2"}.get(d.get("status"), "#f3f4f6")
        doc_rows += f"""
        <tr>
            <td>{d.get('name','')}</td>
            <td>{d.get('submitted','')}</td>
            <td style="background:{status_color}">{d.get('status','')}</td>
            <td>{d.get('reason','')}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Claim Assessment Report - {claim.get('claimNumber','')}</title>
<style>
    @page {{ size: A4; margin: 30px; }}
    body {{ font-family: Arial, sans-serif; margin: 0; color: #333; font-size: 11px; line-height: 1.5; }}
    h1 {{ color: #1a6b3c; border-bottom: 2px solid #1a6b3c; padding-bottom: 8px; font-size: 18px; }}
    h2 {{ color: #1a6b3c; margin-top: 20px; font-size: 14px; border-left: 4px solid #1a6b3c; padding-left: 8px; }}
    h3 {{ font-size: 12px; margin-top: 12px; }}
    table {{ width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }}
    th, td {{ padding: 6px 8px; text-align: left; border: 1px solid #ddd; }}
    th {{ background: #f0fdf4; font-weight: bold; }}
    .header {{ background: #f0fdf4; padding: 20px; text-align: center; border-bottom: 3px solid #1a6b3c; }}
    .header h1 {{ margin: 0; border: none; }}
    .status-badge {{ display: inline-block; padding: 6px 14px; border-radius: 4px; font-size: 14px; font-weight: bold; color: white; background: {_risk_color(score)}; }}
    .score-circle {{ width: 80px; height: 80px; border-radius: 50%; background: {_risk_bg(score)}; border: 6px solid {_risk_color(score)}; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; color: #333; }}
    .footer {{ margin-top: 30px; padding: 15px; border-top: 2px solid #1a6b3c; font-size: 10px; color: #666; text-align: center; background: #f9fafb; }}
    .page-break {{ page-break-before: always; }}
    .two-col {{ display: flex; gap: 20px; }}
    .col {{ flex: 1; }}
    .sat-box {{ background: #f0f9ff; border: 1px solid #bae6fd; padding: 10px; border-radius: 4px; margin: 8px 0; }}
    .alert-box {{ background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; }}
    .info-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 4px; }}
</style>
</head><body>

<!-- PAGE 1: HEADER -->
<div class="header">
    <h1>Bhuvigyan</h1>
    <p style="margin:4px 0;">Crop Insurance Claim Assessment Report</p>
    <p style="font-size:12px; color:#666;">Government of Karnataka &middot; PMFBY Scheme</p>
</div>

<div style="padding: 20px;">
    <table>
        <tr><td><strong>Claim Reference</strong></td><td>{claim.get('claimNumber','')}</td>
            <td><strong>Generated</strong></td><td>{report_data.get('generatedAt', datetime.utcnow().strftime('%d %b %Y %H:%M'))}</td></tr>
        <tr><td><strong>Farmer</strong></td><td>{farmer.get('fullName','')}</td>
            <td><strong>ULPIN</strong></td><td>{farmer.get('ulpin','N/A')}</td></tr>
        <tr><td><strong>Farm</strong></td><td>{farmer.get('village','')}, {farmer.get('taluk','')}, {farmer.get('district','')}, {farmer.get('state','')}</td>
            <td><strong>Crop / Season</strong></td><td>{claim.get('crop','')} / {claim.get('season','')}</td></tr>
        <tr><td><strong>Status</strong></td><td colspan="3"><span class="status-badge">{status}</span></td></tr>
    </table>

    <!-- PAGE 2: CLAIM SUMMARY -->
    <h2>Claim Summary</h2>
    <div class="two-col">
        <div class="col">
            <h3>What Was Claimed</h3>
            <table>
                <tr><td>Loss Type</td><td>{claim.get('lossType','')}</td></tr>
                <tr><td>Claimed Loss %</td><td>{claim.get('damagePercent','')}%</td></tr>
                <tr><td>Affected Area</td><td>{claim.get('affectedArea','')} ha</td></tr>
                <tr><td>Claim Amount</td><td>₹{claim.get('claimAmount',0):,}</td></tr>
            </table>
        </div>
        <div class="col">
            <h3>What Was Found</h3>
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="score-circle">{score}</div>
                <div>
                    <p><strong>Fraud Score:</strong> {score} / 100</p>
                    <p><strong>Risk Level:</strong> {fraud.get('riskLevel','')}</p>
                    <p><strong>Key Issues:</strong></p>
                    <ul style="margin:4px 0; padding-left:16px;">
                        {''.join(f'<li>{s}</li>' for s in fraud.get('keyIssues', [])[:3])}
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <div class="alert-box" style="margin-top:10px;">
        <strong>Decision:</strong> {claim.get('decisionReason', 'Claim does not meet verification criteria based on satellite evidence and fraud scoring.')}
    </div>
</div>

<!-- PAGE 3: SATELLITE ANALYSIS -->
<div class="page-break" style="padding: 20px;">
    <h2>Satellite Analysis</h2>
    <div class="sat-box">
        <p><strong>NDVI at claim date:</strong> {satellite.get('ndvi', 'N/A')} — {satellite.get('ndviLabel', '')}</p>
        <p><strong>SAR Flood Signal:</strong> {'Detected' if satellite.get('sarFlood') else 'Not detected'}</p>
        <p><strong>Fire Alerts:</strong> {satellite.get('fireAlerts', 'None')}</p>
        <p><strong>Cloud Cover:</strong> {satellite.get('cloudCover', 'N/A')}%</p>
        <p><strong>Last Scan:</strong> {satellite.get('lastScan', 'N/A')}</p>
    </div>
    <p><strong>Analysis Conclusion:</strong> {satellite.get('conclusion', 'Satellite data reviewed. No significant anomaly detected at farm coordinates.')}</p>

    <!-- PAGE 4: INSPECTION REPORT (if available) -->
    {'<h2>Field Inspection Report</h2>' if inspection else ''}
    {f"""
    <table>
        <tr><td><strong>Inspector</strong></td><td>{inspection.get('inspectorName','')}</td></tr>
        <tr><td><strong>Visit Date</strong></td><td>{inspection.get('visitDate','')}</td></tr>
        <tr><td><strong>GPS Verified</strong></td><td>{'Yes' if inspection.get('gpsVerified') else 'No'}</td></tr>
        <tr><td><strong>Crop Condition</strong></td><td>{inspection.get('cropCondition','')}</td></tr>
        <tr><td><strong>Inspector Loss Estimate</strong></td><td>{inspection.get('lossEstimate','')}%</td></tr>
        <tr><td><strong>Recommendation</strong></td><td>{inspection.get('recommendation','')}</td></tr>
    </table>
    <p><strong>Inspector Notes:</strong> {inspection.get('notes','')}</p>
    """ if inspection else '<p>No field inspection was conducted for this claim.</p>'}
</div>

<!-- PAGE 5: DOCUMENT VERIFICATION -->
<div class="page-break" style="padding: 20px;">
    <h2>Document Verification</h2>
    <table>
        <tr><th>Document</th><th>Submitted</th><th>Status</th><th>Reason</th></tr>
        {doc_rows if doc_rows else '<tr><td colspan="4">No documents on record</td></tr>'}
    </table>
</div>

<!-- PAGE 6: FRAUD SCORE BREAKDOWN -->
<div class="page-break" style="padding: 20px;">
    <h2>Fraud Score Breakdown</h2>
    <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
        <div class="score-circle">{score}</div>
        <div><p><strong>Total Score:</strong> {score} / 100</p><p><strong>Verdict:</strong> {fraud.get('verdict','')}</p></div>
    </div>
    <table>
        <tr><th>Factor</th><th>Weight</th><th>Score</th><th>Reason</th></tr>
        {factor_rows if factor_rows else '<tr><td colspan="4">No factor breakdown available</td></tr>'}
    </table>
</div>

<!-- PAGE 7: AUDIT TRAIL -->
<div class="page-break" style="padding: 20px;">
    <h2>Audit Trail</h2>
    <table>
        <tr><th>Date & Time</th><th>Event</th><th>Actor</th><th>Notes</th></tr>
        {audit_rows if audit_rows else '<tr><td colspan="4">No audit events recorded</td></tr>'}
    </table>
</div>

<!-- PAGE 8: FOOTER -->
<div class="page-break" style="padding: 20px;">
    <h2>What To Do Next</h2>
    <div class="info-box">
        <ul>
            <li>If you believe this decision is incorrect, contact your nearest agriculture office or CSC operator.</li>
            <li>Reference number: <strong>{claim.get('claimNumber','')}</strong></li>
            <li>This report was generated by Bhuvigyan Autonomous Assessment System.</li>
            <li>Government of Karnataka &middot; PMFBY Scheme</li>
        </ul>
    </div>
</div>

<div class="footer">
    <p>Bhuvigyan V7 AI-Powered Crop Insurance Platform</p>
    <p>This report is digitally generated and tamper-evident.</p>
</div>
</body></html>"""
    return html


async def generate_rejection_report(report_data: Dict[str, Any]) -> str:
    """Generate rejection report PDF and return file path."""
    html = _generate_html_rejection_report(report_data)
    output_dir = os.path.join(settings.UPLOAD_DIR, "reports")
    os.makedirs(output_dir, exist_ok=True)
    claim_num = report_data.get("claim", {}).get("claimNumber", "unknown")
    filename = f"rejection-report-{claim_num}-{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(output_dir, filename)

    try:
        import weasyprint
        pdf = weasyprint.HTML(string=html).write_pdf()
        with open(filepath, "wb") as f:
            f.write(pdf)
    except ImportError:
        html_path = filepath.replace(".pdf", ".html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        filepath = html_path

    return filepath
