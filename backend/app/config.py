import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEV_SECRET = "dev-only-insecure-secret-change-me"


class Settings:
    def __init__(self) -> None:
        self.environment = os.getenv("APP_ENV", "development").lower()
        database_url = os.getenv("DATABASE_URL", "").strip()
        if database_url:
            self.database_url = database_url
        elif os.getenv("POSTGRES_HOST"):
            user = quote_plus(os.getenv("POSTGRES_USER", "shoply"))
            password = quote_plus(os.getenv("POSTGRES_PASSWORD", ""))
            host = os.getenv("POSTGRES_HOST", "localhost")
            port = os.getenv("POSTGRES_PORT", "5432")
            database = quote_plus(os.getenv("POSTGRES_DB", "shoply"))
            self.database_url = (
                f"postgresql+psycopg://{user}:{password}@{host}:{port}/{database}"
            )
        else:
            self.database_url = (
                "postgresql+psycopg://shoply:shoply_dev_password"
                "@localhost:5432/shoply"
            )
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
        self.seed_demo_data = os.getenv("SEED_DEMO_DATA", "true").lower() == "true"
        origins = os.getenv(
            "FRONTEND_ORIGINS",
            os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173"),
        )
        self.frontend_origins = [o.strip() for o in origins.split(",") if o.strip()]

        secret = os.getenv("SECRET_KEY", "").strip()
        if self.environment == "production":
            if not secret or secret == DEV_SECRET or len(secret) < 32:
                raise RuntimeError(
                    "SECRET_KEY must be set to a random value of at least 32 characters "
                    "when APP_ENV=production. Generate one with: "
                    "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                )
        self.secret_key = secret or DEV_SECRET


settings = Settings()
