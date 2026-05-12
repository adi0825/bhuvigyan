import ee
import os
import logging

logger = logging.getLogger(__name__)

GEE_INITIALIZED = False
GEE_INIT_ERROR = None
GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID", "agri-494914")


def initialize_gee():
    """Lazy, idempotent GEE init. Tries multiple methods."""
    global GEE_INITIALIZED, GEE_INIT_ERROR
    if GEE_INITIALIZED:
        return True

    # Check if already initialized in this session
    try:
        ee.data.getAssetRoots()
        GEE_INITIALIZED = True
        logger.info("GEE already initialized")
        return True
    except Exception:
        pass

    # Method 1: Project-based init (uses cached OAuth credentials)
    try:
        ee.Initialize(project=GEE_PROJECT_ID)
        logger.info("✓ GEE initialized (project)")
        GEE_INITIALIZED = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.warning(f"GEE project init failed: {e}")

    # Method 2: Service account key file (if exists)
    key_path = os.path.join(os.path.dirname(__file__), "..", "secrets", "gee_service_account.json")
    if os.path.exists(key_path):
        try:
            credentials = ee.ServiceAccountCredentials(None, key_path)
            ee.Initialize(credentials, project=GEE_PROJECT_ID)
            logger.info("✓ GEE initialized (service account)")
            GEE_INITIALIZED = True
            GEE_INIT_ERROR = None
            return True
        except Exception as e:
            GEE_INIT_ERROR = str(e)
            logger.warning(f"GEE service account init failed: {e}")

    # Method 3: Unauthenticated / dev mode (very limited)
    try:
        ee.Initialize()
        logger.info("✓ GEE initialized unauthenticated (dev mode)")
        GEE_INITIALIZED = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.error(f"✗ GEE unavailable: {e}")

    GEE_INITIALIZED = False
    return False
