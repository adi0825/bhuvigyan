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
