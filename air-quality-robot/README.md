# Air Quality Robot

Clean, minimal implementation that polls Supabase for mission data and posts measurements to the ATM API.

## Features

- ✅ Simple, clean codebase with minimal dependencies
- ✅ Connects to Supabase database
- ✅ Polls for unprocessed missions
- ✅ Posts measurement data to ATM API
- ✅ Proper error handling and logging
- ✅ Graceful shutdown

## Quick Start

```bash
cd air-quality-robot
npm install
npm run build
npm start
```

## Development

```bash
npm run dev  # Watch mode with tsx
```

## Configuration

Copy `.env.example` to `.env` and configure:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key  
- `DASHBOARD_ENDPOINT`: ATM API endpoint
- `DASHBOARD_BEARER`: ATM API bearer token
- `POLL_INTERVAL_MS`: Polling interval (default 5 minutes)

## Architecture

- **logger.ts**: Simple console logging
- **config.ts**: Environment-based configuration
- **supabase.ts**: Database connection and queries
- **poster.ts**: HTTP posting to ATM API
- **processor.ts**: Business logic for processing missions
- **index.ts**: Main application entry point