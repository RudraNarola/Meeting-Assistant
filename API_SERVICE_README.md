# 📋 Meeting Summary API Service

A containerized REST API service for managing meeting summaries stored in MongoDB.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Port 8000 and 27017 available

### Start the Service

**Windows PowerShell:**
```powershell
.\start-api.ps1
```

**Or manually:**
```powershell
docker-compose -f docker-compose.api.yml up -d --build
```

### Stop the Service
```powershell
.\stop-api.ps1
```

**Or manually:**
```powershell
docker-compose -f docker-compose.api.yml down
```

---

## 📮 API Endpoints

### Base URL
```
http://localhost:8000
```

### 1️⃣ Get All Summaries
**GET** `/summaries`

**Response:**
```json
{
  "total": 2,
  "summaries": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Team Meeting",
      "content": "Full transcript...",
      "summary": "AI generated summary...",
      "timestamp": "2025-10-29T00:00:00",
      "created_at": "2025-10-29T00:00:00"
    }
  ]
}
```

### 2️⃣ Get Specific Summary
**GET** `/summaries/{id}`

**Example:**
```
GET http://localhost:8000/summaries/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Team Meeting",
  "content": "Full transcript text...",
  "summary": "AI generated summary...",
  "timestamp": "2025-10-29T00:00:00",
  "created_at": "2025-10-29T00:00:00"
}
```

### 3️⃣ Delete Summary
**DELETE** `/summaries/{id}`

**Example:**
```
DELETE http://localhost:8000/summaries/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "message": "Summary deleted successfully",
  "id": "507f1f77bcf86cd799439011"
}
```

---

## 🌐 Interactive API Documentation

Open in your browser:
```
http://localhost:8000/docs
```

This provides a Swagger UI where you can:
- View all endpoints
- Test API calls directly
- See request/response schemas

---

## 🧪 Testing with Postman

### Import Collection

Create a new Postman collection with these requests:

**1. Get All Summaries**
- Method: `GET`
- URL: `http://localhost:8000/summaries`

**2. Get Specific Summary**
- Method: `GET`
- URL: `http://localhost:8000/summaries/{{summary_id}}`

**3. Delete Summary**
- Method: `DELETE`
- URL: `http://localhost:8000/summaries/{{summary_id}}`

### Testing Flow
1. Start the service
2. GET `/summaries` to see all
3. Copy an `id` from the response
4. GET `/summaries/{id}` to view specific
5. DELETE `/summaries/{id}` to remove
6. GET `/summaries` again to confirm deletion

---

## 🗄️ MongoDB Configuration

**Connection Details:**
- Host: `localhost`
- Port: `27017`
- Username: `admin`
- Password: `admin123`
- Database: `meeting_summaries`
- Collection: `summaries`

**Connection String:**
```
mongodb://admin:admin123@localhost:27017/
```

---

## 📊 Service Architecture

```
┌─────────────────┐
│   API Service   │ (Port 8000)
│   FastAPI       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    MongoDB      │ (Port 27017)
│   Database      │
└─────────────────┘
```

**Services:**
- **API**: FastAPI service exposing REST endpoints
- **MongoDB**: Database for storing summaries

**Data Persistence:**
- MongoDB data is stored in Docker volume `mongodb_data`
- Data survives service restarts
- Use `docker-compose down -v` to remove data

---

## 🛠️ Common Commands

### Check Service Status
```powershell
docker-compose -f docker-compose.api.yml ps
```

### View API Logs
```powershell
docker-compose -f docker-compose.api.yml logs -f api
```

### View MongoDB Logs
```powershell
docker-compose -f docker-compose.api.yml logs -f mongodb
```

### Restart Services
```powershell
docker-compose -f docker-compose.api.yml restart
```

### Rebuild Services
```powershell
docker-compose -f docker-compose.api.yml up -d --build
```

### Remove All Data
```powershell
docker-compose -f docker-compose.api.yml down -v
```

---

## 🐛 Troubleshooting

### Port Already in Use
If port 8000 or 27017 is in use:
```powershell
# Check what's using the port
netstat -ano | findstr :8000
netstat -ano | findstr :27017

# Stop other services using these ports
```

### API Not Responding
1. Check if containers are running:
   ```powershell
   docker-compose -f docker-compose.api.yml ps
   ```

2. Check API logs:
   ```powershell
   docker-compose -f docker-compose.api.yml logs api
   ```

3. Restart the service:
   ```powershell
   docker-compose -f docker-compose.api.yml restart
   ```

### MongoDB Connection Issues
1. Check MongoDB is healthy:
   ```powershell
   docker-compose -f docker-compose.api.yml ps
   ```

2. Check MongoDB logs:
   ```powershell
   docker-compose -f docker-compose.api.yml logs mongodb
   ```

---

## 📁 Project Structure

```
kafka_summary_pipeline/
├── api/
│   └── main.py                    # FastAPI application
├── docker-compose.api.yml         # Docker composition for API service
├── Dockerfile.api                 # Dockerfile for API
├── requirements.txt               # Python dependencies
├── .dockerignore                  # Docker ignore file
├── start-api.ps1                  # Start script
├── stop-api.ps1                   # Stop script
└── API_SERVICE_README.md          # This file
```

---

## 🔒 Security Notes

**For Production:**
- Change MongoDB credentials
- Use environment variables for secrets
- Enable MongoDB authentication
- Use HTTPS/SSL
- Add rate limiting
- Implement authentication/authorization

**Current Setup:**
- Development/testing only
- Default credentials (change in production)
- No authentication required

---

## 📝 Additional Endpoints

### Health Check
**GET** `/`

```json
{
  "message": "Meeting Summary API is running",
  "version": "1.0",
  "database": "meeting_summaries"
}
```

### Statistics
**GET** `/stats`

```json
{
  "total_summaries": 5,
  "database": "meeting_summaries",
  "collection": "summaries"
}
```

---

## 🎯 Use Cases

1. **View all summaries**: GET `/summaries`
2. **Search specific summary**: GET `/summaries/{id}`
3. **Remove old summaries**: DELETE `/summaries/{id}`
4. **Monitor database**: GET `/stats`
5. **Health check**: GET `/`

---

## 💡 Tips

- Use `/docs` for interactive testing
- Data persists across restarts
- Copy IDs from GET responses for specific operations
- Use Postman for automated testing
- Check logs for debugging

---

## 🚀 Ready to Use!

Your containerized API service is ready. Just run:
```powershell
.\start-api.ps1
```

Then open: `http://localhost:8000/docs`

Happy testing! 🎉
