package queue

import (
	"encoding/json"
	"log"
	"time"

	"github.com/streadway/amqp"
)

// MessageQueue handles RabbitMQ operations
type MessageQueue struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// Message represents a queue message
type Message struct {
	Type      string                 `json:"type"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp time.Time              `json:"timestamp"`
}

// NewMessageQueue creates a new message queue connection
func NewMessageQueue(url string) (*MessageQueue, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	return &MessageQueue{
		conn:    conn,
		channel: ch,
	}, nil
}

// DeclareQueue declares a queue
func (mq *MessageQueue) DeclareQueue(queueName string) error {
	_, err := mq.channel.QueueDeclare(
		queueName,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)
	return err
}

// Publish publishes a message to a queue
func (mq *MessageQueue) Publish(queueName string, message Message) error {
	message.Timestamp = time.Now()
	body, err := json.Marshal(message)
	if err != nil {
		return err
	}

	err = mq.channel.Publish(
		"",        // exchange
		queueName, // routing key
		false,     // mandatory
		false,     // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
		},
	)
	return err
}

// Consume consumes messages from a queue
func (mq *MessageQueue) Consume(queueName string, handler func(Message) error) error {
	msgs, err := mq.channel.Consume(
		queueName,
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			var msg Message
			if err := json.Unmarshal(d.Body, &msg); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				d.Nack(false, false)
				continue
			}

			if err := handler(msg); err != nil {
				log.Printf("Error handling message: %v", err)
				d.Nack(false, true) // requeue on error
				continue
			}

			d.Ack(false)
		}
	}()

	return nil
}

// Close closes the connection
func (mq *MessageQueue) Close() {
	if mq.channel != nil {
		mq.channel.Close()
	}
	if mq.conn != nil {
		mq.conn.Close()
	}
}
