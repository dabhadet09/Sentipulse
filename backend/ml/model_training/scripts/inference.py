import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Load model globally to avoid loading on every request
MODEL_DIR = "saved_models/muril_sentiment/"
LABEL_MAP = {
    0: "negative",
    1: "neutral",
    2: "positive"
}

app = FastAPI(
    title="MuRIL Sentiment Classifier API",
    description="Inference endpoint for predicting sentiment using a fine-tuned MuRIL model.",
    version="1.0.0"
)

# Load model at startup
try:
    if os.path.exists(MODEL_DIR):
        print(f"Loading model from {MODEL_DIR}...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.eval()
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model.to(device)
        print("Model loaded successfully.")
    else:
        print(f"Warning: {MODEL_DIR} does not exist. Endpoint will fail until model is trained.")
        tokenizer = None
        model = None
except Exception as e:
    print(f"Error loading model: {e}")
    tokenizer = None
    model = None


class SentimentRequest(BaseModel):
    text: str
    
    class Config:
        schema_extra = {
            "example": {
                "text": "This app is completely useless and slow."
            }
        }

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    confidence: float

@app.post("/predict", response_model=SentimentResponse)
async def predict_sentiment(request: SentimentRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Train the model first.")
        
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    # Tokenize input
    inputs = tokenizer(
        request.text, 
        max_length=128, 
        padding='max_length', 
        truncation=True, 
        return_tensors="pt"
    ).to(model.device)
    
    # Run inference
    with torch.no_grad():
        outputs = model(**inputs)
        
    logits = outputs.logits
    probabilities = torch.nn.functional.softmax(logits, dim=-1)
    
    # Get highest probability and corresponding class
    confidence, predicted_class = torch.max(probabilities, dim=-1)
    
    predicted_label = LABEL_MAP[predicted_class.item()]
    
    return SentimentResponse(
        text=request.text,
        sentiment=predicted_label,
        confidence=round(confidence.item(), 4)
    )

@app.get("/health")
async def health_check():
    if model is not None and tokenizer is not None:
        return {"status": "healthy", "model_loaded": True}
    return {"status": "unhealthy", "model_loaded": False}

# Run the API server directly
if __name__ == "__main__":
    import uvicorn
    print("Starting development server at http://127.0.0.1:8000")
    print("API documentation available at http://127.0.0.1:8000/docs")
    uvicorn.run("inference:app", host="127.0.0.1", port=8000, reload=True)
