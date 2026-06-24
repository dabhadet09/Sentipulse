from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from app.database import get_db


def _serialize_analysis(doc: dict, include_items: bool = False) -> dict:
    result = {
        "id": str(doc["_id"]),
        "user_id": doc["user_id"],
        "platform": doc["platform"],
        "source_url": doc.get("source_url"),
        "total_items": doc["total_items"],
        "sentiment_summary": doc["sentiment_summary"],
        "emotion_summary": doc["emotion_summary"],
        "model_used": doc["model_used"],
        "data_source": doc.get("data_source"),
        "video_title": doc.get("video_title"),
        "fetch_message": doc.get("fetch_message"),
        "created_at": doc["created_at"],
    }
    if include_items:
        result["items"] = doc.get("items", [])
    return result


async def save_analysis(user_id: str, analysis_data: dict) -> dict:
    db = get_db()
    doc = {
        "user_id": user_id,
        "platform": analysis_data["platform"],
        "source_url": analysis_data.get("source_url"),
        "total_items": analysis_data["total_items"],
        "sentiment_summary": analysis_data["sentiment_summary"],
        "emotion_summary": analysis_data["emotion_summary"],
        "items": analysis_data.get("items", []),
        "model_used": analysis_data["model_used"],
        "data_source": analysis_data.get("data_source"),
        "video_title": analysis_data.get("video_title"),
        "fetch_message": analysis_data.get("fetch_message"),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.analyses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_analysis(doc, include_items=True)


async def get_user_analyses(user_id: str, limit: int = 50) -> List[dict]:
    db = get_db()
    cursor = (
        db.analyses.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    return [_serialize_analysis(doc) async for doc in cursor]


async def get_analysis_by_id(analysis_id: str, user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.analyses.find_one(
        {"_id": ObjectId(analysis_id), "user_id": user_id}
    )
    return _serialize_analysis(doc, include_items=True) if doc else None


async def get_user_stats(user_id: str) -> Dict[str, Any]:
    db = get_db()
    total = await db.analyses.count_documents({"user_id": user_id})

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}},
    ]
    by_platform = {}
    async for item in db.analyses.aggregate(pipeline):
        by_platform[item["_id"]] = item["count"]

    recent = await get_user_analyses(user_id, limit=5)
    return {"total_analyses": total, "by_platform": by_platform, "recent": recent}
