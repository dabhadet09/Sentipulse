"""Test YouTube Data API v3 connection and comment fetching."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from ml.youtube_api import YouTubeAPIClient, is_youtube_api_configured


async def main():
    settings = get_settings()
    print("SentiPulse — YouTube API Test")
    print("-" * 40)

    if not is_youtube_api_configured():
        print("ERROR: YOUTUBE_API_KEY is not set in backend/.env")
        print("\nSteps:")
        print("  1. Get API key from Google Cloud Console")
        print("  2. Enable YouTube Data API v3")
        print("  3. Add to .env: YOUTUBE_API_KEY=your_key_here")
        print("\nSee docs/04-YOUTUBE-API-SETUP.md")
        sys.exit(1)

    key_preview = settings.youtube_api_key[:8] + "..." + settings.youtube_api_key[-4:]
    print(f"API Key: {key_preview}")

    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    from ml.platform_fetchers import YouTubeFetcher

    fetcher = YouTubeFetcher()
    video_id = fetcher.extract_id(test_url)
    print(f"Video ID: {video_id}")
    print("-" * 40)

    client = YouTubeAPIClient()

    try:
        print("Fetching video details...")
        video = await client.get_video_details(video_id)
        print(f"  Title:   {video['title']}")
        print(f"  Channel: {video['channel']}")
        print(f"  Comments: {video['comment_count']}")
        print(f"  Live:    {video['is_live']}")

        print("\nFetching comments (max 10)...")
        comments = await client.fetch_comments(video_id, max_items=10)
        print(f"  Retrieved: {len(comments)} comments\n")

        for i, c in enumerate(comments[:5], 1):
            text = c["text"][:70] + ("..." if len(c["text"]) > 70 else "")
            print(f"  {i}. @{c['author']}: {text}")

        if len(comments) > 5:
            print(f"  ... and {len(comments) - 5} more")

        print("\nYouTube API is working correctly.")
        print("Use any public YouTube video URL in the Analyze page.")
    except Exception as e:
        print(f"\nFAILED: {e}")
        print("\nCommon fixes:")
        print("  - Enable 'YouTube Data API v3' in Google Cloud Console")
        print("  - Check API key restrictions (allow YouTube Data API)")
        print("  - Ensure video is public and comments are enabled")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
