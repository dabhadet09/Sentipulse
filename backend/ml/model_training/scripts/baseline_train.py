import os
import re
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

def preprocess_text(text):
    """
    Cleans text by converting to lowercase, removing URLs, mentions,
    special characters, and extra spaces.
    """
    if not isinstance(text, str):
        return ""
    
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove URLs
    text = re.sub(r"http\S+|www\S+|https\S+", '', text, flags=re.MULTILINE)
    
    # 3. Remove mentions
    text = re.sub(r'\@\w+', '', text)
    
    # 4. Remove special characters (keep only alphabets and spaces)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    
    # 5. Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def main():
    train_file = "backend/data/train.json"
    
    if not os.path.exists(train_file):
        print(f"Error: {train_file} not found. Ensure dataset is available.")
        return

    print("Loading training data...")
    df_train = pd.read_json(train_file)
    
    print("Preprocessing text data...")
    df_train['clean_text'] = df_train['text'].apply(preprocess_text)
    
    # Filter out empty text to avoid breaking the model
    df_train = df_train[df_train['clean_text'] != '']
    
    X_train = df_train['clean_text']
    y_train = df_train['sentiment']
    
    print("Building TF-IDF + Logistic Regression pipeline...")
    # Pipeline handles both Feature Extraction (TF-IDF) and the Classifier
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=10000)),
        ('clf', LogisticRegression(max_iter=1000, random_state=42))
    ])
    
    print("Training Logistic Regression model...")
    pipeline.fit(X_train, y_train)
    
    # Define and create the output directory
    output_dir = "saved_models/logistic_regression/"
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, "baseline_model.joblib")
    print(f"Saving model to {model_path}...")
    joblib.dump(pipeline, model_path)
    
    print("✓ Baseline model training complete!")

if __name__ == "__main__":
    main()
