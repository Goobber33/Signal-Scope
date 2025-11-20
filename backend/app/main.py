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

# CORS Configuration
ALLOWED_ORIGINS = [
    "https://signal-scope-psi.vercel.app",
    "https://signal-scope-oqoehcvai-kyle-parks-projects.vercel.app",
]
ALLOWED_ORIGIN_REGEX = r"https://.*\.vercel\.app"

logger.info(f"[CORS] Configured allowed origins: {ALLOWED_ORIGINS}")
logger.info(f"[CORS] Configured origin regex: {ALLOWED_ORIGIN_REGEX}")

app = FastAPI(title="SignalScope API", version="1.0.0")

# CRITICAL: Explicit OPTIONS route handler - runs BEFORE middleware
# This ensures OPTIONS requests are handled even if middleware doesn't catch them
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    """Handle all OPTIONS preflight requests - runs before middleware"""
    origin = request.headers.get("origin", "")
    path = f"/{full_path}" if full_path else "/"
    
    logger.info(f"[OPTIONS-ROUTE] ✅ Intercepted OPTIONS for {path} from origin: {origin}")
    
    # Check if origin is allowed
    is_allowed = False
    if origin in ALLOWED_ORIGINS:
        is_allowed = True
        logger.info(f"[OPTIONS-ROUTE] ✅ Origin matches exact list: {origin}")
    elif origin and re.match(ALLOWED_ORIGIN_REGEX, origin):
        is_allowed = True
        logger.info(f"[OPTIONS-ROUTE] ✅ Origin matches regex: {origin}")
    else:
        logger.warning(f"[OPTIONS-ROUTE] ❌ Origin NOT allowed: {origin}")
    
    # Build response headers - ALWAYS return CORS headers
    response_headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "3600",
    }
    
    # Always set the origin header (browser requires exact match)
    if origin:
        response_headers["Access-Control-Allow-Origin"] = origin
        logger.info(f"[OPTIONS-ROUTE] ✅ Returning CORS headers with origin: {origin}")
    else:
        response_headers["Access-Control-Allow-Origin"] = "*"
        logger.warning(f"[OPTIONS-ROUTE] ⚠️ No origin header, returning *")
    
    return Response(status_code=200, headers=response_headers)

# CRITICAL: OPTIONS handler middleware - MUST be added FIRST (runs last, executes first)
# This intercepts OPTIONS requests and returns immediately WITHOUT calling call_next
class OPTIONSHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware that handles OPTIONS requests immediately, before FastAPI routing"""
    
    async def dispatch(self, request: Request, call_next):
        # Intercept OPTIONS requests immediately
        if request.method == "OPTIONS":
            origin = request.headers.get("origin", "")
            path = request.url.path
            
            logger.info(f"[OPTIONS-MIDDLEWARE] ✅ Intercepted OPTIONS for {path} from origin: {origin}")
            
            # Check if origin is allowed
            is_allowed = False
            if origin in ALLOWED_ORIGINS:
                is_allowed = True
                logger.info(f"[OPTIONS-MIDDLEWARE] ✅ Origin matches exact list: {origin}")
            elif origin and re.match(ALLOWED_ORIGIN_REGEX, origin):
                is_allowed = True
                logger.info(f"[OPTIONS-MIDDLEWARE] ✅ Origin matches regex: {origin}")
            else:
                logger.warning(f"[OPTIONS-MIDDLEWARE] ❌ Origin NOT allowed: {origin}")
            
            # Build response headers - ALWAYS return CORS headers to prevent browser errors
            response_headers = {
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
            
            # Always set the origin header (browser requires exact match)
            if origin:
                response_headers["Access-Control-Allow-Origin"] = origin
                logger.info(f"[OPTIONS-MIDDLEWARE] ✅ Returning CORS headers with origin: {origin}")
            else:
                response_headers["Access-Control-Allow-Origin"] = "*"
                logger.warning(f"[OPTIONS-MIDDLEWARE] ⚠️ No origin header, returning *")
            
            # Return response immediately WITHOUT calling call_next
            return Response(status_code=200, headers=response_headers)
        
        # For non-OPTIONS requests, continue normally
        return await call_next(request)

# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "NO_ORIGIN")
        method = request.method
        path = request.url.path
        
        logger.info(f"[REQUEST] {method} {path} | Origin: {origin}")
        
        if method == "OPTIONS":
            logger.info(f"[OPTIONS-PREFLIGHT] Path: {path} | Origin: {origin}")
        
        response = await call_next(request)
        
        # Log response headers for CORS
        cors_headers = {
            k: v for k, v in response.headers.items() 
            if k.lower().startswith("access-control")
        }
        if cors_headers:
            logger.info(f"[RESPONSE] {method} {path} | CORS Headers: {cors_headers}")
        else:
            logger.warning(f"[RESPONSE] {method} {path} | ❌ NO CORS HEADERS SET!")
        
        logger.info(f"[RESPONSE] {method} {path} | Status: {response.status_code}")
        
        return response

# Add OPTIONS handler FIRST (middleware runs in reverse order, so this executes first)
app.add_middleware(OPTIONSHandlerMiddleware)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS Middleware (for non-OPTIONS requests)
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
