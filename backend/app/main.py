from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")


# --------------------------------------------------------------------
# 1. CORS MIDDLEWARE WITH REGEX FOR VERCEL
# --------------------------------------------------------------------
# Allow all Vercel URLs (production and previews)
vercel_regex = r"https://.*\.vercel\.(app|dev)"

# Get specific allowed origins from config
allowed_origins = [origin for origin in settings.cors_origins_list if "*" not in origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else [],  # Specific origins
    allow_origin_regex=vercel_regex,  # Allow all Vercel URLs via regex
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

print(f"[CORS SETUP] Allowed origins: {allowed_origins}")
print(f"[CORS SETUP] Vercel regex: {vercel_regex}")


# --------------------------------------------------------------------
# 2. FORCE CORS ON *EVERY* RESPONSE (handles all CORS including OPTIONS)
# --------------------------------------------------------------------
@app.middleware("http")
async def add_cors_to_all_responses(request: Request, call_next):
    """Add CORS headers to ALL responses (including OPTIONS)"""
    try:
        # Log every request immediately
        origin_header = request.headers.get("origin", "")
        method = request.method
        path = request.url.path
        
        print(f"[MIDDLEWARE START] {method} {path}")
        print(f"[MIDDLEWARE START] Origin header: {origin_header}")
        print(f"[MIDDLEWARE START] All headers: {dict(request.headers)}")
        
        # Check if origin is a Vercel preview URL
        is_vercel_preview = origin_header and (".vercel.app" in origin_header or ".vercel.dev" in origin_header)
        allowed = settings.cors_origins_list
        
        print(f"[MIDDLEWARE START] Is Vercel preview: {is_vercel_preview}")
        print(f"[MIDDLEWARE START] Allowed origins from config: {allowed}")
        
        # OPTIONS requests are handled by CORSMiddleware above
        # Just log them here for debugging
        if method == "OPTIONS":
            print(f"[CUSTOM MIDDLEWARE] OPTIONS request detected - should be handled by CORSMiddleware")
            print(f"[CUSTOM MIDDLEWARE] Path: {path}, Origin: {origin_header}")
    
        # For all other requests, process normally then add CORS headers
        print(f"[MIDDLEWARE] Processing {method} request normally...")
        response = await call_next(request)
        
        print(f"[MIDDLEWARE] Response received, status: {response.status_code}")

        # Determine which origin to allow (same logic as OPTIONS)
        if origin_header and origin_header in allowed:
            origin = origin_header
        elif is_vercel_preview:
            origin = origin_header  # Allow any Vercel preview URL
        elif allowed:
            origin = allowed[0]
        else:
            origin = "*"

        # Always add CORS headers to responses
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, *"
        response.headers["Access-Control-Expose-Headers"] = "*"
        
        print(f"[MIDDLEWARE] Added CORS headers to {method} response: {origin}")
        print(f"[MIDDLEWARE END] {method} response sent with CORS headers")
        return response
        
    except Exception as e:
        print(f"[MIDDLEWARE ERROR] Exception in CORS middleware: {e}")
        import traceback
        traceback.print_exc()
        
        # Try to return a response with CORS headers even on error
        try:
            origin_header = request.headers.get("origin", "")
            is_vercel = origin_header and (".vercel.app" in origin_header or ".vercel.dev" in origin_header)
            allowed = settings.cors_origins_list
            
            if origin_header and origin_header in allowed:
                origin = origin_header
            elif is_vercel:
                origin = origin_header
            elif allowed:
                origin = allowed[0]
            else:
                origin = "*"
                
            return Response(
                status_code=500,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                },
                content=f"Internal Server Error: {str(e)}"
            )
        except:
            # Last resort - return basic error
            return Response(status_code=500, content="Internal Server Error")


# --------------------------------------------------------------------
# 4. DATABASE LIFECYCLE
# --------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    print("CORS allowed origins:", settings.cors_origins_list)
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()


# --------------------------------------------------------------------
# 5. ROUTERS
# --------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(towers.router)
app.include_router(reports.router)
app.include_router(analytics.router)


# --------------------------------------------------------------------
# 6. BASIC ROOT ENDPOINT
# --------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "SignalScope API"}
