#!/usr/bin/env python3
"""
Test script for Meeting Transcript Generator
Works WITHOUT any external API keys!
"""

import requests
import time
import json
from pathlib import Path

API_BASE = "http://localhost:8080/api/v1"

def check_service():
    """Check if services are running"""
    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def upload_audio(file_path, title, platform):
    """Upload audio file"""
    with open(file_path, 'rb') as f:
        files = {'audio': f}
        data = {
            'title': title,
            'platform': platform
        }
        response = requests.post(f"{API_BASE}/meetings/upload", files=files, data=data)
        return response.json()

def get_status(meeting_id):
    """Get meeting status"""
    response = requests.get(f"{API_BASE}/meetings/{meeting_id}/status")
    return response.json()

def get_transcript(meeting_id):
    """Get full transcript"""
    response = requests.get(f"{API_BASE}/meetings/{meeting_id}/transcript")
    return response.json()

def update_speaker(speaker_id, name):
    """Update speaker name"""
    data = {'name': name}
    response = requests.put(f"{API_BASE}/speakers/{speaker_id}", json=data)
    return response.json()

def wait_for_completion(meeting_id, max_wait=60):
    """Wait for processing to complete"""
    print("\n⏳ Waiting for transcription and speaker diarization...")
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        status_data = get_status(meeting_id)
        status = status_data.get('status', 'unknown')
        
        if status == 'completed':
            print(f"✓ Processing completed in {int(time.time() - start_time)} seconds")
            return True
        elif status == 'failed':
            print("✗ Processing failed!")
            return False
        
        print(".", end="", flush=True)
        time.sleep(2)
    
    print("\n✗ Timeout waiting for processing")
    return False

def main():
    print("=" * 50)
    print("Meeting Transcript Generator Test")
    print("No API Keys Required!")
    print("=" * 50)
    
    # Check if services are running
    print("\n1. Checking if services are running...")
    if not check_service():
        print("✗ Services not running!")
        print("   Start with: docker-compose up -d")
        return
    print("✓ API Gateway is running")
    
    # Create test file
    print("\n2. Creating test audio file...")
    test_file = Path("test-meeting.mp3")
    test_file.write_text("This is a test audio file")
    print(f"✓ Created {test_file}")
    
    # Upload audio
    print("\n3. Uploading audio file...")
    try:
        result = upload_audio(
            str(test_file),
            "Demo Meeting - Python Test",
            "google_meet"
        )
        meeting_id = result['data']['meeting_id']
        print(f"✓ Audio uploaded successfully")
        print(f"  Meeting ID: {meeting_id}")
    except Exception as e:
        print(f"✗ Upload failed: {e}")
        return
    
    # Wait for processing
    if not wait_for_completion(meeting_id):
        return
    
    # Get transcript
    print("\n4. Fetching transcript with speaker identification...")
    transcript = get_transcript(meeting_id)
    
    # Save to file
    output_file = Path("transcript_result.json")
    output_file.write_text(json.dumps(transcript, indent=2))
    print(f"✓ Full transcript saved to: {output_file}")
    
    # Display transcript
    print("\n5. Transcript Preview:")
    print("=" * 50)
    print(f"\nMeeting: {transcript['meeting']['title']}")
    print(f"Platform: {transcript['meeting']['platform']}")
    print(f"Duration: {transcript['duration']} seconds")
    
    print("\n=== SPEAKERS ===")
    for speaker in transcript['speakers']:
        name = speaker['name'] if speaker['name'] else speaker['label']
        print(f"  - {name} (ID: {speaker['id']})")
    
    print("\n=== TRANSCRIPT SEGMENTS ===")
    for segment in transcript['segments'][:10]:  # Show first 10 segments
        print(f"[{segment['start_time']:.1f}s] {segment['speaker_name']}: {segment['text']}")
    
    if len(transcript['segments']) > 10:
        print(f"\n... and {len(transcript['segments']) - 10} more segments")
    
    print("\n" + "=" * 50)
    
    # Show how to update speaker names
    print("\n6. Update speaker names:")
    for i, speaker in enumerate(transcript['speakers'], 1):
        print(f"\nSpeaker {i} (ID: {speaker['id']}):")
        print(f"  Current: {speaker['label']}")
        print(f"  Update with:")
        print(f'    update_speaker("{speaker["id"]}", "John Doe")')
    
    print("\n✓ Test completed successfully!")
    print(f"\nFiles created:")
    print(f"  - {test_file} (test audio file)")
    print(f"  - {output_file} (full transcript)")
    print(f"\nCleanup: rm {test_file} {output_file}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
