from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.schemas.schemas import (
    PremiumApplication,
    PremiumApplicationResponse,
    ApplicationReview,
    SubscriptionStatus,
)
from app.utils.security import get_current_user
from app.services.subscription_service import (
    submit_application,
    get_user_application,
)

router = APIRouter(prefix="/subscription", tags=["Subscription"])


@router.post("/apply", response_model=PremiumApplicationResponse)
async def apply_premium(data: PremiumApplication, current_user=Depends(get_current_user)):
    if current_user.get("has_premium"):
        raise HTTPException(status_code=400, detail="You already have premium access")

    try:
        application = await submit_application(current_user, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PremiumApplicationResponse(**application)


@router.get("/status", response_model=Optional[PremiumApplicationResponse])
async def subscription_status(current_user=Depends(get_current_user)):
    application = await get_user_application(current_user["id"])
    if not application:
        return None
    return PremiumApplicationResponse(**application)
