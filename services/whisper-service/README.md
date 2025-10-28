# Whisper Transcription Service

This service provides real audio transcription using OpenAI's Whisper model.

## Features

- 🎙️ **Real Audio Transcription**: Uses OpenAI's Whisper for accurate speech-to-text
- 🌍 **Multi-language Support**: Supports 90+ languages
- ⚡ **Multiple Model Sizes**: Choose between speed and accuracy
- 📊 **Segment-level Timestamps**: Get precise timing for each phrase
- 🔒 **Runs Locally**: No API keys needed, completely offline

## Model Sizes

| Model  | Size  | RAM Usage | Speed     | Use Case                  |
| ------ | ----- | --------- | --------- | ------------------------- |
| tiny   | 39M   | ~1 GB     | Fast      | Quick demos, testing      |
| base   | 74M   | ~1 GB     | Fast      | **Default, good balance** |
| small  | 244M  | ~2 GB     | Medium    | Better accuracy           |
| medium | 769M  | ~5 GB     | Slow      | High accuracy             |
| large  | 1550M | ~10 GB    | Very Slow | Best accuracy             |

## API Endpoints

### Health Check

```bash
GET /health
```

### Transcribe Audio

```bash
POST /transcribe
Content-Type: multipart/form-data

Parameters:
- file: audio file (required)
- language: language code like 'en', 'es' (optional)
- task: 'transcribe' or 'translate' (optional, default: transcribe)
```

Response:

```json
{
  "text": "Full transcription text",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Hello everyone",
      "confidence": 0.95
    }
  ],
  "language": "en"
}
```

### List Models

```bash
GET /models
```

## Environment Variables

- `PORT`: Service port (default: 8084)
- `WHISPER_MODEL`: Model size to use (default: base)

## Supported Audio Formats

- MP3
- WAV
- M4A
- FLAC
- OGG
- Any format supported by FFmpeg

## Language Support

Whisper supports 90+ languages including:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)
- And many more...

## Performance Tips

1. **Use GPU if available**: Whisper runs much faster on GPU
2. **Choose appropriate model**: Start with 'base', upgrade if needed
3. **Consider audio quality**: Better quality = better transcription
4. **Keep files reasonable**: Very long files may timeout (adjust client timeout)

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

## Docker Deployment

```bash
# Build image
docker build -t whisper-service .

# Run container
docker run -p 8084:8084 -e WHISPER_MODEL=base whisper-service
```

## Testing

```bash
# Test transcription
curl -X POST http://localhost:8084/transcribe \
  -F "file=@test.mp3" \
  -F "language=en"
```
