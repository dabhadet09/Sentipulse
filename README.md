# SentimentSense — ML Sentiment & Emotion Analysis Platform

**Final Year Project** | Transformer-based analysis for YouTube, Reddit, X (Twitter), and Instagram

## Overview

SentimentSense is a full-stack machine learning application that performs **sentiment analysis** and **emotion detection** on social media content using fine-tuned Transformer models (DistilBERT, RoBERTa, BERT, MuRIL, DistilRoBERTa).

### Key Features

- **Multi-Platform Analysis**: YouTube videos, livestreams, Reddit discussions, X posts, Instagram reels/posts
- **ML Models**: Pre-trained & fine-tuned Transformers via Hugging Face
- **User Authentication**: Register/Login with JWT, personal dashboard per user
- **Admin Panel**: User management, premium subscription approval
- **Subscription System**: Premium live stream analysis with application workflow
- **PDF Reports**: Downloadable analysis reports with charts
- **Fine-Tuning Scripts**: Train custom models on your dataset

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts, Axios |
| Backend | Python, FastAPI, Uvicorn |
| ML/NLP | PyTorch, Hugging Face Transformers, scikit-learn |
| Auth | JWT (python-jose), bcrypt |
| Reports | ReportLab, Matplotlib |

## ML Models Used

| Model | Purpose | Hugging Face ID |
|-------|---------|----------------|
| **DistilBERT** | Fast sentiment classification | `distilbert-base-uncased-finetuned-sst-2-english` |
| **RoBERTa** | Twitter/social media sentiment | `cardiffnlp/twitter-roberta-base-sentiment-latest` |
| **BERT** | Multilingual sentiment (1-5 stars) | `nlptown/bert-base-multilingual-uncased-sentiment` |
| **MuRIL** | Indian languages (Hindi, Tamil, etc.) | `google/muril-base-cased` |
| **DistilRoBERTa** | 7-class emotion detection | `j-hartmann/emotion-english-distilroberta-base` |

## Project Structure

```
sentipulse/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment settings
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── schemas/             # Pydantic models
│   │   └── utils/               # Auth & security
│   ├── ml/
│   │   ├── model_manager.py     # Transformer pipeline manager
│   │   ├── sentiment_analyzer.py
│   │   ├── emotion_analyzer.py
│   │   ├── platform_fetchers.py # YouTube, Reddit, X, Instagram
│   │   └── fine_tuning/
│   │       └── train_sentiment.py  # Fine-tuning script
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/               # Dashboard, Analyze, Admin, etc.
│       ├── components/          # Layout, shared UI
│       ├── context/             # Auth context
│       └── services/            # API client
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- Supabase Account

### 1. Supabase Setup

1. Create a free project on [Supabase](https://supabase.com).
2. Get your `SUPABASE_URL` and `SUPABASE_KEY`.
3. Add them to your `.env` file.

### 2. Backend Setup

```bash
cd sentipulse/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env       # Linux/Mac

# Run backend
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd sentipulse/frontend

npm install
npm run dev
```

App: http://localhost:5173

### Default Admin Credentials

```
Email: admin@sentipulse.com
Password: Admin@123456
```

Change these in `.env` before deployment.

## Fine-Tuning Models (For Project Demo)

```bash
cd backend

# Fine-tune DistilBERT on custom dataset
python -m ml.fine_tuning.train_sentiment --model distilbert --epochs 3

# Fine-tune RoBERTa
python -m ml.fine_tuning.train_sentiment --model roberta --epochs 5

# Fine-tune MuRIL for Indian languages
python -m ml.fine_tuning.train_sentiment --model muril --epochs 3
```

Checkpoints saved to `ml/fine_tuning/checkpoints/`

### ML Jupyter Notebook (for viva/demo)

See [docs/02-JUPYTER-NOTEBOOK.md](docs/02-JUPYTER-NOTEBOOK.md)

```bash
cd backend
pip install jupyter ipykernel
jupyter notebook ml/notebooks/SentiPulse_ML_Analysis.ipynb
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/analysis/text` | Analyze single text |
| POST | `/api/analysis/url` | Analyze URL content |
| GET | `/api/analysis/history` | User's analysis history |
| GET | `/api/analysis/{id}/report` | Download PDF report |
| POST | `/api/subscription/apply` | Apply for premium |
| GET | `/api/admin/users` | List all users (admin) |
| PATCH | `/api/admin/applications/{id}` | Approve/reject premium |

## Subscription Flow

1. User registers and gets free access (YouTube, Reddit, X, Instagram)
2. **Live stream analysis** requires premium subscription
3. User fills premium application form with reason and use case
4. Admin reviews in Admin Panel → Approve or Reject
5. On approval, user gets premium access automatically

## For Project Presentation

### What to Highlight

1. **ML Pipeline**: Show Models page → explain each Transformer architecture
2. **Fine-Tuning**: Run `train_sentiment.py` live, show loss curves in `training_metrics.json`
3. **Multi-Model Comparison**: Analyze same text with DistilBERT vs RoBERTa vs MuRIL
4. **Emotion Detection**: 7-class emotion output with confidence scores
5. **Full Stack**: Auth → Analysis → Dashboard → PDF Report download
6. **Admin Workflow**: Premium application approval demo

### Architecture Diagram (for report)

```
User → React Frontend → FastAPI Backend → Supabase
                              ↓
                    Transformer Models (Hugging Face)
                    ├── DistilBERT (Sentiment)
                    ├── RoBERTa (Social Sentiment)
                    ├── BERT (Multilingual)
                    ├── MuRIL (Indian Languages)
                    └── DistilRoBERTa (Emotion)
                              ↓
                    Platform Fetchers
                    ├── YouTube Transcript API
                    ├── Reddit API (PRAW)
                    ├── Twitter/X API
                    └── Instagram API
```

## Documentation

| Doc | Description |
|-----|-------------|
| [02 — Jupyter Notebook](docs/02-JUPYTER-NOTEBOOK.md) | ML demo for viva |
| [03 — Synopsis](docs/03-SYNOPSIS.md) | Short college synopsis (1–2 pages) |
| [03 — Project Report](docs/03-PROJECT-REPORT.md) | Full final year report |
| [03 — Report Guide](docs/03-README-REPORT-GUIDE.md) | How to submit to college |
| [04 — YouTube API Setup](docs/04-YOUTUBE-API-SETUP.md) | Real YouTube comments integration |

## License

MIT — For educational/final year project use.
