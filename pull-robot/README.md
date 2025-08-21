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

## License

MIT