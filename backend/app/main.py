from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")


# --------------------------------------------------------------------
# 1. GLOBAL PRE-FLIGHT OPTIONS HANDLER (runs before CORS middleware)
# --------------------------------------------------------------------
@app.options("/{full_path:path}")
async def global_options(full_path: str, request: Request):
    origin_header = request.headers.get("origin", "")
    allowed = settings.cors_origins_list

    # Decide which origin to return
    if origin_header and origin_header in allowed:
        origin = origin_header
    elif allowed:
        origin = allowed[0]
    else:
        origin = "*"

    print(f"[OPTIONS] path={full_path} origin={origin_header} -> allowed={origin}")

    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )


# --------------------------------------------------------------------
# 2. NORMAL CORS MIDDLEWARE
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------
# 3. FORCE CORS ON *EVERY* RESPONSE (the real fix for Railway)
# --------------------------------------------------------------------
@app.middleware("http")
async def add_cors_to_all_responses(request: Request, call_next):
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

    # Inject CORS headers on ALL responses
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
