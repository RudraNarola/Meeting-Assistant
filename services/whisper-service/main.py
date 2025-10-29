#!/usr/bin/env python3
"""
Whisper Transcription Service
Provides real audio transcription using OpenAI's Whisper model
"""

import os
import logging
import tempfile
from flask import Flask, request, jsonify
import whisper
import torch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variable to store the model
whisper_model = None
MODEL_SIZE = os.getenv('WHISPER_MODEL', 'base')  # tiny, base, small, medium, large

def load_whisper_model():
    """Load Whisper model on first request (lazy loading)"""
    global whisper_model
    
    # If already loaded, return
    if whisper_model is not None:
        return whisper_model
    
    logger.info(f"Loading Whisper model: {MODEL_SIZE}")
    
    # Check if CUDA is available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")
    
    try:
        whisper_model = whisper.load_model(MODEL_SIZE, device=device)
        logger.info(f"Whisper model '{MODEL_SIZE}' loaded successfully")
        return whisper_model
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'whisper-service',
        'model': MODEL_SIZE,
        'model_loaded': whisper_model is not None
    }), 200

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe audio file using Whisper
    
    Request:
        - file: audio file (multipart/form-data)
        - language: (optional) language code (e.g., 'en', 'es', 'fr')
        - task: (optional) 'transcribe' or 'translate' (default: transcribe)
    
    Response:
        {
            "text": "full transcription text",
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
    """
    temp_path = None
    
    try:
        # Lazy load model on first request
        if whisper_model is None:
            logger.info("Model not loaded yet, loading now...")
            load_whisper_model()
        
        if whisper_model is None:
            logger.error("Whisper model failed to load")
            return jsonify({'error': 'Whisper model not loaded'}), 503
        
        # Check if file is present
        if 'file' not in request.files:
            logger.error("No audio file provided in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['file']
        if audio_file.filename == '':
            logger.error("Empty filename in request")
            return jsonify({'error': 'Empty filename'}), 400
        
        # Get optional parameters
        language = request.form.get('language', None)
        task = request.form.get('task', 'transcribe')
        
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Transcribing audio file: {audio_file.filename} (saved to {temp_path})")
        logger.info(f"Language: {language}, Task: {task}")
        
        # Check if file exists and has content
        file_size = os.path.getsize(temp_path)
        logger.info(f"Audio file size: {file_size} bytes")
        
        if file_size == 0:
            raise ValueError("Audio file is empty")
        
        # Transcribe using Whisper
        logger.info("Starting Whisper transcription...")
        result = whisper_model.transcribe(
            temp_path,
            language=language,
            task=task,
            verbose=True,
            fp16=False  # Disable FP16 for CPU
        )
        logger.info("Whisper transcription completed")
        
        # Format segments with confidence scores
        segments = []
        for segment in result.get('segments', []):
            segments.append({
                'id': segment['id'],
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text'].strip(),
                'confidence': 1.0 - segment.get('no_speech_prob', 0.0)  # Convert to confidence
            })
        
        response = {
            'text': result['text'].strip(),
            'segments': segments,
            'language': result.get('language', language or 'unknown')
        }
        
        logger.info(f"Transcription completed: {len(segments)} segments, {len(result['text'])} characters")
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}", exc_info=True)
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500
        
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.info(f"Cleaned up temp file: {temp_path}")
            except Exception as e:
                logger.error(f"Failed to clean up temp file: {e}")

@app.route('/models', methods=['GET'])
def list_models():
    """List available Whisper models"""
    models = {
        'current': MODEL_SIZE,
        'available': ['tiny', 'base', 'small', 'medium', 'large'],
        'descriptions': {
            'tiny': 'Fastest, lowest accuracy (~1GB RAM)',
            'base': 'Fast, good accuracy (~1GB RAM)',
            'small': 'Balanced speed/accuracy (~2GB RAM)',
            'medium': 'High accuracy, slower (~5GB RAM)',
            'large': 'Best accuracy, slowest (~10GB RAM)'
        }
    }
    return jsonify(models), 200

def init_app():
    """Initialize the app (called by Gunicorn workers)"""
    # Don't load model on startup - use lazy loading on first request
    return app

# Don't load model when module is imported - use lazy loading on first request
# This avoids startup failures when network is unavailable

if __name__ == '__main__':
    # For local development only
    port = int(os.getenv('PORT', 8084))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
