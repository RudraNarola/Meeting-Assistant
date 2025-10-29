#!/bin/bash

# Script to manually download Whisper model and copy to container

set -e

echo "=== Whisper Model Download & Install Script ==="
echo ""

# Create cache directory
CACHE_DIR="$HOME/.cache/whisper"
mkdir -p "$CACHE_DIR"

# Model URL
TINY_URL="https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt"

# Download tiny model
echo "1. Downloading Whisper tiny model (~72MB)..."
if [ -f "$CACHE_DIR/tiny.pt" ]; then
    echo "   ✓ tiny.pt already exists in cache"
else
    curl -L --progress-bar "$TINY_URL" -o "$CACHE_DIR/tiny.pt"
    echo "   ✓ tiny.pt downloaded"
fi

# Verify file size
TINY_SIZE=$(stat -f%z "$CACHE_DIR/tiny.pt" 2>/dev/null || echo "0")
if [ "$TINY_SIZE" -gt 70000000 ]; then
    echo "   File size: $((TINY_SIZE / 1024 / 1024))MB - OK"
else
    echo "   ⚠ File seems incomplete, removing..."
    rm -f "$CACHE_DIR/tiny.pt"
    echo "   Downloading again..."
    curl -L --progress-bar "$TINY_URL" -o "$CACHE_DIR/tiny.pt"
fi

# Copy to Docker container
echo ""
echo "2. Copying model to Whisper container..."
docker exec transcript-whisper-service mkdir -p /root/.cache/whisper
docker cp "$CACHE_DIR/tiny.pt" transcript-whisper-service:/root/.cache/whisper/tiny.pt
echo "   ✓ Model copied to container"

# Verify in container
echo ""
echo "3. Verifying model in container..."
docker exec transcript-whisper-service ls -lh /root/.cache/whisper/tiny.pt
echo "   ✓ Model verified"

# Restart Whisper service
echo ""
echo "4. Restarting Whisper service..."
docker restart transcript-whisper-service
sleep 5
echo "   ✓ Service restarted"

# Test health
echo ""
echo "5. Testing Whisper service..."
curl -s http://localhost:8084/health | jq .
echo ""
echo "✅ Whisper model installed successfully!"
