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
from app.utils.security import get_current_user, get_premium_user
from app.services.analysis_service import save_analysis, get_user_analyses, get_analysis_by_id, get_user_stats
from app.services.report_service import generate_analysis_report
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
async def list_models(current_user=Depends(get_current_user)):
    manager = get_model_manager()
    return {"models": manager.list_models(), "ready": manager.is_ready()}


@router.get("/platforms/status")
async def platform_status(current_user=Depends(get_current_user)):
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


@router.get("/history", response_model=List[AnalysisHistoryItem])
async def analysis_history(current_user=Depends(get_current_user)):
    analyses = await get_user_analyses(current_user["id"])
    return [AnalysisHistoryItem(**a) for a in analyses]


@router.get("/stats")
async def user_stats(current_user=Depends(get_current_user)):
    return await get_user_stats(current_user["id"])


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, current_user=Depends(get_current_user)):
    analysis = await get_analysis_by_id(analysis_id, current_user["id"])
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/{analysis_id}/report")
async def download_report(analysis_id: str, current_user=Depends(get_current_user)):
    analysis = await get_analysis_by_id(analysis_id, current_user["id"])
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    pdf_bytes = generate_analysis_report(analysis, current_user["name"])
    filename = f"sentipulse_report_{analysis_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
