"""
Platform-specific content fetchers for analysis.
YouTube uses YouTube Data API v3 when YOUTUBE_API_KEY is set.
Other platforms use demo data until their APIs are configured.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    items: List[Dict]
    data_source: str = "demo"
    video_title: Optional[str] = None
    video_id: Optional[str] = None
    message: Optional[str] = None
    metadata: Dict = field(default_factory=dict)


class BasePlatformFetcher(ABC):
    @abstractmethod
    async def fetch_content(self, url: str, max_items: int = 100) -> FetchResult:
        pass

    @abstractmethod
    def extract_id(self, url: str) -> Optional[str]:
        pass


class YouTubeFetcher(BasePlatformFetcher):
    VIDEO_PATTERNS = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/live/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    ]

    def extract_id(self, url: str) -> Optional[str]:
        for pattern in self.VIDEO_PATTERNS:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    async def fetch_content(self, url: str, max_items: int = 100, live_mode: bool = False) -> FetchResult:
        video_id = self.extract_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")

        from ml.youtube_api import YouTubeAPIClient, is_youtube_api_configured

        if is_youtube_api_configured():
            try:
                return await self._fetch_via_api(video_id, max_items, live_mode)
            except Exception as e:
                logger.warning("YouTube API fetch failed: %s", e)
                transcript_items = await self._fetch_transcript_fallback(video_id, max_items)
                if transcript_items:
                    return FetchResult(
                        items=transcript_items,
                        data_source="youtube_transcript",
                        video_id=video_id,
                        message=f"API unavailable ({e}). Using transcript fallback.",
                    )
                return FetchResult(
                    items=self._demo_comments(video_id, max_items),
                    data_source="demo",
                    video_id=video_id,
                    message=f"API unavailable ({e}). Showing sample data.",
                )

        transcript_items = await self._fetch_transcript_fallback(video_id, max_items)
        if transcript_items:
            return FetchResult(
                items=transcript_items,
                data_source="youtube_transcript",
                video_id=video_id,
                message="YouTube API key not set. Using video transcript. Add YOUTUBE_API_KEY for real comments.",
            )

        return FetchResult(
            items=self._demo_comments(video_id, max_items),
            data_source="demo",
            video_id=video_id,
            message="YouTube API key not set and transcript unavailable. Showing sample data.",
        )

    async def _fetch_via_api(self, video_id: str, max_items: int, live_mode: bool) -> FetchResult:
        from ml.youtube_api import YouTubeAPIClient

        client = YouTubeAPIClient()
        video = await client.get_video_details(video_id)

        if not video:
            raise ValueError("Video not found or is private")

        items: List[Dict] = []

        if video.get("title"):
            items.append({
                "text": video["title"],
                "author": video.get("channel", "channel"),
                "timestamp": video.get("published_at"),
                "source": "youtube_api",
                "type": "title",
            })

        if live_mode and video.get("live_chat_id"):
            chat_items = await client.fetch_live_chat(video["live_chat_id"], max_items)
            items.extend(chat_items)
            source = "youtube_live_chat"
            message = f"Fetched {len(chat_items)} live chat messages via YouTube API"
        else:
            if live_mode and not video.get("live_chat_id"):
                message = "Live chat not active. Fetching video comments instead."
            else:
                message = None

            comments = await client.fetch_comments(video_id, max_items)
            items.extend(comments)
            source = "youtube_api"
            if not message:
                message = f"Fetched {len(comments)} comments via YouTube Data API"

            if not comments and video.get("comment_count", 0) == 0:
                message = "Comments are disabled on this video. Try another video."

        if not items or (len(items) == 1 and items[0].get("type") == "title"):
            transcript = await self._fetch_transcript_fallback(video_id, max_items)
            if transcript:
                items.extend(transcript)
                source = "youtube_transcript"
                message = "No comments available. Using video transcript instead."

        if len(items) <= 1:
            raise ValueError(message or "No analyzable content found for this video")

        return FetchResult(
            items=items[:max_items],
            data_source=source,
            video_title=video.get("title"),
            video_id=video_id,
            message=message,
            metadata={
                "channel": video.get("channel"),
                "is_live": video.get("is_live", False),
                "comment_count": video.get("comment_count", 0),
            },
        )

    async def _fetch_transcript_fallback(self, video_id: str, max_items: int) -> List[Dict]:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi

            api = YouTubeTranscriptApi()
            transcript = list(api.fetch(video_id))
            return [
                {
                    "text": entry["text"],
                    "author": "transcript",
                    "timestamp": entry.get("start"),
                    "source": "youtube_transcript",
                }
                for entry in transcript[:max_items]
            ]
        except Exception as e:
            logger.warning("YouTube transcript fetch failed: %s", e)
            return []

    def _demo_comments(self, video_id: str, max_items: int) -> List[Dict]:
        samples = [
            "This video is absolutely amazing! Best explanation ever.",
            "I didn't like this at all, very disappointing content.",
            "Can someone explain the part at 5:30? I'm confused.",
            "Love the editing and production quality here!",
            "This changed my perspective completely, thank you!",
            "Boring and repetitive, not worth the watch.",
            "Wow! Mind blown! Sharing with all my friends!",
            "Fake and misleading information in this video.",
            "I've been waiting for this topic, well done!",
            "Not sure how I feel about this, mixed emotions.",
        ]
        return [
            {"text": samples[i % len(samples)], "author": f"user_{i+1}", "timestamp": None, "source": "demo"}
            for i in range(min(max_items, 10))
        ]


class RedditFetcher(BasePlatformFetcher):
    def extract_id(self, url: str) -> Optional[str]:
        match = re.search(r"comments/(\w+)", url)
        return match.group(1) if match else None

    async def fetch_content(self, url: str, max_items: int = 100) -> FetchResult:
        post_id = self.extract_id(url)
        if not post_id:
            raise ValueError("Invalid Reddit URL")

        try:
            import praw
            from app.config import get_settings

            settings = get_settings()
            if settings.reddit_client_id and settings.reddit_client_secret:
                reddit = praw.Reddit(
                    client_id=settings.reddit_client_id,
                    client_secret=settings.reddit_client_secret,
                    user_agent=settings.reddit_user_agent,
                )
                submission = reddit.submission(id=post_id)
                items = [{
                    "text": submission.title,
                    "author": str(submission.author),
                    "timestamp": submission.created_utc,
                    "source": "reddit_api",
                }]
                submission.comments.replace_more(limit=0)
                for comment in submission.comments.list()[: max_items - 1]:
                    items.append({
                        "text": comment.body,
                        "author": str(comment.author),
                        "timestamp": comment.created_utc,
                        "source": "reddit_api",
                    })
                return FetchResult(
                    items=items,
                    data_source="reddit_api",
                    message=f"Fetched {len(items)} items from Reddit API",
                )
        except Exception as e:
            logger.warning("Reddit API fetch failed: %s", e)

        return FetchResult(
            items=self._demo_content(post_id, max_items),
            data_source="demo",
            message="Reddit API not configured. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET for real data.",
        )

    def _demo_content(self, post_id: str, max_items: int) -> List[Dict]:
        samples = [
            "This post raises some really important points about the topic.",
            "I disagree completely, the data doesn't support this claim.",
            "Great discussion happening here, learning a lot!",
            "This is the worst take I've seen on this subreddit.",
            "Thanks OP for sharing, this helped me understand better.",
        ]
        return [
            {"text": samples[i % len(samples)], "author": f"reddit_user_{i}", "source": "demo"}
            for i in range(min(max_items, 8))
        ]


class TwitterFetcher(BasePlatformFetcher):
    def extract_id(self, url: str) -> Optional[str]:
        match = re.search(r"/status/(\d+)", url)
        return match.group(1) if match else None

    async def fetch_content(self, url: str, max_items: int = 100) -> FetchResult:
        tweet_id = self.extract_id(url)
        if not tweet_id:
            raise ValueError("Invalid Twitter/X URL")
        return FetchResult(
            items=self._demo_content(tweet_id, max_items),
            data_source="demo",
            message="X/Twitter API not configured. Showing sample data.",
        )

    def _demo_content(self, tweet_id: str, max_items: int) -> List[Dict]:
        samples = [
            "Just watched this and I'm speechless. What a moment!",
            "This is completely wrong and spreading misinformation.",
            "Interesting perspective, never thought about it this way.",
            "Best thread I've read all week, bookmarking this.",
        ]
        return [
            {"text": samples[i % len(samples)], "author": f"@user_{i}", "source": "demo"}
            for i in range(min(max_items, 6))
        ]


class InstagramFetcher(BasePlatformFetcher):
    def extract_id(self, url: str) -> Optional[str]:
        match = re.search(r"(?:p|reel|tv)/([\w-]+)", url)
        return match.group(1) if match else None

    async def fetch_content(self, url: str, max_items: int = 100) -> FetchResult:
        post_id = self.extract_id(url)
        if not post_id:
            raise ValueError("Invalid Instagram URL")
        return FetchResult(
            items=self._demo_content(post_id, max_items),
            data_source="demo",
            message="Instagram API not configured. Showing sample data.",
        )

    def _demo_content(self, post_id: str, max_items: int) -> List[Dict]:
        samples = [
            "Obsessed with this reel! The aesthetic is everything.",
            "The comments section is wild on this one.",
            "Living for this content, keep it coming!",
            "Tag someone who needs to see this!",
        ]
        return [
            {"text": samples[i % len(samples)], "author": f"ig_user_{i}", "source": "demo"}
            for i in range(min(max_items, 6))
        ]


class YouTubeLiveFetcher(YouTubeFetcher):
    async def fetch_content(self, url: str, max_items: int = 100) -> FetchResult:
        return await super().fetch_content(url, max_items, live_mode=True)


FETCHERS = {
    "youtube": YouTubeFetcher(),
    "youtube_live": YouTubeLiveFetcher(),
    "reddit": RedditFetcher(),
    "twitter": TwitterFetcher(),
    "instagram": InstagramFetcher(),
}


def get_fetcher(platform: str) -> BasePlatformFetcher:
    fetcher = FETCHERS.get(platform)
    if not fetcher:
        raise ValueError(f"Unsupported platform: {platform}")
    return fetcher


def get_platform_api_status() -> dict:
    from ml.youtube_api import is_youtube_api_configured
    from app.config import get_settings

    settings = get_settings()
    return {
        "youtube": {
            "configured": is_youtube_api_configured(),
            "description": "YouTube Data API v3 — comments & live chat",
        },
        "reddit": {
            "configured": bool(settings.reddit_client_id and settings.reddit_client_secret),
            "description": "Reddit API (PRAW) — not configured",
        },
        "twitter": {
            "configured": bool(settings.twitter_bearer_token),
            "description": "X/Twitter API — not configured",
        },
        "instagram": {
            "configured": bool(settings.instagram_access_token),
            "description": "Instagram API — not configured",
        },
    }
