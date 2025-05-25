import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./database.db"

    # JWT
    secret_key: str = "super-secret-key-for-habi-app"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 dni

    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"


settings = Settings()