# Google Earth Engine (GEE) Authentication Setup Guide

This guide walks you through setting up GEE authentication for the Bhuvigyan satellite data system.

## Prerequisites
- Google Cloud account (create one at https://console.cloud.google.com)
- GEE account (sign up at https://earthengine.google.com)

## Step 1: Enable Earth Engine API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services** > **Library**
4. Search for "Earth Engine API"
5. Click on it and click **Enable**

## Step 2: Create a Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **Service Account**
3. Fill in the details:
   - Service account name: `bhuvigyan-satellite`
   - Service account description: `Bhuvigyan Satellite Data Service`
4. Click **Create and Continue**
5. Skip roles for now (click **Done**)

## Step 3: Grant Earth Engine Access

1. Go to [Earth Engine Code Editor](https://code.earthengine.google.com)
2. Click the gear icon (⚙️) > **User settings**
3. In the **Service Accounts** section, click **+ Add Service Account**
4. Enter the service account email (e.g., `bhuvigyan-satellite@your-project-id.iam.gserviceaccount.com`)
5. Click **Add**

## Step 4: Generate Service Account Key

1. Go back to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your service account
4. Go to **Keys** tab
5. Click **Add Key** > **Create new key**
6. Select **JSON** format
7. Click **Create** — the key file will download automatically

## Step 5: Place Key File in Project

1. Rename the downloaded JSON file to `gee_service_account.json`
2. Place it in this directory:
   ```
   c:\Users\athar\Desktop\Agri\bhuvigyan-backend\backend\secrets\
   ```
3. If the `secrets` folder doesn't exist, create it

## Step 6: Verify Authentication

Run the test tool:
```powershell
cd "c:\Users\athar\Desktop\Agri\bhuvigyan-backend"
python ndvi.py
```

The GUI should show:
- **GEE Status: ✓ GEE Available** (green)
- Click **Test NDVI** to verify data retrieval works

## Troubleshooting

### "GEE Not Available" error
- Verify the key file path is correct
- Check that the service account email matches exactly
- Ensure Earth Engine API is enabled in your Google Cloud project
- Verify the service account has been added in Earth Engine Code Editor settings

### "No images found" error
- Try different lat/lon coordinates (e.g., agricultural areas)
- Increase the date range (the tool uses 60 days)
- Check if the location has recent Sentinel-2 coverage

### Import errors
```powershell
pip install earthengine-api
```

## Environment Variables (Optional)

If you want to use a different key path, set the environment variable:
```powershell
$env:GEE_SERVICE_ACCOUNT_KEY = "path\to\your\key.json"
```

Or in `.env` file:
```
GEE_SERVICE_ACCOUNT_KEY=backend/secrets/gee_service_account.json
```
