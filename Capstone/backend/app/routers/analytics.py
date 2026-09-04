from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.common import (
    DashboardChartsOut,
    DashboardMetricsOut,
    GreenMetricsOut,
    ReportResultOut,
)
from app.services.analytics import dashboard_charts, dashboard_metrics, green_metrics
from app.services.reports import REPORT_IDS, build_report

router = APIRouter(tags=["analytics"])


@router.get("/dashboard/metrics", response_model=DashboardMetricsOut)
def metrics(db: Session = Depends(get_db)) -> dict:
    return dashboard_metrics(db)


@router.get("/dashboard/charts", response_model=DashboardChartsOut)
def charts(db: Session = Depends(get_db)) -> dict:
    return dashboard_charts(db)


@router.get("/green/metrics", response_model=GreenMetricsOut)
def green(db: Session = Depends(get_db)) -> dict:
    return green_metrics(db)


@router.get("/reports/{report_id}", response_model=ReportResultOut)
def report(
    report_id: str,
    date_from: str | None = Query(default=None, alias="from"),
    date_to: str | None = Query(default=None, alias="to"),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if report_id not in REPORT_IDS:
        raise HTTPException(status_code=404, detail="Unknown report")
    return build_report(db, report_id, date_from, date_to, category)
