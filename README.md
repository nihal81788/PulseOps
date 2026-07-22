# PulseOps - Uptime Monitoring Platform

A modern, high-performance Node.js & React application for uptime monitoring, alerting, and incident management.

## Tech Stack
- **Backend:** Node.js, Express, BullMQ, Redis, Socket.IO
- **Database:** TimescaleDB (PostgreSQL)
- **Frontend:** React, Vite, React Router, ECharts (for visualizations)

## Architecture Overview

```text
Browser ↔ React Frontend
   ↑           ↓
   │    Express API  ↔  TimescaleDB (Storage & Analytics)
Socket.IO      ↓
(Push)       BullMQ (Redis)
   │           ↓
   └─ ← Ping Worker (got HTTP)
```
- **React Frontend**: Communicates with the API and subscribes to real-time events via Socket.IO.
- **Express API**: Handles auth, routing, and serves historical data from TimescaleDB.
- **BullMQ**: Manages ping jobs and retries using Redis as a message broker.
- **Ping Worker**: Fetches URLs, tracks response timings, captures SSL data, checks for content warnings, and scales dynamically.
- **TimescaleDB**: Optimizes time-series storage and hypertable queries for latency/uptime analytics.

## Features
- **Global Uptime Monitoring**: Periodic pings, detailed timing breakdowns (DNS, TCP, TLS, TTFB), SSL certificate expiration tracking, simulated regional distribution.
- **Real-Time Analytics**: Live response time charts with P50/P95 overlay, latency heatmaps, uptime percentage metrics.
- **Incident Management**: Automatic incident creation upon consecutive failures, "Snooze" functionality for suppressing active alerts, manual and automated resolutions.
- **Intelligent Alerting**: Multi-channel alerts (Email, Slack, Discord, SMS) with configurable trigger levels and cool-down periods. Built-in on-call schedules.
- **Worker Auto-Scaling & Health**: Dynamic concurrency adjustment based on queue depth, health dashboard with real-time stats and content warning checks.

## Local Setup

1. **Start dependencies (Redis & Postgres):**
   ```bash
   docker-compose up -d
   ```

2. **Run Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Run Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Environment Variables (Backend `.env`)
| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | TimescaleDB connection string | (required) |
| `REDIS_HOST` | Redis host for BullMQ | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Secret for auth tokens | (required) |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |
| `SMTP_USER` | Email provider username | (optional) |
| `SMTP_PASS` | Email provider password | (optional) |
| `TWILIO_*` | SMS credentials for alerts | (optional) |

## Live URL
[Placeholder for Live URL]

## Screenshots
*See /screenshots folder*
