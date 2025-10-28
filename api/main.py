from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from typing import List, Optional

app = FastAPI(title="Meeting Summary API", version="1.0")

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:admin123@mongodb:27017/")
MONGO_DB = os.getenv("MONGO_DB", "meeting_summaries")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
summaries_collection = db["summaries"]

# Helper function to convert ObjectId to string
def summary_helper(summary) -> dict:
    return {
        "id": str(summary["_id"]),
        "title": summary["title"],
        "content": summary["content"],
        "summary": summary["summary"],
        "timestamp": summary.get("timestamp"),
        "created_at": summary.get("created_at")
    }

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "Meeting Summary API is running",
        "version": "1.0",
        "database": MONGO_DB,
        "endpoints": {
            "get_all": "/summaries",
            "get_one": "/summaries/{id}",
            "delete": "/summaries/{id}"
        }
    }

@app.get("/summaries")
def get_all_summaries():
    """Fetch all summaries from database"""
    try:
        summaries = []
        for summary in summaries_collection.find().sort("created_at", -1):
            summaries.append(summary_helper(summary))
        
        return {
            "total": len(summaries),
            "summaries": summaries
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summaries/{summary_id}")
def get_summary_by_id(summary_id: str):
    """Fetch a specific summary by ID"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(summary_id):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        
        summary = summaries_collection.find_one({"_id": ObjectId(summary_id)})
        
        if summary:
            return summary_helper(summary)
        else:
            raise HTTPException(status_code=404, detail="Summary not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/summaries/{summary_id}")
def delete_summary(summary_id: str):
    """Delete a specific summary by ID"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(summary_id):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        
        result = summaries_collection.delete_one({"_id": ObjectId(summary_id)})
        
        if result.deleted_count == 1:
            return {
                "message": "Summary deleted successfully",
                "id": summary_id
            }
        else:
            raise HTTPException(status_code=404, detail="Summary not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
def get_stats():
    """Get database statistics"""
    try:
        total = summaries_collection.count_documents({})
        return {
            "total_summaries": total,
            "database": MONGO_DB,
            "collection": "summaries"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
