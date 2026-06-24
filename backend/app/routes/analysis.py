from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.schemas.schemas import (
    TextAnalysisRequest,
    URLAnalysisRequest,
    TextAnalysisResponse,
    BatchAnalysisResponse,
    AnalysisHistoryItem,
    SentimentResult,
    EmotionResult,
    Platform,
)

from ml.sentiment_analyzer import SentimentAnalyzer, aggregate_sentiments
from ml.emotion_analyzer import EmotionAnalyzer, aggregate_emotions
from ml.platform_fetchers import get_fetcher, get_platform_api_status
from ml.model_manager import get_model_manager
from fastapi.responses import Response
from datetime import datetime, timezone

router = APIRouter(prefix="/analysis", tags=["Analysis"])

sentiment_analyzer = SentimentAnalyzer()
emotion_analyzer = EmotionAnalyzer()


@router.get("/models")
async def list_models():
    manager = get_model_manager()
    return {"models": manager.list_models(), "ready": manager.is_ready()}


@router.get("/platforms/status")
async def platform_status():
    return get_platform_api_status()


@router.post("/text", response_model=TextAnalysisResponse)
async def analyze_text(data: TextAnalysisRequest):
    sentiment = sentiment_analyzer.analyze(data.text, data.model)
    emotion = emotion_analyzer.analyze(data.text)

    return TextAnalysisResponse(
        text=data.text,
        sentiment=SentimentResult(
            label=sentiment["label"],
            score=sentiment["score"],
            model_used=sentiment["model_used"],
        ),
        emotion=EmotionResult(
            label=emotion["label"],
            score=emotion["score"],
            all_emotions=emotion["all_emotions"],
        ),
        platform=data.platform,
        model_used=sentiment["model_used"],
    )


@router.post("/url", response_model=BatchAnalysisResponse)
async def analyze_url(data: URLAnalysisRequest):
    try:
        fetcher = get_fetcher(data.platform.value)
        fetch_result = await fetcher.fetch_content(data.url, data.max_comments)
        content_items = fetch_result.items
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    analyzed_items = []
    sentiment_results = []
    emotion_results = []

    for item in content_items:
        if item.get("type") == "title":
            continue
        text = item.get("text", "")
        if not text.strip():
            continue
        s = sentiment_analyzer.analyze(text, data.model)
        e = emotion_analyzer.analyze(text)
        sentiment_results.append(s)
        emotion_results.append(e)
        analyzed_items.append({
            "text": text,
            "author": item.get("author"),
            "sentiment": s,
            "emotion": e,
        })

    if not analyzed_items:
        raise HTTPException(status_code=400, detail="No content found to analyze")

    analysis_data = {
        "id": "fastapi-generated",
        "platform": data.platform.value,
        "source_url": data.url,
        "total_items": len(analyzed_items),
        "sentiment_summary": aggregate_sentiments(sentiment_results),
        "emotion_summary": aggregate_emotions(emotion_results),
        "items": analyzed_items,
        "model_used": sentiment_results[0]["model_used"] if sentiment_results else "DistilBERT",
        "data_source": fetch_result.data_source,
        "video_title": fetch_result.video_title,
        "fetch_message": fetch_result.message,
        "created_at": datetime.now(timezone.utc),
    }

    return BatchAnalysisResponse(**analysis_data)



