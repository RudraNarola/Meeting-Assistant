package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

// ServiceURLs holds the URLs for all microservices
type ServiceURLs struct {
	AudioService         string
	TranscriptionService string
	DiarizationService   string
}

// ServiceProxy handles proxying requests to microservices
type ServiceProxy struct {
	urls        ServiceURLs
	httpClient  *http.Client
	redisClient *redis.Client
}

// NewServiceProxy creates a new service proxy
func NewServiceProxy(urls ServiceURLs, redisClient *redis.Client) *ServiceProxy {
	return &ServiceProxy{
		urls: urls,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		redisClient: redisClient,
	}
}

// ProxyRequest forwards a request to a microservice
func (sp *ServiceProxy) ProxyRequest(serviceName, path, method string, body io.Reader, headers map[string]string) (*http.Response, error) {
	var serviceURL string
	switch serviceName {
	case "audio":
		serviceURL = sp.urls.AudioService
	case "transcription":
		serviceURL = sp.urls.TranscriptionService
	case "diarization":
		serviceURL = sp.urls.DiarizationService
	default:
		return nil, fmt.Errorf("unknown service: %s", serviceName)
	}

	url := fmt.Sprintf("%s%s", serviceURL, path)
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Copy headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// Make request
	resp, err := sp.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}

	return resp, nil
}

// ProxyMultipartRequest forwards a multipart request
func (sp *ServiceProxy) ProxyMultipartRequest(serviceName, path string, r *http.Request) (*http.Response, error) {
	var serviceURL string
	switch serviceName {
	case "audio":
		serviceURL = sp.urls.AudioService
	case "transcription":
		serviceURL = sp.urls.TranscriptionService
	case "diarization":
		serviceURL = sp.urls.DiarizationService
	default:
		return nil, fmt.Errorf("unknown service: %s", serviceName)
	}

	url := fmt.Sprintf("%s%s", serviceURL, path)
	
	// Create new request with the same body
	req, err := http.NewRequest(r.Method, url, r.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Copy important headers
	req.Header.Set("Content-Type", r.Header.Get("Content-Type"))
	
	// Make request with longer timeout for file uploads
	client := &http.Client{
		Timeout: 5 * time.Minute,
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}

	return resp, nil
}

// GetWithCache retrieves data with caching
func (sp *ServiceProxy) GetWithCache(ctx context.Context, cacheKey, serviceName, path string, ttl time.Duration) ([]byte, error) {
	// Try to get from cache
	if sp.redisClient != nil {
		cached, err := sp.redisClient.Get(ctx, cacheKey).Bytes()
		if err == nil {
			return cached, nil
		}
	}

	// If not in cache, fetch from service
	resp, err := sp.ProxyRequest(serviceName, path, http.MethodGet, nil, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return data, fmt.Errorf("service returned status %d", resp.StatusCode)
	}

	// Store in cache
	if sp.redisClient != nil {
		sp.redisClient.Set(ctx, cacheKey, data, ttl)
	}

	return data, nil
}

// InvalidateCache removes a key from cache
func (sp *ServiceProxy) InvalidateCache(ctx context.Context, pattern string) error {
	if sp.redisClient == nil {
		return nil
	}

	iter := sp.redisClient.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		sp.redisClient.Del(ctx, iter.Val())
	}
	return iter.Err()
}

// PostJSON sends a POST request with JSON body
func (sp *ServiceProxy) PostJSON(serviceName, path string, data interface{}) (*http.Response, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	headers := map[string]string{
		"Content-Type": "application/json",
	}

	return sp.ProxyRequest(serviceName, path, http.MethodPost, bytes.NewReader(jsonData), headers)
}

// PutJSON sends a PUT request with JSON body
func (sp *ServiceProxy) PutJSON(serviceName, path string, data interface{}) (*http.Response, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	headers := map[string]string{
		"Content-Type": "application/json",
	}

	return sp.ProxyRequest(serviceName, path, http.MethodPut, bytes.NewReader(jsonData), headers)
}
