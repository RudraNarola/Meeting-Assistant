from kafka import KafkaConsumer
import json
import os
import sys
import time
from datetime import datetime
from pymongo import MongoClient

# Add parent directory to path to import summarizer
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from summarizer.generate_summary import summarize_file

TOPIC = os.getenv("KAFKA_TOPIC", "transcripts")
BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:admin123@localhost:27017/")
MONGO_DB = os.getenv("MONGO_DB", "meeting_summaries")

# Initialize MongoDB connection
print(f"🔌 Connecting to MongoDB at {MONGO_URI}")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client[MONGO_DB]
summaries_collection = db["summaries"]
print(f"✅ Connected to MongoDB database: {MONGO_DB}\n")

def consume_transcripts():
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=[BROKER],
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        group_id="summary-group"
    )

    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)

    print("🟣 Kafka Consumer started. Waiting for messages...\n")

    for msg in consumer:
        transcript = msg.value
        title = transcript.get("title", "Untitled")
        content = transcript.get("content", "")

        # Save transcript to file before summarizing
        file_name = f"{title.replace(' ', '_')}_{int(time.time())}.txt"
        file_path = os.path.join(data_dir, file_name)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(title + "\n" + content)

        print(f"\n📩 Received new transcript: {title}")
        
        # Generate summary
        summary_data = summarize_file(file_path)
        
        if summary_data:
            # Store in MongoDB
            document = {
                "title": summary_data["title"],
                "content": summary_data["content"],
                "summary": summary_data["summary"],
                "timestamp": summary_data["timestamp"],
                "created_at": datetime.now()
            }
            
            result = summaries_collection.insert_one(document)
            print(f"✅ Summary saved to MongoDB with ID: {result.inserted_id}")
            print(f"📊 Database: {MONGO_DB}, Collection: summaries")
            
            # Delete the transcript file after successful processing
            try:
                os.remove(file_path)
                print(f"🗑️ Cleaned up transcript file: {file_name}")
            except Exception as e:
                print(f"⚠️ Warning: Could not delete file {file_name}: {e}")
            
            print("=" * 60 + "\n")
        else:
            print(f"⚠️ Failed to generate summary for: {title}\n")
            # Optionally delete the file even if summary failed
            try:
                os.remove(file_path)
                print(f"🗑️ Cleaned up failed transcript file: {file_name}\n")
            except Exception as e:
                print(f"⚠️ Warning: Could not delete file {file_name}: {e}\n")

if __name__ == "__main__":
    consume_transcripts()
