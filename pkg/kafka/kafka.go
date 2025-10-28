package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/segmentio/kafka-go"
)

// Producer represents a Kafka producer
type Producer struct {
	writer *kafka.Writer
}

// Consumer represents a Kafka consumer
type Consumer struct {
	reader *kafka.Reader
}

// Message represents a Kafka message
type Message struct {
	Key   string                 `json:"key"`
	Value map[string]interface{} `json:"value"`
}

// NewProducer creates a new Kafka producer
func NewProducer(brokers []string, topic string) *Producer {
	writer := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
	}

	return &Producer{writer: writer}
}

// Publish sends a message to Kafka
func (p *Producer) Publish(ctx context.Context, key string, value interface{}) error {
	valueBytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	msg := kafka.Message{
		Key:   []byte(key),
		Value: valueBytes,
	}

	err = p.writer.WriteMessages(ctx, msg)
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	log.Printf("Published message to Kafka topic %s: key=%s", p.writer.Topic, key)
	return nil
}

// Close closes the producer
func (p *Producer) Close() error {
	return p.writer.Close()
}

// NewConsumer creates a new Kafka consumer
func NewConsumer(brokers []string, topic, groupID string) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		Topic:    topic,
		GroupID:  groupID,
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
	})

	return &Consumer{reader: reader}
}

// Consume reads messages from Kafka
func (c *Consumer) Consume(ctx context.Context, handler func(Message) error) error {
	log.Printf("Starting Kafka consumer for topic: %s", c.reader.Config().Topic)

	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if err == context.Canceled {
				log.Println("Consumer context canceled")
				return nil
			}
			log.Printf("Error fetching message: %v", err)
			continue
		}

		log.Printf("Received message from Kafka: topic=%s, partition=%d, offset=%d",
			msg.Topic, msg.Partition, msg.Offset)

		// Parse message
		var value map[string]interface{}
		if err := json.Unmarshal(msg.Value, &value); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			c.reader.CommitMessages(ctx, msg) // Commit to avoid reprocessing bad messages
			continue
		}

		message := Message{
			Key:   string(msg.Key),
			Value: value,
		}

		// Process message
		if err := handler(message); err != nil {
			log.Printf("Error processing message: %v", err)
			// Don't commit if processing fails - will retry
			continue
		}

		// Commit message
		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			log.Printf("Failed to commit message: %v", err)
		}
	}
}

// Close closes the consumer
func (c *Consumer) Close() error {
	return c.reader.Close()
}

// ParseBrokers parses a comma-separated list of Kafka brokers
func ParseBrokers(brokersStr string) []string {
	brokers := strings.Split(brokersStr, ",")
	for i, broker := range brokers {
		brokers[i] = strings.TrimSpace(broker)
	}
	return brokers
}
