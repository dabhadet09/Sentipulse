import json
import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer

# Standardize labels to integer IDs
LABEL_MAP = {
    "negative": 0,
    "neutral": 1,
    "positive": 2
}

class MurilSentimentDataset(Dataset):
    """
    Custom PyTorch Dataset for loading sentiment analysis data.
    Supports both JSON arrays and JSONL (JSON lines) formats.
    """
    def __init__(self, file_path, tokenizer, max_length=128):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.data = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                # Try loading as a single JSON array
                self.data = json.load(f)
            except json.JSONDecodeError:
                # Fallback to JSONL (JSON lines)
                f.seek(0)
                self.data = [json.loads(line) for line in f if line.strip()]
                
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        item = self.data[idx]
        text = item['text']
        
        # We ensure label is lowercase to avoid mismatches
        label_str = item.get('sentiment', 'neutral').lower()
        label = LABEL_MAP.get(label_str, 1) # Default to neutral if not found
        
        encoding = self.tokenizer(
            text,
            padding='max_length',
            truncation=True,
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }
