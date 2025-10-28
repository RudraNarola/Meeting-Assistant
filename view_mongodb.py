"""
View summaries stored in MongoDB
"""
from pymongo import MongoClient
from datetime import datetime
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:admin123@localhost:27017/")
MONGO_DB = os.getenv("MONGO_DB", "meeting_summaries")

def view_summaries():
    print(f"🔌 Connecting to MongoDB at {MONGO_URI}")
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    summaries_collection = db["summaries"]
    
    # Count total summaries
    total = summaries_collection.count_documents({})
    print(f"📊 Total summaries in database: {total}\n")
    
    if total == 0:
        print("⚠️ No summaries found in the database.")
        return
    
    # Fetch all summaries
    summaries = summaries_collection.find().sort("created_at", -1)
    
    for idx, summary in enumerate(summaries, 1):
        print(f"\n{'=' * 80}")
        print(f"Summary #{idx}")
        print(f"{'=' * 80}")
        print(f"📋 ID: {summary['_id']}")
        print(f"📝 Title: {summary['title']}")
        print(f"⏰ Created: {summary['created_at']}")
        print(f"\n📄 Content:")
        print(summary['content'][:200] + "..." if len(summary['content']) > 200 else summary['content'])
        print(f"\n🧠 Summary:")
        print(summary['summary'])
        print(f"\n{'=' * 80}\n")
    
    client.close()

if __name__ == "__main__":
    view_summaries()
