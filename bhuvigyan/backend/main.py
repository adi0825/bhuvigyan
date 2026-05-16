from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logging import configure_logging
from app.api.routes import land, ndvi, fraud, health, my_land

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Bhuvigyan API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(land.router, prefix="/api/v1/land", tags=["land"])
app.include_router(ndvi.router, prefix="/api/v1/ndvi", tags=["ndvi"])
app.include_router(fraud.router, prefix="/api/v1/fraud", tags=["fraud"])
app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
app.include_router(my_land.router, prefix="/api/v1/my-land", tags=["my-land"])


@app.get("/")
async def root():
    return {"message": "Bhuvigyan API", "version": "1.0.0"}
