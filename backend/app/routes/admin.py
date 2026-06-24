from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.schemas.schemas import (
    UserResponse,
    UserUpdate,
    PremiumApplicationResponse,
    ApplicationReview,
    DashboardStats,
    SubscriptionStatus,
)
from app.utils.security import get_admin_user
from app.services.user_service import get_all_users, update_user, get_dashboard_stats
from app.services.subscription_service import get_all_applications, review_application

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=DashboardStats)
async def admin_stats(admin=Depends(get_admin_user)):
    stats = await get_dashboard_stats()
    return DashboardStats(**stats)


@router.get("/users", response_model=List[UserResponse])
async def list_users(admin=Depends(get_admin_user)):
    users = await get_all_users()
    return [UserResponse(**u) for u in users]


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_endpoint(user_id: str, data: UserUpdate, admin=Depends(get_admin_user)):
    updated = await update_user(user_id, data.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**updated)


@router.get("/applications", response_model=List[PremiumApplicationResponse])
async def list_applications(
    status: Optional[str] = None,
    admin=Depends(get_admin_user),
):
    applications = await get_all_applications(status)
    return [PremiumApplicationResponse(**a) for a in applications]


@router.patch("/applications/{application_id}", response_model=PremiumApplicationResponse)
async def review_application_endpoint(
    application_id: str,
    data: ApplicationReview,
    admin=Depends(get_admin_user),
):
    try:
        result = await review_application(application_id, data.status, data.admin_note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not result:
        raise HTTPException(status_code=404, detail="Application not found or already reviewed")
    return PremiumApplicationResponse(**result)
