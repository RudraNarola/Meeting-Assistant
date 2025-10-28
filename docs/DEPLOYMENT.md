# Deployment Guide

This guide covers deploying the Meeting Transcript Generator to production.

## Prerequisites

- Docker and Docker Compose
- Cloud provider account (AWS, GCP, or Azure)
- Domain name (optional)
- SSL certificates (for HTTPS)

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.example .env.production
```

### 2. Update Production Values

```env
# API Gateway
PORT=8080
AUDIO_SERVICE_URL=http://audio-service:8081
TRANSCRIPTION_SERVICE_URL=http://transcription-service:8082
DIARIZATION_SERVICE_URL=http://diarization-service:8083
REDIS_URL=redis:6379

# Database (use managed service in production)
DB_HOST=your-postgres-host.rds.amazonaws.com
DB_PORT=5432
DB_USER=transcript_prod_user
DB_PASSWORD=strong_secure_password_here
DB_NAME=transcript_production

# RabbitMQ (use managed service in production)
RABBITMQ_URL=amqp://user:password@your-rabbitmq-host:5672/

# Storage (use cloud storage)
STORAGE_PATH=/app/storage

# Speech-to-Text API Keys
GOOGLE_CLOUD_API_KEY=your-actual-google-api-key
AZURE_SPEECH_KEY=your-actual-azure-key
AZURE_SPEECH_REGION=your-azure-region
```

## Deployment Options

### Option 1: Docker Compose (Simple)

Best for small deployments or development servers.

```bash
# On your server
git clone <repository>
cd MAP_transcipt_generate

# Copy production environment
cp .env.production .env

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes (Recommended for Production)

Create Kubernetes manifests:

#### `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: transcript-generator
```

#### `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: transcript-config
  namespace: transcript-generator
data:
  DB_HOST: postgres-service
  DB_PORT: "5432"
  DB_NAME: transcript_db
  RABBITMQ_URL: amqp://admin:admin123@rabbitmq-service:5672/
  REDIS_URL: redis-service:6379
```

#### `k8s/secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: transcript-secrets
  namespace: transcript-generator
type: Opaque
stringData:
  DB_USER: transcript_user
  DB_PASSWORD: your-secure-password
  GOOGLE_CLOUD_API_KEY: your-api-key
  AZURE_SPEECH_KEY: your-azure-key
```

#### `k8s/api-gateway-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: transcript-generator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: your-registry/transcript-api-gateway:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: transcript-config
        - secretRef:
            name: transcript-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: transcript-generator
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
```

Create similar deployments for other services.

#### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create config and secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy services
kubectl apply -f k8s/

# Check status
kubectl get pods -n transcript-generator
```

### Option 3: AWS ECS

1. **Build and Push Images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build images
docker build -f services/api-gateway/Dockerfile -t api-gateway .
docker build -f services/audio-service/Dockerfile -t audio-service .
docker build -f services/transcription-service/Dockerfile -t transcription-service .
docker build -f services/diarization-service/Dockerfile -t diarization-service .

# Tag and push
docker tag api-gateway:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/api-gateway:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/api-gateway:latest
```

2. **Create ECS Task Definitions**

3. **Create ECS Services**

4. **Configure Load Balancer**

## Database Setup

### AWS RDS (PostgreSQL)

1. Create RDS PostgreSQL instance
2. Configure security groups
3. Run initialization script:

```bash
psql -h your-rds-endpoint.amazonaws.com -U admin -d transcript_db -f scripts/init-db.sql
```

### Google Cloud SQL

1. Create Cloud SQL PostgreSQL instance
2. Configure Cloud SQL Proxy
3. Run initialization script

## Message Queue Setup

### AWS SQS Alternative

If using SQS instead of RabbitMQ, update code to use SQS SDK:

```go
import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/service/sqs"
)

// Create SQS client
sess := session.Must(session.NewSession())
sqsClient := sqs.New(sess)

// Send message
sqsClient.SendMessage(&sqs.SendMessageInput{
    QueueUrl:    aws.String(queueURL),
    MessageBody: aws.String(messageBody),
})
```

### CloudAMQP (Managed RabbitMQ)

Use managed RabbitMQ service and update `RABBITMQ_URL` in environment.

## Storage Setup

### AWS S3

Update audio service to use S3:

```go
import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/s3/s3manager"
)

// Upload to S3
uploader := s3manager.NewUploader(session.Must(session.NewSession()))
result, err := uploader.Upload(&s3manager.UploadInput{
    Bucket: aws.String("your-bucket"),
    Key:    aws.String(filename),
    Body:   file,
})
```

### Google Cloud Storage

```go
import (
    "cloud.google.com/go/storage"
)

// Upload to GCS
ctx := context.Background()
client, err := storage.NewClient(ctx)
bucket := client.Bucket("your-bucket")
object := bucket.Object(filename)
w := object.NewWriter(ctx)
io.Copy(w, file)
w.Close()
```

## SSL/TLS Setup

### Using Let's Encrypt with Nginx

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://api-gateway:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

### Prometheus + Grafana

Add metrics endpoints to services:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// In main.go
http.Handle("/metrics", promhttp.Handler())
```

### CloudWatch (AWS)

Install CloudWatch agent and configure log groups.

## Backup Strategy

### Database Backups

```bash
# Automated daily backup
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > /backups/transcript_$(date +\%Y\%m\%d).sql.gz
```

### Storage Backups

- Enable versioning on S3/GCS buckets
- Configure lifecycle policies

## Scaling

### Horizontal Scaling

Increase replica count:

```bash
# Kubernetes
kubectl scale deployment api-gateway --replicas=5 -n transcript-generator

# Docker Compose
docker-compose up -d --scale api-gateway=3
```

### Auto-scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: transcript-generator
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Implement API authentication
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable CORS properly
- [ ] Implement rate limiting
- [ ] Regular backups
- [ ] Monitor for security vulnerabilities

## Health Checks

Implement comprehensive health checks:

```go
func healthCheck(w http.ResponseWriter, r *http.Request) {
    // Check database
    if err := db.Ping(); err != nil {
        http.Error(w, "Database unhealthy", http.StatusServiceUnavailable)
        return
    }

    // Check message queue
    if err := mq.Ping(); err != nil {
        http.Error(w, "Queue unhealthy", http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
        "timestamp": time.Now().Format(time.RFC3339),
    })
}
```

## Troubleshooting

### Common Issues

1. **Services can't connect to database**

   - Check security groups/firewall
   - Verify credentials
   - Check connection string

2. **Message queue connection fails**

   - Verify RabbitMQ is running
   - Check network connectivity
   - Verify credentials

3. **High memory usage**
   - Implement file streaming for large uploads
   - Configure proper garbage collection
   - Add memory limits to containers

## Production Checklist

- [ ] Environment variables configured
- [ ] Database initialized and backed up
- [ ] SSL certificates installed
- [ ] Monitoring set up
- [ ] Logging configured
- [ ] Backups automated
- [ ] Health checks implemented
- [ ] Load balancer configured
- [ ] Auto-scaling enabled
- [ ] Documentation updated
- [ ] Disaster recovery plan created
- [ ] Security audit completed
