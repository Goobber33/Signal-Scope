import logging
import re
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from .database import connect_to_mongo, close_mongo_connection
from .routers import auth, towers, reports, analytics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SignalScope API", version="1.0.0")

# CORS Configuration
ALLOWED_ORIGINS = [
    "https://signal-scope-psi.vercel.app",
    "https://signal-scope-oqoehcvai-kyle-parks-projects.vercel.app",
]
ALLOWED_ORIGIN_REGEX = r"https://.*\.vercel\.app"

logger.info(f"[CORS] Configured allowed origins: {ALLOWED_ORIGINS}")
logger.info(f"[CORS] Configured origin regex: {ALLOWED_ORIGIN_REGEX}")

# CRITICAL: OPTIONS handler MUST be at the top, before any middleware
# This ensures Railway doesn't block OPTIONS requests before they reach FastAPI
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    """Handle all OPTIONS preflight requests - runs BEFORE middleware"""
    origin = request.headers.get("origin", "")
    
    logger.info(f"[OPTIONS-HANDLER] Received preflight for /{full_path} from origin: {origin}")
    
    # Check if origin is allowed
    is_allowed = False
    if origin in ALLOWED_ORIGINS:
        is_allowed = True
        logger.info(f"[OPTIONS-HANDLER] Origin matches exact list: {origin}")
    elif re.match(ALLOWED_ORIGIN_REGEX, origin):
        is_allowed = True
        logger.info(f"[OPTIONS-HANDLER] Origin matches regex: {origin}")
    else:
        logger.warning(f"[OPTIONS-HANDLER] Origin NOT allowed: {origin}")
    
    # Return CORS headers (even if not allowed, to avoid browser errors)
    # The actual request will be blocked by CORSMiddleware if not allowed
    response_headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "3600",
    }
    
    if is_allowed:
        response_headers["Access-Control-Allow-Origin"] = origin
        logger.info(f"[OPTIONS-HANDLER] Returning CORS headers for allowed origin: {origin}")
    else:
        # Still return headers, but CORSMiddleware will handle the actual blocking
        response_headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        logger.warning(f"[OPTIONS-HANDLER] Returning CORS headers for unallowed origin: {origin}")
    
    return Response(status_code=200, headers=response_headers)

# Request logging middleware - runs BEFORE CORS middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "NO_ORIGIN")
        method = request.method
        path = request.url.path
        
        logger.info(f"[REQUEST] {method} {path} | Origin: {origin}")
        
        if method == "OPTIONS":
            logger.info(f"[OPTIONS-PREFLIGHT] Path: {path} | Origin: {origin}")
            logger.info(f"[OPTIONS-PREFLIGHT] Headers: {dict(request.headers)}")
        
        response = await call_next(request)
        
        # Log response headers for CORS
        cors_headers = {
            k: v for k, v in response.headers.items() 
            if k.lower().startswith("access-control")
        }
        if cors_headers:
            logger.info(f"[RESPONSE] {method} {path} | CORS Headers: {cors_headers}")
        else:
            logger.warning(f"[RESPONSE] {method} {path} | NO CORS HEADERS SET!")
        
        logger.info(f"[RESPONSE] {method} {path} | Status: {response.status_code}")
        
        return response

# Add request logging middleware FIRST
app.add_middleware(RequestLoggingMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB lifecycle
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("[STARTUP] SignalScope API Starting...")
    logger.info(f"[STARTUP] CORS Allowed Origins: {ALLOWED_ORIGINS}")
    logger.info(f"[STARTUP] CORS Origin Regex: {ALLOWED_ORIGIN_REGEX}")
    logger.info("=" * 60)
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()

# Debug endpoint to check CORS configuration
@app.get("/debug/cors")
async def debug_cors(request: Request):
    origin = request.headers.get("origin", "NO_ORIGIN")
    import re
    
    matches_exact = origin in ALLOWED_ORIGINS
    matches_regex = bool(re.match(ALLOWED_ORIGIN_REGEX, origin)) if origin != "NO_ORIGIN" else False
    
    return {
        "request_origin": origin,
        "allowed_origins": ALLOWED_ORIGINS,
        "allowed_origin_regex": ALLOWED_ORIGIN_REGEX,
        "matches_exact": matches_exact,
        "matches_regex": matches_regex,
        "will_allow": matches_exact or matches_regex,
        "headers": dict(request.headers),
    }

# Routers
app.include_router(auth.router)
app.include_router(towers.router)
app.include_router(reports.router)
app.include_router(analytics.router)

@app.get("/")
def root():
    return {"status": "ok", "service": "SignalScope API"}
