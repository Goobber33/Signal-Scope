from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")

# ---- GLOBAL CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- EXPLICIT OPTIONS HANDLERS (before routers) ----
@app.options("/auth/login")
@app.options("/auth/register")
async def options_handler(request: Request):
    origin_header = request.headers.get("origin", "")
    allowed_origins = settings.cors_origins_list
    
    # Use request origin if it's in allowed list
    if origin_header and origin_header in allowed_origins:
        origin = origin_header
    elif allowed_origins:
        origin = allowed_origins[0]
    else:
        origin = "*"
    
    print(f"[MAIN OPTIONS] Origin: {origin_header}, Allowed: {origin}")
    
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# ---- DATABASE ----
@app.on_event("startup")
async def startup():
    print("CORS:", settings.cors_origins_list)
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()


# ---- ROUTERS ----
app.include_router(auth.router)
app.include_router(towers.router)
app.include_router(reports.router)
app.include_router(analytics.router)


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
        reload=False
    )
