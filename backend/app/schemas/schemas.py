from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionStatus(str, Enum):
    NONE = "none"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Platform(str, Enum):
    YOUTUBE = "youtube"
    YOUTUBE_LIVE = "youtube_live"
    REDDIT = "reddit"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"


# Auth
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    has_premium: bool
    subscription_status: SubscriptionStatus
    created_at: datetime


# Premium Application
class PremiumApplication(BaseModel):
    reason: str = Field(..., min_length=20, max_length=1000)
    use_case: str = Field(..., min_length=10, max_length=500)
    organization: Optional[str] = None


class PremiumApplicationResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    reason: str
    use_case: str
    organization: Optional[str]
    status: SubscriptionStatus
    admin_note: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]


class ApplicationReview(BaseModel):
    status: SubscriptionStatus
    admin_note: Optional[str] = None


# Analysis
class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    platform: Platform = Platform.YOUTUBE
    model: Optional[str] = "distilbert"


class URLAnalysisRequest(BaseModel):
    url: str
    platform: Platform
    model: Optional[str] = "distilbert"
    max_comments: int = Field(default=100, ge=1, le=500)


class SentimentResult(BaseModel):
    label: str
    score: float
    model_used: str


class EmotionResult(BaseModel):
    label: str
    score: float
    all_emotions: Dict[str, float]


class TextAnalysisResponse(BaseModel):
    text: str
    sentiment: SentimentResult
    emotion: EmotionResult
    platform: Platform
    model_used: str


class BatchAnalysisResponse(BaseModel):
    id: str
    platform: Platform
    source_url: Optional[str]
    total_items: int
    sentiment_summary: Dict[str, float]
    emotion_summary: Dict[str, float]
    items: List[Dict[str, Any]]
    model_used: str
    data_source: Optional[str] = None
    video_title: Optional[str] = None
    fetch_message: Optional[str] = None
    created_at: datetime


class AnalysisHistoryItem(BaseModel):
    id: str
    platform: Platform
    source_url: Optional[str]
    total_items: int
    sentiment_summary: Dict[str, float]
    emotion_summary: Dict[str, float]
    model_used: str
    created_at: datetime


# Admin
class UserUpdate(BaseModel):
    has_premium: Optional[bool] = None
    role: Optional[UserRole] = None
    subscription_status: Optional[SubscriptionStatus] = None


class DashboardStats(BaseModel):
    total_users: int
    premium_users: int
    pending_applications: int
    total_analyses: int
    analyses_by_platform: Dict[str, int]


class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    type: str
    huggingface_id: str
    is_finetuned: bool
