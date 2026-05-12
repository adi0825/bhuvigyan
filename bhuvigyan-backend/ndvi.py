import warnings
warnings.filterwarnings("ignore")

import ee
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import plotly.graph_objects as go
import pandas as pd
import json
import random
import numpy as np
from datetime import datetime, timedelta
import traceback
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEE_READY = False
GEE_INIT_ERROR = None

def _ensure_gee():
    """Lazy GEE init. Tries OAuth first (from earthengine authenticate), then unauthenticated."""
    global GEE_READY, GEE_INIT_ERROR
    if GEE_READY:
        return True
    # Method 1: OAuth credentials (from earthengine authenticate)
    try:
        ee.Initialize()
        logger.info("✓ GEE initialized (OAuth)")
        GEE_READY = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.warning(f"GEE OAuth init failed: {e}")
    # Method 2: with explicit project
    try:
        ee.Initialize(project='agri-494914')
        logger.info("✓ GEE initialized (project)")
        GEE_READY = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.warning(f"GEE project init failed: {e}")
    # Method 3: unauthenticated fallback
    try:
        ee.Initialize()
        logger.info("✓ GEE initialized unauthenticated")
        GEE_READY = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.error(f"✗ GEE unavailable: {e}")
    GEE_READY = False
    return False

app = FastAPI(title="Bhuvigyan - PMFBY Verifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"{str(exc)}\n{traceback.format_exc()}"
    logger.error(f"Unhandled exception: {error_msg}")
    return JSONResponse(status_code=500, content={"error": str(exc)})

@app.get("/debug")
async def debug_gee():
    """Test GEE connectivity and return detailed diagnostics."""
    _ensure_gee()
    diagnostics = {
        "gee_ready": GEE_READY,
        "gee_init_error": GEE_INIT_ERROR,
        "project": "agri-494914",
        "tests": {}
    }
    if not GEE_READY:
        diagnostics["error"] = "GEE not initialized. Run: earthengine authenticate"
        return diagnostics
    try:
        test_col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').limit(1)
        info = test_col.getInfo()
        diagnostics["tests"]["collection_access"] = "PASS" if info else "FAIL"
    except Exception as e:
        diagnostics["tests"]["collection_access"] = f"FAIL: {str(e)}"
    try:
        point = ee.Geometry.Point([73.8567, 18.5204])
        buf = point.buffer(5000)
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                      .filterBounds(buf)
                      .filterDate('2025-06-01', '2025-10-30')
                      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)))
        count = collection.size().getInfo()
        diagnostics["tests"]["pune_image_count"] = count
    except Exception as e:
        diagnostics["tests"]["pune_query"] = f"FAIL: {str(e)}"
    return diagnostics

class SurveyRequest(BaseModel):
    survey_id: str
    lat: float
    lon: float
    start_date: str
    end_date: str

@app.get("/", response_class=HTMLResponse)
async def form():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bhuvigyan | PMFBY Satellite Verifier</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #1E2761; --secondary: #2C5F2D; --bg: #f4f7f6; }
        body { font-family: 'Inter', sans-serif; max-width: 1000px; margin: 0 auto; background: var(--bg); padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: var(--primary); font-size: 2.5em; margin-bottom: 5px; }
        .header p { color: var(--secondary); font-weight: 600; margin-top: 0; }
        form { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .full-width { grid-column: 1 / -1; }
        label { font-size: 13px; color: #555; font-weight: 600; margin-bottom: 5px; display: block; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; box-sizing: border-box; }
        input:focus { border-color: var(--secondary); outline: none; box-shadow: 0 0 0 2px rgba(44,95,45,0.2); }
        button { grid-column: 1 / -1; padding: 14px; background: var(--secondary); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: 0.2s; margin-top: 10px; }
        button:hover { background: #224a23; transform: translateY(-1px); }
        #result { margin-top: 30px; display: none; }
        .result-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-top: 20px; }
        .stats-box { background: #f8faf9; padding: 20px; border-radius: 8px; border-left: 4px solid var(--secondary); }
        .stat-item { margin-bottom: 15px; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 20px; font-weight: 800; color: var(--primary); }
        .risk-HIGH { color: #d32f2f; }
        .risk-MEDIUM { color: #f57c00; }
        .risk-LOW { color: #388e3c; }
        pre { background: #1e1e1e; color: #00ff00; padding: 15px; border-radius: 8px; font-size: 12px; overflow-x: auto; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛰️ Bhuvigyan</h1>
        <p>AI Satellite Crop Insurance Verifier</p>
    </div>
    
    <form id="f">
        <div class="full-width">
            <label>UDLRN / Survey ID</label>
            <input name="survey_id" value="MH-PN-TEST-9982">
        </div>
        <div>
            <label>Latitude</label>
            <input name="lat" type="number" step="any" value="18.5204">
        </div>
        <div>
            <label>Longitude</label>
            <input name="lon" type="number" step="any" value="73.8567">
        </div>
        <div>
            <label>Sowing Date (Start)</label>
            <input name="start_date" type="date" value="2025-06-01">
        </div>
        <div>
            <label>Claim Date (End)</label>
            <input name="end_date" type="date" value="2025-10-30">
        </div>
        <button type="submit" id="submit-btn">Run Satellite Verification</button>
    </form>
    
    <div id="result"></div>
    
    <div class="footer">
        Powered by Sentinel-2 & Google Earth Engine | India Agri-Hackathon 2026
    </div>

<script>
document.getElementById('f').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const resultDiv = document.getElementById('result');
    
    btn.innerText = '⏳ Fetching Satellite Data...';
    btn.style.opacity = '0.7';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="text-align:center; padding: 40px; color: #666;">Contacting Copernicus Sentinel-2 API... Please wait (10-15s)</div>';
    
    const data = Object.fromEntries(new FormData(e.target));
    
    try {
        const res = await fetch('/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const r = await res.json();
        btn.innerText = 'Run Satellite Verification';
        btn.style.opacity = '1';
        
        if (r.error) {
            resultDiv.innerHTML = `<div style="color:red; text-align:center; padding: 20px; background: white; border-radius: 8px;">❌ Error: ${r.error}</div>`;
            return;
        }
        
        resultDiv.innerHTML = `
            <div class="result-card">
                <h2 style="margin-top: 0; color: #1E2761; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    Verification Report: ${r.survey_id}
                </h2>
                <div class="grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 20px;">
                    <div class="stats-box">
                        <div class="stat-item">
                            <div class="stat-label">Farm Location</div>
                            <div class="stat-value" style="font-size: 16px;">${data.lat}°N, ${data.lon}°E</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Max Crop Health (NDVI)</div>
                            <div class="stat-value">${r.stats.max_ndvi}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Current Crop Health</div>
                            <div class="stat-value">${r.stats.recent_ndvi}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Fraud Risk Level</div>
                            <div class="stat-value risk-${r.stats.risk.split(' ')[0]}">${r.stats.risk}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Satellite Images Analyzed</div>
                            <div class="stat-value">${r.stats.images_used}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">GEE Status</div>
                            <div class="stat-value" style="font-size: 14px;">${r.stats.gee_status}</div>
                        </div>
                        <p style="font-size: 11px; color: #888; margin-top: 20px;">Data Source: ${r.stats.data_source}</p>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 600;">🛰️ Sentinel-2 Satellite Image (5km radius)</div>
                        ${r.thumbnail_url ? `<img src="${r.thumbnail_url}" style="width: 100%; max-width: 450px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Satellite view">` : '<div style="padding: 40px; color: #888; background: #f5f5f5; border-radius: 8px;">No satellite image available</div>'}
                    </div>
                </div>
                <div id="chart" style="margin-top: 10px;"></div>
                <details style="margin-top: 20px;">
                    <summary style="cursor:pointer; color:#1E2761; font-weight:600; margin-bottom: 10px;">Show System Logs (JSON)</summary>
                    <pre>${JSON.stringify(r.stats, null, 2)}</pre>
                </details>
            </div>
        `;
        
        Plotly.newPlot('chart', r.chart_data.data, r.chart_data.layout, {responsive: true});
        
    } catch(err) {
        btn.innerText = 'Run Satellite Verification';
        btn.style.opacity = '1';
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding: 20px; background: white;">❌ Connection Error: ${err}</div>`;
    }
}
</script>
</body>
</html>"""

@app.post("/verify")
def verify(req: SurveyRequest):
    try:
        # 1. Try fetching from GEE, fallback to dynamic mock data for demo
        timeline = []
        data_source = "Sentinel-2 (Mock Fallback for Hackathon)"
        
        buffer_geom = None
        thumbnail_b64 = ""
        _ensure_gee()
        logger.info(f"GEE_READY={GEE_READY} | init_error={GEE_INIT_ERROR}")
        t0 = time.time()
        if GEE_READY:
            try:
                t1 = time.time()
                point = ee.Geometry.Point([float(req.lon), float(req.lat)])
                buffer_geom = point.buffer(5000)
                logger.info(f"[T+{time.time()-t0:.1f}s] Geometry created (5km)")

                collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                              .filterBounds(buffer_geom)
                              .filterDate(req.start_date, req.end_date)
                              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                              .limit(60))  # cap at 60 images max
                logger.info(f"[T+{time.time()-t0:.1f}s] Collection defined, calling getInfo()...")

                def calculate_ndvi(img):
                    ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI')
                    date = img.date().format('YYYY-MM-dd')
                    mean_ndvi = ndvi.reduceRegion(reducer=ee.Reducer.mean(), geometry=buffer_geom, scale=10, maxPixels=1e9).get('NDVI')
                    return ee.Feature(None, {'date': date, 'ndvi': mean_ndvi})

                raw = collection.map(calculate_ndvi).getInfo()
                features = raw.get('features', [])
                logger.info(f"[T+{time.time()-t0:.1f}s] Got {len(features)} features from GEE")

                for f in features:
                    val = f['properties'].get('ndvi')
                    if val is not None:
                        timeline.append({'date': f['properties']['date'], 'ndvi': round(float(val), 3)})

                if len(timeline) > 0:
                    data_source = "Copernicus Sentinel-2 (Live GEE API)"

                # Thumbnail (reuse same collection, just get first)
                if buffer_geom is not None and len(timeline) > 0:
                    try:
                        t2 = time.time()
                        best = collection.first()
                        if best:
                            thumb_url = best.visualize(
                                bands=['B4', 'B3', 'B2'], min=0, max=3000
                            ).getThumbUrl({'region': buffer_geom.bounds().getInfo(), 'dimensions': 400, 'format': 'png'})
                            logger.info(f"[T+{time.time()-t0:.1f}s] Thumb URL ready, downloading...")
                            import base64
                            from urllib.request import urlopen
                            with urlopen(thumb_url, timeout=15) as resp:
                                img_bytes = resp.read()
                            thumbnail_b64 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode()}"
                            logger.info(f"[T+{time.time()-t0:.1f}s] Thumbnail downloaded ({len(thumbnail_b64)} chars)")
                    except Exception as e:
                        logger.warning(f"Thumbnail failed: {e}")

            except Exception as e:
                logger.error(f"GEE Fetch failed, falling back to mock: {e}")

        logger.info(f"[T+{time.time()-t0:.1f}s] GEE block done. timeline={len(timeline)} items")

        # 2. Fallback Mock Data Generator (Highly realistic crop curve)
        if not timeline:
            start = datetime.strptime(req.start_date, "%Y-%m-%d")
            end = datetime.strptime(req.end_date, "%Y-%m-%d")
            days = (end - start).days
            
            # Generate a realistic crop growth curve (bell curve)
            for i in range(0, days, 10): # Every 10 days
                current = start + timedelta(days=i)
                progress = i / days
                # Parabola peaking at progress = 0.6 (60% through season)
                base_ndvi = 0.15 + 0.65 * np.sin(progress * np.pi) 
                noise = random.uniform(-0.05, 0.05)
                ndvi = max(0.05, min(0.95, base_ndvi + noise))
                timeline.append({'date': current.strftime("%Y-%m-%d"), 'ndvi': round(ndvi, 3)})

        df = pd.DataFrame(timeline)
        
        # 3. Build Chart JSON manually (no numpy/plotly objects in response)
        dates = [str(d) for d in df['date']]
        values = [float(v) for v in df['ndvi']]
        
        chart_data = {
            "data": [{
                "x": dates,
                "y": values,
                "mode": "lines+markers",
                "type": "scatter",
                "line": {"color": "#2C5F2D", "width": 3, "shape": "spline"},
                "marker": {"size": 8, "color": "#1E2761", "symbol": "circle"},
                "fill": "tozeroy",
                "fillcolor": "rgba(44, 95, 45, 0.1)",
                "name": "NDVI (Health)"
            }],
            "layout": {
                "title": {"text": "Satellite NDVI Timeline (Farm Health)", "font": {"color": "#1E2761", "size": 18}},
                "xaxis": {"title": "Observation Date", "showgrid": True, "gridwidth": 1, "gridcolor": "#f0f0f0"},
                "yaxis": {"title": "NDVI Value", "range": [0, 1.0], "showgrid": True, "gridwidth": 1, "gridcolor": "#f0f0f0"},
                "height": 350,
                "margin": {"l": 40, "r": 40, "t": 50, "b": 40},
                "plot_bgcolor": "white",
                "paper_bgcolor": "white",
                "hovermode": "x unified",
                "shapes": [
                    {"type": "line", "x0": dates[0], "x1": dates[-1], "y0": 0.2, "y1": 0.2,
                     "line": {"color": "red", "width": 1, "dash": "dash"}},
                    {"type": "line", "x0": dates[0], "x1": dates[-1], "y0": 0.6, "y1": 0.6,
                     "line": {"color": "green", "width": 1, "dash": "dash"}}
                ],
                "annotations": [
                    {"x": dates[-1], "y": 0.2, "text": "Barren/Dead", "showarrow": False, "font": {"color": "red", "size": 10}, "yshift": -12},
                    {"x": dates[-1], "y": 0.6, "text": "Healthy Crop", "showarrow": False, "font": {"color": "green", "size": 10}, "yshift": 12}
                ]
            }
        }

        # 4. Analytics & Fraud Rules
        recent_ndvi = float(df['ndvi'].iloc[-1])
        max_ndvi = float(df['ndvi'].max())
        
        if max_ndvi < 0.3:
            risk = "HIGH 🔴 (Phantom Farm)"
        elif recent_ndvi > 0.5:
            risk = "HIGH 🔴 (False Claim - Crop Healthy)"
        elif recent_ndvi < 0.25 and max_ndvi > 0.5:
            risk = "LOW 🟢 (Genuine Damage)"
        else:
            risk = "MEDIUM 🟡 (Requires Review)"

        stats = {
            'survey_id': req.survey_id,
            'images_used': len(timeline),
            'date_range': f"{timeline[0]['date']} to {timeline[-1]['date']}",
            'max_ndvi': round(max_ndvi, 3),
            'recent_ndvi': round(recent_ndvi, 3),
            'risk': risk,
            'data_source': data_source,
            'gee_status': 'OK' if GEE_READY else 'OFFLINE'
        }

        return {
            "survey_id": req.survey_id,
            "chart_data": chart_data,
            "stats": stats,
            "timeline": timeline,
            "thumbnail_url": thumbnail_b64
        }

    except Exception as e:
        logger.error(f"Error in /verify: {traceback.format_exc()}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)