import os
import torch
import matplotlib.pyplot as plt
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from dataset import MurilSentimentDataset, LABEL_MAP

def plot_training_loss(trainer, save_path="training_loss.png"):
    """
    Extracts training loss from trainer state and plots it.
    """
    log_history = trainer.state.log_history
    steps = []
    loss = []
    
    for log in log_history:
        if "loss" in log and "step" in log:
            steps.append(log["step"])
            loss.append(log["loss"])
            
    if loss:
        plt.figure(figsize=(8, 6))
        plt.plot(steps, loss, label="Training Loss", color="blue", linewidth=2)
        plt.xlabel("Training Steps")
        plt.ylabel("Loss")
        plt.title("Training Loss Curve")
        plt.legend()
        plt.grid(True)
        plt.savefig(save_path, dpi=300, bbox_inches="tight")
        plt.close()
        print(f"Training loss plot successfully saved to {save_path}")
    else:
        print("No loss data found to plot.")

def main():
    model_name = "google/muril-base-cased"
    train_file = "train.json"
    output_dir = "saved_models/muril_sentiment/"
    
    if not os.path.exists(train_file):
        print(f"Error: {train_file} not found. Please ensure the dataset is in the current directory.")
        return

    print(f"Loading Tokenizer: {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    print(f"Loading Dataset from {train_file}...")
    train_dataset = MurilSentimentDataset(train_file, tokenizer, max_length=128)
    
    print(f"Loading Model: {model_name}...")
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name, 
        num_labels=len(LABEL_MAP),
        id2label={v: k for k, v in LABEL_MAP.items()},
        label2id=LABEL_MAP
    )
    
    # Define training arguments as per requirements
    training_args = TrainingArguments(
        output_dir="./muril_checkpoints",
        num_train_epochs=5,
        per_device_train_batch_size=16,
        learning_rate=2e-5,
        logging_dir="./logs",
        logging_steps=10,
        save_strategy="epoch",
        evaluation_strategy="no", # Separate evaluation in evaluate.py
        report_to="none" # Disable default wandb/tensorboard logging for simplicity
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
    )
    
    print("Starting training process...")
    trainer.train()
    
    # Create save directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Saving final model and tokenizer to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    print("Generating training loss plot...")
    plot_training_loss(trainer, save_path="training_loss.png")
    print("Training complete!")
    
if __name__ == "__main__":
    main()
