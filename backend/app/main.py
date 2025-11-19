from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")

# --------------------------------------------------------------------
# OPTIONS HANDLER - MUST BE FIRST (runs before middleware)
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
# CORS MIDDLEWARE - Handles all CORS including OPTIONS
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://signal-scope-psi.vercel.app",  # your production frontend
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------
# DATABASE LIFECYCLE
# --------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()


# --------------------------------------------------------------------
# ROUTERS
# --------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(towers.router)
app.include_router(reports.router)
app.include_router(analytics.router)


# --------------------------------------------------------------------
# BASIC ROOT ENDPOINT
# --------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "SignalScope API"}
