# ML service secrets

This directory is mounted into the `ml-service` and `ml-worker` containers at `/secrets`.

To enable **real** Google Earth Engine queries:

1. Create a GCP service account and give it `Earth Engine Resource Viewer`.
2. Register the service account email at https://signup.earthengine.google.com/#!/service_accounts
3. Download its JSON key and save it here as `gee-sa.json`.
4. In `.env` set:
   ```
   GEE_MODE=real
   GEE_PROJECT_ID=your-gcp-project
   ```
5. `docker compose restart ml-service ml-worker`

Without these steps the service runs in **dev mode** with deterministic
synthesized NDVI timelines (safe for local development and CI).
