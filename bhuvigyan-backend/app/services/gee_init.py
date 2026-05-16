import socket
# Force IPv4 for all connections — ee.Initialize hangs on IPv6
_orig_getaddrinfo = socket.getaddrinfo

def _getaddrinfo_ipv4_only(host, port, family=socket.AF_INET, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

socket.getaddrinfo = _getaddrinfo_ipv4_only

import ee
import os
import logging

logger = logging.getLogger(__name__)

GEE_INITIALIZED = False
GEE_INIT_ERROR = None
GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID", "agri-494914")


def initialize_gee():
    """Lazy GEE init. Tries OAuth first, then project, then unauthenticated.
    Matches ndvi.py _ensure_gee() exactly — direct sync calls, no threads."""
    global GEE_INITIALIZED, GEE_INIT_ERROR
    if GEE_INITIALIZED:
        return True

    # Check if already initialized in this session
    try:
        ee.Image(0).getInfo()
        GEE_INITIALIZED = True
        logger.info("GEE already initialized")
        return True
    except Exception:
        pass

    # Method 1: Project-based init (required by newer EE API)
    try:
        ee.Initialize(project=GEE_PROJECT_ID)
        # Verify with a lightweight call instead of getAssetRoots (which fails if no assets exist)
        ee.Image(0).getInfo()
        logger.info("✓ GEE initialized (project)")
        GEE_INITIALIZED = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.warning(f"GEE project init failed: {e}")

    # Method 2: OAuth without project (legacy fallback)
    try:
        ee.Initialize()
        ee.Image(0).getInfo()
        logger.info("✓ GEE initialized (OAuth)")
        GEE_INITIALIZED = True
        GEE_INIT_ERROR = None
        return True
    except Exception as e:
        GEE_INIT_ERROR = str(e)
        logger.warning(f"GEE OAuth init failed: {e}")

    # Method 3: Service account key file (if exists)
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

    # Method 4: unauthenticated fallback
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
