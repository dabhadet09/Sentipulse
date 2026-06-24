from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from app.database import get_db
from app.utils.security import hash_password, verify_password
from app.schemas.schemas import UserRegister, SubscriptionStatus, UserRole


def _serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "email": doc["email"],
        "role": doc.get("role", "user"),
        "has_premium": doc.get("has_premium", False),
        "subscription_status": doc.get("subscription_status", "none"),
        "created_at": doc.get("created_at"),
    }


async def create_user(data: UserRegister) -> dict:
    db = get_db()
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise ValueError("Email already registered")

    doc = {
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "role": UserRole.USER.value,
        "has_premium": False,
        "subscription_status": SubscriptionStatus.NONE.value,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_user(doc)


async def get_user_by_email(email: str) -> Optional[dict]:
    db = get_db()
    doc = await db.users.find_one({"email": email.lower()})
    return _serialize_user(doc) if doc else None


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    db = get_db()
    doc = await db.users.find_one({"email": email.lower()})
    if not doc or not verify_password(password, doc["password_hash"]):
        return None
    return _serialize_user(doc)


async def get_all_users() -> List[dict]:
    db = get_db()
    cursor = db.users.find({}, {"password_hash": 0}).sort("created_at", -1)
    return [_serialize_user(doc) async for doc in cursor]


async def update_user(user_id: str, updates: dict) -> Optional[dict]:
    db = get_db()
    allowed = {"has_premium", "role", "subscription_status"}
    filtered = {k: v for k, v in updates.items() if k in allowed and v is not None}
    if not filtered:
        return None

    if "role" in filtered:
        filtered["role"] = filtered["role"].value if hasattr(filtered["role"], "value") else filtered["role"]
    if "subscription_status" in filtered:
        val = filtered["subscription_status"]
        filtered["subscription_status"] = val.value if hasattr(val, "value") else val

    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": filtered},
        return_document=True,
    )
    return _serialize_user(result) if result else None


async def ensure_admin_exists(email: str, password: str, name: str = "Admin"):
    db = get_db()
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return
    doc = {
        "name": name,
        "email": email.lower(),
        "password_hash": hash_password(password),
        "role": UserRole.ADMIN.value,
        "has_premium": True,
        "subscription_status": SubscriptionStatus.APPROVED.value,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)


async def get_dashboard_stats() -> Dict[str, Any]:
    db = get_db()
    total_users = await db.users.count_documents({"role": "user"})
    premium_users = await db.users.count_documents({"has_premium": True})
    pending_applications = await db.premium_applications.count_documents({"status": "pending"})
    total_analyses = await db.analyses.count_documents({})

    pipeline = [
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}},
    ]
    platform_counts = {}
    async for item in db.analyses.aggregate(pipeline):
        platform_counts[item["_id"]] = item["count"]

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "pending_applications": pending_applications,
        "total_analyses": total_analyses,
        "analyses_by_platform": platform_counts,
    }
