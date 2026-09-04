"""GreenPharm FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, engine
from app.routers import (
    analytics,
    auth,
    expiry,
    health,
    medicines,
    notifications,
    purchase_orders,
    stock,
    suppliers,
)

# Importing the models package registers every table on Base.metadata.
import app.models  # noqa: F401  (side-effect import)

logger = logging.getLogger("greenpharm")
settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Backend foundation for the GreenPharm Pharmacy Inventory Management System.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(medicines.router, prefix=settings.api_v1_prefix)
app.include_router(suppliers.router, prefix=settings.api_v1_prefix)
app.include_router(stock.router, prefix=settings.api_v1_prefix)
app.include_router(purchase_orders.router, prefix=settings.api_v1_prefix)
app.include_router(expiry.router, prefix=settings.api_v1_prefix)
app.include_router(notifications.router, prefix=settings.api_v1_prefix)
app.include_router(analytics.router, prefix=settings.api_v1_prefix)
app.include_router(auth.router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def on_startup() -> None:
    """Create tables if they do not exist. Fails soft so the API still boots
    (and /api/v1/health reports the problem) when Postgres is unreachable."""
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
        Base.metadata.create_all(bind=engine)
        logger.info("Database connected and schema ensured.")
    except Exception as error:  # noqa: BLE001
        logger.error("Database unavailable at startup: %s", error)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.project_name, "docs": "/docs", "api": settings.api_v1_prefix}