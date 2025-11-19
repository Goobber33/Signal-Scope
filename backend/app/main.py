from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

from .routers import auth, towers, reports, analytics

app = FastAPI(title="SignalScope API", version="1.0.0")

# ---- GLOBAL OPTIONS HANDLER (MUST be before CORS middleware) ----
@app.options("/{full_path:path}")
async def global_options_handler(request: Request, full_path: str):
    origin_header = request.headers.get("origin", "")
    allowed = settings.cors_origins_list

    # Determine which origin to use
    if origin_header and origin_header in allowed:
        origin = origin_header
    elif allowed:
        origin = allowed[0]
    else:
        origin = "*"

    print(f"[OPTIONS HANDLER] Path: {full_path} | Origin: {origin_header} | Returning: {origin}")

    response = Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )
    print(f"[OPTIONS HANDLER] Response headers: {dict(response.headers)}")
    return response

# ---- GLOBAL CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/test-cors")
def test_cors():
    return {"message": "CORS test endpoint"}


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=False
    )
