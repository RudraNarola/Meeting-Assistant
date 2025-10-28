from kafka import KafkaProducer
import time
import json
import os

TOPIC = os.getenv("KAFKA_TOPIC", "transcripts")
BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")

def produce_transcripts():
    producer = KafkaProducer(
        bootstrap_servers=[BROKER],
        value_serializer=lambda v: json.dumps(v).encode("utf-8")
    )

    print("🟢 Kafka Producer started. Sending transcripts...")

    transcripts = [
        {
            "title": "Team Sync - Product Updates",
            "content": "We discussed the new feature launch timeline and fixed API performance issues. The development team reported progress on the authentication module and identified several performance bottlenecks in the database queries."
        },
        {
            "title": "Client Meeting - ABC Corp",
            "content": "The client requested a dashboard redesign and better metrics visibility. They emphasized the need for real-time data updates and improved user experience. We agreed on a two-week sprint for the initial prototype."
        },
        {
            "title": "Sprint Planning - Q4 2025",
            "content": "The team planned the upcoming sprint focusing on mobile app optimization and backend scalability improvements. We allocated resources for code refactoring and implementing automated testing frameworks."
        },
        {
            "title": "Technical Review - Architecture",
            "content": "Discussed microservices architecture migration strategy. The team evaluated different cloud platforms and decided to proceed with a gradual migration approach to minimize downtime and risks."
        },
    ]

    # Continuously produce transcripts
    counter = 0
    while True:
        for transcript in transcripts:
            enhanced_transcript = transcript.copy()
            enhanced_transcript["title"] = f"{transcript['title']} - Session {counter}"
            
            producer.send(TOPIC, enhanced_transcript)
            print(f"📤 Sent: {enhanced_transcript['title']}")
            time.sleep(5)  # Send a new transcript every 5 seconds
        
        counter += 1
        time.sleep(2)  # Small delay between cycles

if __name__ == "__main__":
    produce_transcripts()
