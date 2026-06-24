"""Test MongoDB / MongoDB Atlas connection for SentiPulse."""

import asyncio
import sys
from pathlib import Path

# Allow running from backend/ as: python scripts/test_mongodb.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings


async def main():
    settings = get_settings()
    masked_url = settings.mongodb_url
    if "@" in masked_url:
        prefix, rest = masked_url.split("@", 1)
        user_part = prefix.split("//")[-1].split(":")[0]
        masked_url = masked_url.replace(prefix.split("//")[-1], f"{user_part}:****")

    print("SentiPulse — MongoDB Connection Test")
    print("-" * 40)
    print(f"URL:      {masked_url}")
    print(f"Database: {settings.database_name}")
    print("-" * 40)

    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        print("ERROR: motor not installed. Run: pip install motor")
        sys.exit(1)

    client = AsyncIOMotorClient(
        settings.mongodb_url,
        serverSelectionTimeoutMS=10000,
    )

    try:
        print("Connecting...")
        await client.admin.command("ping")
        print("Ping successful — connection OK")

        db = client[settings.database_name]
        collections = await db.list_collection_names()
        if collections:
            print(f"Existing collections: {', '.join(collections)}")
        else:
            print("Database is empty (collections created on first app use):")
            print("  - users")
            print("  - analyses")
            print("  - premium_applications")

        if settings.mongodb_url.startswith("mongodb+srv://"):
            print("\nMongoDB Atlas is configured correctly.")
        else:
            print("\nUsing local MongoDB (mongodb://).")

        print("\nAll good. Start backend with:")
        print("  uvicorn app.main:app --reload --port 8000")
    except Exception as e:
        print(f"\nFAILED: {e}")
        print("\nTips:")
        print("  - Check MONGODB_URL in backend/.env")
        print("  - URL-encode special characters in password (@ → %40)")
        print("  - Whitelist your IP in Atlas → Network Access")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
