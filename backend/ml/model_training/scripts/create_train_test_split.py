import os
import json
from pymongo import MongoClient
from sklearn.model_selection import train_test_split

def main():
    # MongoDB connection details (can be updated as needed)
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
    db_name = os.environ.get("MONGO_DB", "social_analytics") # Update with your DB name
    collection_name = "dataset_records"

    print(f"Mongo URI: {mongo_uri}")
    print(f"Database Name: {db_name}")
    print(f"Collection Name: {collection_name}\n")
    
    try:
        client = MongoClient(mongo_uri)
        db = client[db_name]
        
        print(f"Connected Database: {db_name}\n")
        collections = db.list_collection_names()
        print("Collections:")
        print("[\n" + ",\n".join(f'"{c}"' for c in collections) + "\n]\n")
        
        collection = db[collection_name]
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return

    print(f"Fetching records from '{collection_name}' collection...")
    # Fetch all records, excluding the MongoDB ObjectId for JSON serialization
    records = list(collection.find({}, {"_id": 0}))
    
    total_initial = len(records)
    print(f"Total records fetched initially: {total_initial}")

    # Process: Remove duplicates and keep records containing 'text' and 'sentiment'
    seen_texts = set()
    unique_records = []
    
    for record in records:
        text = record.get("text", "")
        sentiment = record.get("sentiment")
        
        # Check if both fields exist and are not empty/None
        if text and sentiment:
            # Strip text for duplicate comparison just in case of trailing spaces
            clean_text = text.strip()
            if clean_text not in seen_texts:
                seen_texts.add(clean_text)
                unique_records.append(record)
                
    total_valid = len(unique_records)
    print(f"Total valid unique records (with text & sentiment): {total_valid}")

    if total_valid == 0:
        print("No valid records found. Exiting.")
        return

    # Extract labels to use for stratification
    labels = [r["sentiment"] for r in unique_records]

    print("\nPerforming stratified split (70% Train, 15% Validation, 15% Test)...")
    try:
        # Step 1: Split into Train (70%) and Temp (30%)
        train_records, temp_records, _, temp_labels = train_test_split(
            unique_records, labels, test_size=0.30, stratify=labels, random_state=42
        )

        # Step 2: Split Temp (30%) into Validation (15%) and Test (15%) -> test_size=0.5
        val_records, test_records = train_test_split(
            temp_records, test_size=0.50, stratify=temp_labels, random_state=42
        )
    except ValueError as e:
        print(f"Splitting failed (possibly due to too few samples per class for stratification): {e}")
        return

    print("\n--- Split Results ---")
    print(f"Total valid records: {total_valid}")
    print(f"Train records:       {len(train_records)} ({len(train_records)/total_valid*100:.1f}%)")
    print(f"Validation records:  {len(val_records)} ({len(val_records)/total_valid*100:.1f}%)")
    print(f"Test records:        {len(test_records)} ({len(test_records)/total_valid*100:.1f}%)")

    # Define output directory: backend/data relative to the project root
    # Since this script is in `scripts/`, the project root is one level up
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, "backend", "data")
    
    # Create directories if they don't exist
    os.makedirs(output_dir, exist_ok=True)

    # Save files
    files_to_save = {
        "train.json": train_records,
        "validation.json": val_records,
        "test.json": test_records
    }

    print(f"\nSaving files to {output_dir}...")
    for filename, data in files_to_save.items():
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            # Saving as JSON array, which is compatible with the dataset.py we wrote earlier
            json.dump(data, f, ensure_ascii=False, indent=4, default=str)
        print(f"✓ {filename} saved")

    print("\nData extraction and splitting complete!")

if __name__ == "__main__":
    main()
