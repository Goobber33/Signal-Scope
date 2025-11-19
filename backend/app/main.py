from fastapi import FastAPI, Request, Response

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")


# --------------------------------------------------------------------
# 1. GLOBAL PRE-FLIGHT OPTIONS HANDLER (MUST be before any middleware)
# --------------------------------------------------------------------
@app.options("/{full_path:path}")
async def global_options(full_path: str, request: Request):
    """Handle all OPTIONS preflight requests"""
    try:
        origin_header = request.headers.get("origin", "")
        allowed = settings.cors_origins_list

        # Determine which origin to allow
        if origin_header and origin_header in allowed:
            origin = origin_header
        elif allowed:
            origin = allowed[0]
        else:
            origin = "*"

        print(f"[OPTIONS HANDLER] Path: /{full_path} | Origin: {origin_header} | Allowed origins: {allowed} | Returning: {origin}")

        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
        
        print(f"[OPTIONS HANDLER] Response headers: {headers}")
        
        response = Response(
            status_code=200,
            headers=headers
        )
        
        print(f"[OPTIONS HANDLER] Response created, returning")
        return response
        
    except Exception as e:
        print(f"[OPTIONS HANDLER ERROR] {e}")
        import traceback
        traceback.print_exc()
        # Fallback response even on error
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
        )


# --------------------------------------------------------------------
# 2. FORCE CORS ON *EVERY* RESPONSE (handles all CORS including OPTIONS)
# --------------------------------------------------------------------
@app.middleware("http")
async def add_cors_to_all_responses(request: Request, call_next):
    """Add CORS headers to ALL responses (including OPTIONS)"""
    
    # Log every request
    print(f"[MIDDLEWARE] {request.method} {request.url.path} | Origin: {request.headers.get('origin', 'NONE')}")
    
    # Handle OPTIONS preflight requests
    if request.method == "OPTIONS":
        origin_header = request.headers.get("origin", "")
        allowed = settings.cors_origins_list

        # Determine which origin to allow
        if origin_header and origin_header in allowed:
            origin = origin_header
        elif allowed:
            origin = allowed[0]
        else:
            origin = "*"

        print(f"[CORS MIDDLEWARE] OPTIONS preflight detected!")
        print(f"[CORS MIDDLEWARE] Path: {request.url.path}")
        print(f"[CORS MIDDLEWARE] Origin: {origin_header}")
        print(f"[CORS MIDDLEWARE] Allowed origins: {allowed}")
        print(f"[CORS MIDDLEWARE] Returning origin: {origin}")

        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
        
        print(f"[CORS MIDDLEWARE] Response headers: {headers}")
        
        response = Response(
            status_code=200,
            headers=headers
        )
        
        print(f"[CORS MIDDLEWARE] OPTIONS response created and returning")
        return response
    
    # For all other requests, process normally then add CORS headers
    response = await call_next(request)

    origin_header = request.headers.get("origin", "")
    allowed = settings.cors_origins_list

    # Decide which origin is permitted
    if origin_header and origin_header in allowed:
        origin = origin_header
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

    return response


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


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=False,
    )
