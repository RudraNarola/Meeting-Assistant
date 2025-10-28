from kafka import KafkaProducer
import time
import json
import os

TOPIC = os.getenv("KAFKA_TOPIC", "transcripts")
BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")

def produce_transcripts_once():
    producer = KafkaProducer(
        bootstrap_servers=[BROKER],
        value_serializer=lambda v: json.dumps(v).encode("utf-8")
    )

    print("🟢 Kafka Producer started. Sending transcripts...\n")

    transcripts = [
        {
            "title": "Team Sync - Product Updates",
            "content": "We discussed the new feature launch timeline and fixed API performance issues. The development team reported progress on the authentication module and identified several performance bottlenecks in the database queries."
        },
        {
            "title": "Client Meeting - ABC Corp",
            "content": "The client requested a dashboard redesign and better metrics visibility. They emphasized the need for real-time data updates and improved user experience. We agreed on a two-week sprint for the initial prototype."
        },
    ]

    # Send each transcript once
    for transcript in transcripts:
        producer.send(TOPIC, transcript)
        print(f"📤 Sent: {transcript['title']}")
        time.sleep(1)  # Small delay between sends

    producer.flush()
    print("\n✅ All transcripts sent! Producer finished.\n")

if __name__ == "__main__":
    produce_transcripts_once()
