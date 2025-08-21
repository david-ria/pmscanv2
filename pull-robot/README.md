# Pull Robot

A standalone service that polls Supabase Storage for end-of-mission CSV files, streams and parses them, and POSTs measurements to an external dashboard API.

## Features

- 🔄 **Automated Polling**: Continuously monitors Supabase Storage for new CSV files
- 📊 **Streaming Processing**: Memory-efficient CSV parsing for large files
- 🚀 **Rate Limited API**: Respects external API rate limits with bottleneck
- 🔄 **Retry Logic**: Automatic retries with exponential backoff
- 🎯 **Idempotency**: Prevents duplicate processing of the same data
- 💀 **Dead Letter Queue**: Handles failed requests gracefully
- 📈 **Health Monitoring**: Built-in health checks and metrics endpoints
- 🗄️ **Local State**: SQLite database for tracking processed files and rows

## Architecture

The robot is completely isolated from your main application and database:
- Uses read-only Supabase credentials
- Maintains its own SQLite database for state
- Does not modify existing Supabase tables
- Runs independently on your server

## Quick Start

### With Docker (Recommended)

1. Copy environment configuration:
```bash
cp .env.example .env
```

2. Edit `.env` with your actual credentials and configuration

3. Start the service:
```bash
docker-compose up -d
```

4. Check health:
```bash
curl http://localhost:3000/health
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run in development mode:
```bash
npm run dev
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key settings:
- `SUPABASE_URL` & `SUPABASE_ANON_KEY`: Read-only Supabase credentials
- `DASHBOARD_API_URL` & `DASHBOARD_API_KEY`: Target API endpoint and authentication
- `POLL_INTERVAL_MS`: How often to check for new files (default: 60 seconds)
- `MAX_REQUESTS_PER_SECOND`: Rate limit for API calls (default: 10)

### Sensor Mapping

Create `data/sensor_map.csv` with device ID to sensor ID mapping:

```csv
device_id,idSensor
device123,90100001
device456,90100002
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - Processing metrics and statistics

## Data Flow

1. **Poll Storage**: Check Supabase Storage for new CSV files
2. **Stream & Parse**: Process CSV files row by row (memory efficient)
3. **Transform**: Convert each measurement to API payload format
4. **Rate Limited POST**: Send to external API with proper rate limiting
5. **State Tracking**: Mark files and rows as processed in SQLite
6. **Error Handling**: Retry failed requests, move to dead letter queue if needed

## Payload Format

Each measurement row is transformed to:

```json
{
  "idSensor": 90100001,
  "time": "2025-07-30T12:34:45.592Z",
  "data": { 
    "pm25": { 
      "value": 10, 
      "unit": "ugm3" 
    } 
  }
}
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Metrics
```bash
curl http://localhost:3000/metrics
```

### Logs
```bash
# Docker
docker-compose logs -f pull-robot

# Local
npm run dev
```

## Production Deployment

1. Clone repository to your server
2. Configure environment variables in `.env`
3. Set up sensor mapping in `data/sensor_map.csv`
4. Deploy with Docker Compose:
```bash
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **No files being processed**: Check Supabase credentials and bucket configuration
2. **API rate limit errors**: Adjust `MAX_REQUESTS_PER_SECOND` in `.env`
3. **SQLite errors**: Ensure `./data` directory is writable
4. **CSV parsing errors**: Verify CSV format matches expected structure

### Debug Mode

Set `LOG_LEVEL=debug` in `.env` for detailed logging.

# =============================================================================
# SUPABASE BUCKET ACCESS & CREDENTIALS
# =============================================================================

## Storage Bucket Permissions

**Public Bucket (Recommended for read-only CSV exports):**
- Uses `SUPABASE_KEY` (anon key) with public read access
- No additional authentication required
- Suitable for non-sensitive CSV data exports

**Private Bucket (Requires elevated permissions):**
- **Service Role Key Preferred**: Set `SUPABASE_KEY` to your Service Role key for full access
- Anon key with RLS policies: Configure Row Level Security policies on `storage.objects`
- Custom edge function: Use Supabase edge function with service role access

## Credential Configuration

The pull robot uses the credential specified in `SUPABASE_KEY` environment variable:

```bash
# For public buckets (anon key sufficient)
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...anon-key...

# For private buckets (Service Role key preferred)
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service-role-key...
```

**Service Role Key Advantages:**
- ✅ Bypasses RLS policies for administrative access
- ✅ Full read/write access to all storage buckets
- ✅ No additional policy configuration required
- ✅ Recommended for isolated pull robot services

**Security Note:** Store Service Role keys securely and only use in trusted server environments. Never expose Service Role keys in client-side code.

# Operations Runbook

This section provides step-by-step operational procedures for managing the pull-robot in production.

## Health & Metrics

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

**Sample Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-21T13:45:23.456Z",
  "version": "1.0.0",
  "uptime": 3600000,
  "database": {
    "connected": true
  },
  "supabase": {
    "connected": true
  },
  "processing": {
    "filesProcessed": 47,
    "rowsProcessed": 18956,
    "rowsSent": 18743,
    "rowsFailed": 213,
    "deadLetterCount": 24,
    "lastPollAt": "2025-08-21T13:45:20.123Z",
    "lastProcessedFile": "uploads/device_001/2025/08/data_20250821_134520.csv"
  }
}
```

### Metrics Endpoint (Prometheus Format)

```bash
curl http://localhost:3000/metrics.txt
```

**Sample Output:**
```text
# HELP files_processed_total Total number of files processed
# TYPE files_processed_total counter
files_processed_total 47

# HELP rows_processed_total Total number of rows processed
# TYPE rows_processed_total counter
rows_processed_total 18956

# HELP rows_sent_total Total number of rows successfully sent
# TYPE rows_sent_total counter
rows_sent_total 18743

# HELP poster_requests_total Total HTTP requests made by poster
# TYPE poster_requests_total counter
poster_requests_total 18956

# HELP poster_success_total Total successful HTTP requests
# TYPE poster_success_total counter
poster_success_total 18743

# HELP poster_retryable_fail_total Total retryable failures (429, 5xx)
# TYPE poster_retryable_fail_total counter
poster_retryable_fail_total 189

# HELP poster_nonretryable_fail_total Total non-retryable failures (4xx except 429)
# TYPE poster_nonretryable_fail_total counter
poster_nonretryable_fail_total 24

# HELP rps_configured Configured requests per second limit
# TYPE rps_configured gauge
rps_configured 20

# HELP current_rps Current requests per second
# TYPE current_rps gauge
current_rps 3.45

# HELP queue_size Current rate limiter queue size
# TYPE queue_size gauge
queue_size 8
```

## Configuration Changes

### Rate Limiting Adjustments

**Change RPS and Concurrency:**
```bash
# Edit .env file
RATE_MAX_RPS=50                    # Increase from default 20
MAX_ATTEMPTS=8                     # Increase retry attempts if needed

# Restart service
docker-compose restart pull-robot
```

**Effect:** `maxConcurrentRequests` is automatically calculated as `min(RATE_MAX_RPS, 50)`.

### API Key Rotation

**Rotate Dashboard Bearer Token:**
```bash
# Edit .env file
DASHBOARD_BEARER=new_bearer_token_here

# Restart service to pick up new token
docker-compose restart pull-robot
```

### Polling Interval Changes

**Adjust Polling Frequency:**
```bash
# Edit .env file
POLL_INTERVAL_MS=120000            # Change to 2 minutes (from default 5 minutes)

# Restart service
docker-compose restart pull-robot
```

### Database and File Paths

**Change Storage Locations:**
```bash
# Edit .env file
DB_PATH=/app/data/robot-state.db          # Default location
SENSOR_MAP_PATH=/app/data/sensor_map.csv  # Default location

# For custom paths, ensure directory exists and is writable
mkdir -p /custom/path
chown 1000:1000 /custom/path

# Update docker-compose.yml volumes if changing paths
# Restart service
docker-compose restart pull-robot
```

## Adding New Metrics (No Code Changes Required)

### Modify Included Metrics

**Edit INCLUDE_METRICS:**
```bash
# Edit .env file - Add temperature and humidity
INCLUDE_METRICS=pm1,pm25,pm10,temperature,humidity

# Update units mapping
UNITS_JSON='{"pm1":"ugm3","pm25":"ugm3","pm10":"ugm3","temperature":"celsius","humidity":"percent"}'

# Restart service
docker-compose restart pull-robot
```

**Valid Metrics:** `pm1`, `pm25`, `pm10`, `temperature`, `humidity`

**Important:** Idempotency keys (`device_id|mission_id|timestamp`) remain unchanged when adding metrics.

## Dead Letter Queue (DLQ) Operations

### DLQ Table Schema

**Location:** SQLite database at `DB_PATH` (default: `/app/data/robot-state.db`)

**Table:** `dead_letter_queue`

**Columns:**
- `id` - Primary key
- `file_id` - Reference to processed_files table
- `row_index` - Row number in original CSV
- `idempotency_key` - Full idempotency key (device_id|mission_id|timestamp)
- `payload` - JSON payload that failed
- `http_status` - HTTP response code (NULL for network errors)
- `error_message` - Error description
- `attempt_count` - Number of retry attempts
- `created_at` - When added to DLQ
- `last_attempt_at` - Last retry timestamp

### List Recent DLQ Entries

```sql
-- Connect to database
sqlite3 /app/data/robot-state.db

-- List last 50 DLQ entries
SELECT 
  id, 
  idempotency_key, 
  http_status, 
  error_message, 
  attempt_count,
  created_at
FROM dead_letter_queue 
ORDER BY created_at DESC 
LIMIT 50;
```

### Replay Single DLQ Entry

**Create replay script (`replay-dlq.sh`):**
```bash
#!/bin/bash
# Usage: ./replay-dlq.sh <dlq_id>

DLQ_ID=$1
if [ -z "$DLQ_ID" ]; then
  echo "Usage: $0 <dlq_id>"
  exit 1
fi

# Extract payload from DLQ
PAYLOAD=$(sqlite3 /app/data/robot-state.db \
  "SELECT payload FROM dead_letter_queue WHERE id = $DLQ_ID;")

if [ -z "$PAYLOAD" ]; then
  echo "DLQ entry $DLQ_ID not found"
  exit 1
fi

# Get idempotency key
IDEM_KEY=$(sqlite3 /app/data/robot-state.db \
  "SELECT idempotency_key FROM dead_letter_queue WHERE id = $DLQ_ID;")

echo "Replaying DLQ entry $DLQ_ID with key: $IDEM_KEY"

# Manual POST with curl (replace with your API endpoint)
curl -X POST "$DASHBOARD_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DASHBOARD_BEARER" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d "$PAYLOAD" \
  -v

echo "Manual replay completed for DLQ entry $DLQ_ID"
```

**Guardrails:**
- Always verify payload content before replay
- Check that idempotency key is still valid
- Monitor for duplicate processing on target API

## Backup Operations

### Database Backup

**Location:** `./data/robot-state.db` (mounted from host)

**Simple Backup:**
```bash
# Stop service for consistent backup
docker-compose stop pull-robot

# Create backup with timestamp
cp ./data/robot-state.db ./backups/robot-state-$(date +%Y%m%d_%H%M%S).db

# Restart service
docker-compose start pull-robot
```

**Hot Backup (service running):**
```bash
# SQLite online backup
sqlite3 ./data/robot-state.db ".backup ./backups/robot-state-$(date +%Y%m%d_%H%M%S).db"
```

### Database Restore

**Restore from Backup:**
```bash
# Stop service
docker-compose stop pull-robot

# Restore backup
cp ./backups/robot-state-20250821_134520.db ./data/robot-state.db

# Restart service
docker-compose start pull-robot
```

## Logging

### View Live Logs

```bash
# Follow all logs
docker-compose logs -f pull-robot

# Filter by component
docker-compose logs -f pull-robot | grep "poster"
docker-compose logs -f pull-robot | grep "poller" 
docker-compose logs -f pull-robot | grep "ERROR"
```

### Log Levels

**Available Levels:** `debug`, `info`, `warn`, `error`

**Change Log Level:**
```bash
# Edit .env file
LOG_LEVEL=debug                    # Enable detailed debugging

# Restart service
docker-compose restart pull-robot
```

**Log Level Effects:**
- `debug` - All logs including request/response details
- `info` - Normal operation logs (default)
- `warn` - Warnings and errors only
- `error` - Errors only

## Security Notes

### Credential Management

**✅ Recommended Practices:**
- Use Supabase Service Role key for private buckets
- Store secrets in environment files, not in code repository
- Rotate `DASHBOARD_BEARER` tokens regularly
- Use read-only Supabase credentials when possible

**❌ Avoid:**
- Committing `.env` files to version control
- Using anon keys for private bucket access
- Hardcoding credentials in source code
- Sharing Service Role keys between applications

### Network Security

**Firewall Rules:**
- Restrict inbound access to health/metrics endpoints (port 3000)
- Allow outbound HTTPS to Supabase and dashboard API
- Consider VPN or private networking for production deployments

**Monitoring:**
- Monitor failed authentication attempts in logs
- Set up alerts for high error rates or DLQ growth
- Track API rate limit violations

## License

MIT