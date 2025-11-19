from fastapi import FastAPI, Request, Response
import re

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")

# Vercel pattern to match all Vercel URLs
VERCEL_PATTERN = re.compile(r"https://.*\.vercel\.(app|dev)")

print(f"[APP START] CORS will allow all Vercel URLs matching: https://.*\.vercel\.(app|dev)")
print(f"[APP START] Additional allowed origins: {settings.cors_origins_list}")


# --------------------------------------------------------------------
# 1. CORS MIDDLEWARE - HANDLES ALL CORS INCLUDING OPTIONS
# --------------------------------------------------------------------
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    """Handle ALL CORS including OPTIONS preflight requests"""
    try:
        # Get request details
        origin_header = request.headers.get("origin", "")
        method = request.method
        path = request.url.path
        
        # Log every request
        print(f"\n[=== REQUEST START ===] {method} {path}")
        print(f"[REQUEST] Origin: {origin_header}")
        
        # Handle OPTIONS preflight requests
        if method == "OPTIONS":
            print(f"[OPTIONS] Preflight request detected")
            
            # Determine allowed origin
            allowed = settings.cors_origins_list
            
            # Check if origin matches Vercel pattern
            is_vercel = origin_header and VERCEL_PATTERN.match(origin_header)
            
            if is_vercel:
                origin = origin_header
                print(f"[OPTIONS] Origin {origin} matches Vercel pattern - ALLOWING")
            elif origin_header and origin_header in allowed:
                origin = origin_header
                print(f"[OPTIONS] Origin {origin} found in allowed list - ALLOWING")
            elif allowed:
                origin = allowed[0]
                print(f"[OPTIONS] Using first allowed origin: {origin}")
            else:
                origin = "*"
                print(f"[OPTIONS] No specific match, using wildcard: {origin}")
            
            # Build CORS headers
            cors_headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
            
            print(f"[OPTIONS] Response headers:")
            for key, value in cors_headers.items():
                print(f"[OPTIONS]   {key}: {value}")
            
            response = Response(status_code=200, headers=cors_headers)
            print(f"[OPTIONS] Response created and returning\n")
            return response
        
        # For all other requests, process normally then add CORS headers
        print(f"[REQUEST] Processing {method} request...")
        response = await call_next(request)
        print(f"[REQUEST] Response status: {response.status_code}")

        # Determine allowed origin (same logic as OPTIONS)
        allowed = settings.cors_origins_list
        is_vercel = origin_header and VERCEL_PATTERN.match(origin_header)
        
        if is_vercel:
            origin = origin_header
        elif origin_header and origin_header in allowed:
            origin = origin_header
        elif allowed:
            origin = allowed[0]
        else:
            origin = "*"

        # Add CORS headers to all responses
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, *"
        response.headers["Access-Control-Expose-Headers"] = "*"
        
        print(f"[REQUEST] Added CORS headers: Access-Control-Allow-Origin: {origin}")
        print(f"[=== REQUEST END ===]\n")
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
