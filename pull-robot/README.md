# Pull Robot

A standalone service that monitors the main application's database for new missions and automatically forwards their data to the ATM dashboard API.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure your environment:
```bash
# The .env file is already configured for your Supabase project
# The ATM API token is automatically fetched from Supabase
```

3. Build and run:
```bash
npm run build
npm start
```

## Configuration

The pull robot is pre-configured to:
- Connect to your Supabase database
- Fetch the ATM API token securely from Supabase
- Poll for new missions every 5 minutes
- Send data to the ATM API at https://api.atm.ovh/api/v3.0/measurements

## Docker

```bash
npm run docker:up
```

## Health Check

Visit http://localhost:3000/health to check the robot's status.

## Metrics

Visit http://localhost:3000/metrics to see processing statistics.