# Quick Test Commands

## Using PowerShell (Windows)

```powershell
# Start the service first
uvicorn app.main:app --reload

# In another terminal, test with Invoke-RestMethod
$body = Get-Content -Path "postman_test.json" -Raw
$response = Invoke-RestMethod -Uri "http://localhost:8000/extract" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 10
```

## Using curl (if installed)

```bash
curl -X POST http://localhost:8000/extract \
  -H "Content-Type: application/json" \
  -d @postman_test.json
```

## Using Python

```python
import requests
import json

# Read the test data
with open('postman_test.json', 'r') as f:
    test_data = json.load(f)

# Send request
response = requests.post(
    'http://localhost:8000/extract',
    json=test_data
)

# Print results
print(json.dumps(response.json(), indent=2))
```

## Health Check

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/healthz"

# curl
curl http://localhost:8000/healthz
```
