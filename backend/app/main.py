from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")


# --------------------------------------------------------------------
# 1. OPTIONS HANDLER - MUST BE FIRST (runs before middleware)
# --------------------------------------------------------------------
@app.options("/{path:path}")
async def preflight_handler(request: Request, path: str):
    """Handle all OPTIONS preflight requests - runs BEFORE middleware"""
    origin = request.headers.get("origin", "")
    
    print(f"[OPTIONS-HANDLER] Received preflight for {path} from {origin}")
    
    # Allow any origin that requests it (especially Vercel URLs)
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
        }
    )


# --------------------------------------------------------------------
# 2. CORS MIDDLEWARE - Handles CORS for all other requests
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],  # Empty - regex handles Vercel URLs
    allow_origin_regex=r"https://.*\.vercel\.(app|dev)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------
# 3. CUSTOM MIDDLEWARE - Backup CORS for non-OPTIONS requests
# --------------------------------------------------------------------
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    """Add CORS headers to all non-OPTIONS requests as backup"""
    try:
        # Get request details
        origin_header = request.headers.get("origin", "")
        method = request.method
        path = request.url.path
        
        # Log every request
        print(f"\n[=== REQUEST START ===] {method} {path}")
        print(f"[REQUEST] Origin: {origin_header}")
        
        # OPTIONS requests are handled by the route handler above
        if method == "OPTIONS":
            print(f"[CUSTOM MIDDLEWARE] OPTIONS request - should be handled by route handler")
            response = await call_next(request)
            print(f"[CUSTOM MIDDLEWARE] OPTIONS response from handler: {response.status_code}")
            return response
        
        # For all other requests, process normally then add CORS headers as backup
        print(f"[REQUEST] Processing {method} request...")
        response = await call_next(request)
        print(f"[REQUEST] Response status: {response.status_code}")

        # Add CORS headers if CORSMiddleware didn't add them
        if "Access-Control-Allow-Origin" not in response.headers:
            # Use origin from request
            origin = origin_header if origin_header else "*"
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
