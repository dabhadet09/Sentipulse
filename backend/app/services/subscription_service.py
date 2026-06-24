from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId

from app.database import get_db
from app.schemas.schemas import PremiumApplication, SubscriptionStatus


def _serialize_application(doc: dict, user: dict = None) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": doc["user_id"],
        "user_name": user["name"] if user else doc.get("user_name", ""),
        "user_email": user["email"] if user else doc.get("user_email", ""),
        "reason": doc["reason"],
        "use_case": doc["use_case"],
        "organization": doc.get("organization"),
        "status": doc["status"],
        "admin_note": doc.get("admin_note"),
        "created_at": doc["created_at"],
        "reviewed_at": doc.get("reviewed_at"),
    }


async def submit_application(user: dict, data: PremiumApplication) -> dict:
    db = get_db()
    existing = await db.premium_applications.find_one(
        {"user_id": user["id"], "status": SubscriptionStatus.PENDING.value}
    )
    if existing:
        raise ValueError("You already have a pending application")

    doc = {
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "reason": data.reason,
        "use_case": data.use_case,
        "organization": data.organization,
        "status": SubscriptionStatus.PENDING.value,
        "admin_note": None,
        "created_at": datetime.now(timezone.utc),
        "reviewed_at": None,
    }
    result = await db.premium_applications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_application(doc, user)


async def get_user_application(user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.premium_applications.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)],
    )
    return _serialize_application(doc) if doc else None


async def get_all_applications(status: Optional[str] = None) -> List[dict]:
    db = get_db()
    query = {"status": status} if status else {}
    cursor = db.premium_applications.find(query).sort("created_at", -1)
    return [_serialize_application(doc) async for doc in cursor]


async def review_application(
    application_id: str, status: SubscriptionStatus, admin_note: Optional[str] = None
) -> Optional[dict]:
    db = get_db()
    if status not in (SubscriptionStatus.APPROVED, SubscriptionStatus.REJECTED):
        raise ValueError("Status must be approved or rejected")

    doc = await db.premium_applications.find_one_and_update(
        {"_id": ObjectId(application_id), "status": SubscriptionStatus.PENDING.value},
        {
            "$set": {
                "status": status.value,
                "admin_note": admin_note,
                "reviewed_at": datetime.now(timezone.utc),
            }
        },
        return_document=True,
    )
    if not doc:
        return None

    if status == SubscriptionStatus.APPROVED:
        await db.users.update_one(
            {"_id": ObjectId(doc["user_id"])},
            {
                "$set": {
                    "has_premium": True,
                    "subscription_status": SubscriptionStatus.APPROVED.value,
                }
            },
        )
    elif status == SubscriptionStatus.REJECTED:
        await db.users.update_one(
            {"_id": ObjectId(doc["user_id"])},
            {"$set": {"subscription_status": SubscriptionStatus.REJECTED.value}},
        )

    return _serialize_application(doc)
