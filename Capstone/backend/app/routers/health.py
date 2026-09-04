from fastapi import APIRouter, Depends
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    """Liveness probe that also proves the PostgreSQL connection works."""
    try:
        version = db.execute(text("select version()")).scalar_one()
        tables = sorted(inspect(db.get_bind()).get_table_names())
        return HealthResponse(
            status="ok",
            database="connected",
            database_version=str(version).split(" on ")[0],
            tables=tables,
        )
    except Exception:  # noqa: BLE001 - report unavailability instead of crashing
        return HealthResponse(status="error", database="unavailable")