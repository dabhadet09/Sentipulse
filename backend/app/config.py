from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "SentiPulse"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440


    admin_email: str = "admin@sentipulse.com"
    admin_password: str = "Admin@123456"

    sentiment_model: str = "distilbert-base-uncased-finetuned-sst-2-english"
    emotion_model: str = "j-hartmann/emotion-english-distilroberta-base"
    multilingual_model: str = "google/muril-base-cased"
    roberta_model: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"

    youtube_api_key: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "SentiPulse/1.0"
    twitter_bearer_token: str = ""
    instagram_access_token: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
