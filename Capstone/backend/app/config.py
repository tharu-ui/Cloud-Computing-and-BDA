"""Application settings. All credentials come from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    project_name: str = "GreenPharm API"
    api_v1_prefix: str = "/api/v1"

    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "greenpharm"

    # Optional full override, e.g. from a managed Postgres provider.
    database_url: str | None = None

    cors_origins: str = (
        "http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:5173"
    )

    # Demo mode: any password of 4+ characters signs a known demo user in, so the
    # app can always be demonstrated locally. Set to false to enforce hashes only.
    allow_demo_login: bool = True
    demo_password: str = "greenpharm"

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()