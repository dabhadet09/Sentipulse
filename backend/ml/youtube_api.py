"""
YouTube Data API v3 client for SentiPulse.
Fetches real video comments and live chat using an API key.
"""

import logging
from typing import Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeAPIClient:
    def __init__(self, api_key: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.youtube_api_key
        self.enabled = bool(self.api_key and self.api_key.strip())

    async def _get(self, endpoint: str, params: dict) -> dict:
        if not self.enabled:
            raise ValueError("YouTube API key not configured")

        params = {**params, "key": self.api_key}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{YOUTUBE_API_BASE}/{endpoint}", params=params)
            data = response.json()

            if response.status_code != 200:
                error = data.get("error", {})
                message = error.get("message", response.text)
                raise RuntimeError(f"YouTube API error: {message}")

            return data

    async def get_video_details(self, video_id: str) -> Optional[dict]:
        data = await self._get(
            "videos",
            {"part": "snippet,liveStreamingDetails,statistics", "id": video_id},
        )
        items = data.get("items", [])
        if not items:
            return None

        video = items[0]
        snippet = video.get("snippet", {})
        live = video.get("liveStreamingDetails", {})
        stats = video.get("statistics", {})

        return {
            "video_id": video_id,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "channel": snippet.get("channelTitle", ""),
            "published_at": snippet.get("publishedAt"),
            "is_live": live.get("actualStartTime") is not None and live.get("actualEndTime") is None,
            "live_chat_id": live.get("activeLiveChatId"),
            "comment_count": int(stats.get("commentCount", 0)),
        }

    async def fetch_comments(self, video_id: str, max_items: int = 100) -> List[Dict]:
        items: List[Dict] = []
        page_token = None

        while len(items) < max_items:
            batch_size = min(100, max_items - len(items))
            params = {
                "part": "snippet",
                "videoId": video_id,
                "maxResults": batch_size,
                "order": "relevance",
                "textFormat": "plainText",
            }
            if page_token:
                params["pageToken"] = page_token

            data = await self._get("commentThreads", params)

            for thread in data.get("items", []):
                snippet = thread["snippet"]["topLevelComment"]["snippet"]
                text = snippet.get("textDisplay") or snippet.get("textOriginal", "")
                if not text.strip():
                    continue
                items.append({
                    "text": text.strip(),
                    "author": snippet.get("authorDisplayName", "anonymous"),
                    "timestamp": snippet.get("publishedAt"),
                    "likes": snippet.get("likeCount", 0),
                    "source": "youtube_api",
                })
                if len(items) >= max_items:
                    break

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return items

    async def fetch_live_chat(self, live_chat_id: str, max_items: int = 100) -> List[Dict]:
        items: List[Dict] = []
        page_token = None

        while len(items) < max_items:
            batch_size = min(200, max_items - len(items))
            params = {
                "part": "snippet,authorDetails",
                "liveChatId": live_chat_id,
                "maxResults": batch_size,
            }
            if page_token:
                params["pageToken"] = page_token

            data = await self._get("liveChatMessages", params)

            for message in data.get("items", []):
                snippet = message.get("snippet", {})
                text = snippet.get("displayMessage", "").strip()
                if not text:
                    continue
                author = message.get("authorDetails", {})
                items.append({
                    "text": text,
                    "author": author.get("displayName", "anonymous"),
                    "timestamp": snippet.get("publishedAt"),
                    "likes": 0,
                    "source": "youtube_live_chat",
                })
                if len(items) >= max_items:
                    break

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return items


def is_youtube_api_configured() -> bool:
    return bool(get_settings().youtube_api_key and get_settings().youtube_api_key.strip())
