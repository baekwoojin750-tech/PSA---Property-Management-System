from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Gmail settings for password reset
    GMAIL_EMAIL: str
    GMAIL_APP_PASSWORD: str

    class Config:
        env_file = ".env"

settings = Settings()