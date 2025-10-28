package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Summary represents a meeting summary document in MongoDB
type Summary struct {
	ID              string    `bson:"_id" json:"id"`
	MeetingID       string    `bson:"meeting_id" json:"meeting_id"`
	TranscriptionID string    `bson:"transcription_id" json:"transcription_id"`
	Title           string    `bson:"title" json:"title"`
	Platform        string    `bson:"platform" json:"platform"`
	FullText        string    `bson:"full_text" json:"full_text"`
	SummaryText     string    `bson:"summary_text" json:"summary_text"`
	KeyPoints       []string  `bson:"key_points" json:"key_points"`
	Duration        float64   `bson:"duration" json:"duration"`
	SpeakersCount   int       `bson:"speakers_count" json:"speakers_count"`
	SegmentsCount   int       `bson:"segments_count" json:"segments_count"`
	CreatedAt       time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt       time.Time `bson:"updated_at" json:"updated_at"`
}

// SummaryRepository handles MongoDB operations for summaries
type SummaryRepository struct {
	collection *mongo.Collection
}

// NewSummaryRepository creates a new summary repository
func NewSummaryRepository(client *mongo.Client, database, collection string) *SummaryRepository {
	coll := client.Database(database).Collection(collection)
	return &SummaryRepository{collection: coll}
}

// Create inserts a new summary
func (r *SummaryRepository) Create(ctx context.Context, summary *Summary) error {
	summary.ID = uuid.New().String()
	summary.CreatedAt = time.Now()
	summary.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, summary)
	if err != nil {
		return fmt.Errorf("failed to insert summary: %w", err)
	}

	return nil
}

// GetAll retrieves all summaries
func (r *SummaryRepository) GetAll(ctx context.Context) ([]Summary, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find summaries: %w", err)
	}
	defer cursor.Close(ctx)

	var summaries []Summary
	if err := cursor.All(ctx, &summaries); err != nil {
		return nil, fmt.Errorf("failed to decode summaries: %w", err)
	}

	return summaries, nil
}

// GetByID retrieves a summary by ID
func (r *SummaryRepository) GetByID(ctx context.Context, id string) (*Summary, error) {
	var summary Summary
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&summary)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("summary not found")
		}
		return nil, fmt.Errorf("failed to find summary: %w", err)
	}

	return &summary, nil
}

// GetByMeetingID retrieves a summary by meeting ID
func (r *SummaryRepository) GetByMeetingID(ctx context.Context, meetingID string) (*Summary, error) {
	var summary Summary
	err := r.collection.FindOne(ctx, bson.M{"meeting_id": meetingID}).Decode(&summary)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("summary not found for meeting")
		}
		return nil, fmt.Errorf("failed to find summary: %w", err)
	}

	return &summary, nil
}

// Delete removes a summary by ID
func (r *SummaryRepository) Delete(ctx context.Context, id string) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete summary: %w", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("summary not found")
	}

	return nil
}

// Update updates a summary
func (r *SummaryRepository) Update(ctx context.Context, summary *Summary) error {
	summary.UpdatedAt = time.Now()

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": summary.ID},
		bson.M{"$set": summary},
	)
	if err != nil {
		return fmt.Errorf("failed to update summary: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("summary not found")
	}

	return nil
}
