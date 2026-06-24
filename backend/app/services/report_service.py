"""
PDF Report Generator for analysis results.
Includes sentiment/emotion charts and detailed breakdowns.
"""

import io
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER


def _create_chart_image(sentiment: Dict, emotion: Dict) -> io.BytesIO:
    """Generate bar charts for sentiment and emotion distribution."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

    # Sentiment chart
    s_labels = list(sentiment.keys())
    s_values = list(sentiment.values())
    colors_s = ["#22c55e", "#ef4444", "#94a3b8"]
    ax1.bar(s_labels, s_values, color=colors_s[: len(s_labels)])
    ax1.set_title("Sentiment Distribution (%)")
    ax1.set_ylabel("Percentage")

    # Emotion chart
    e_labels = list(emotion.keys())
    e_values = list(emotion.values())
    ax2.barh(e_labels, e_values, color="#6366f1")
    ax2.set_title("Emotion Distribution (%)")
    ax2.set_xlabel("Percentage")

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close()
    buf.seek(0)
    return buf


def generate_analysis_report(analysis: Dict[str, Any], user_name: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], alignment=TA_CENTER, spaceAfter=20)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], spaceAfter=10, spaceBefore=15)

    elements = []

    elements.append(Paragraph("SentiPulse Analysis Report", title_style))
    elements.append(Paragraph(
        f"Generated for: <b>{user_name}</b> | "
        f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        styles["Normal"],
    ))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Analysis Overview", heading_style))
    overview_data = [
        ["Platform", analysis.get("platform", "N/A").upper()],
        ["Source URL", analysis.get("source_url") or "Manual Input"],
        ["Total Items Analyzed", str(analysis.get("total_items", 0))],
        ["ML Model Used", analysis.get("model_used", "DistilBERT")],
        ["Analysis Date", analysis.get("created_at", datetime.now()).strftime("%Y-%m-%d %H:%M")
         if hasattr(analysis.get("created_at"), "strftime")
         else str(analysis.get("created_at", "N/A"))],
    ]
    overview_table = Table(overview_data, colWidths=[2.5 * inch, 4 * inch])
    overview_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(overview_table)
    elements.append(Spacer(1, 20))

    try:
        chart_buf = _create_chart_image(
            analysis.get("sentiment_summary", {}),
            analysis.get("emotion_summary", {}),
        )
        elements.append(Paragraph("Visual Analytics", heading_style))
        elements.append(Image(chart_buf, width=6.5 * inch, height=2.6 * inch))
        elements.append(Spacer(1, 20))
    except Exception:
        pass

    elements.append(Paragraph("Sentiment Summary", heading_style))
    sentiment = analysis.get("sentiment_summary", {})
    s_data = [["Sentiment", "Percentage (%)"]]
    for label, pct in sentiment.items():
        s_data.append([label.capitalize(), f"{pct}%"])
    s_table = Table(s_data, colWidths=[3 * inch, 2 * inch])
    s_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(s_table)
    elements.append(Spacer(1, 15))

    elements.append(Paragraph("Emotion Summary", heading_style))
    emotion = analysis.get("emotion_summary", {})
    e_data = [["Emotion", "Percentage (%)"]]
    for label, pct in emotion.items():
        e_data.append([label.capitalize(), f"{pct}%"])
    e_table = Table(e_data, colWidths=[3 * inch, 2 * inch])
    e_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8b5cf6")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(e_table)

    items = analysis.get("items", [])[:20]
    if items:
        elements.append(Paragraph("Sample Analyzed Items (Top 20)", heading_style))
        item_data = [["#", "Text", "Sentiment", "Emotion", "Score"]]
        for i, item in enumerate(items, 1):
            text = item.get("text", "")[:80] + ("..." if len(item.get("text", "")) > 80 else "")
            item_data.append([
                str(i),
                text,
                item.get("sentiment", {}).get("label", "N/A"),
                item.get("emotion", {}).get("label", "N/A"),
                f"{item.get('sentiment', {}).get('score', 0):.2f}",
            ])
        item_table = Table(item_data, colWidths=[0.4 * inch, 3 * inch, 1 * inch, 1 * inch, 0.6 * inch])
        item_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(item_table)

    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        "<i>Report generated by SentiPulse — Transformer-based Sentiment & Emotion Analysis Platform</i>",
        ParagraphStyle("Footer", parent=styles["Normal"], alignment=TA_CENTER, textColor=colors.grey),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
