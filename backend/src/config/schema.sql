CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  check_interval INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ping_results (
  time TIMESTAMPTZ NOT NULL,
  monitor_id UUID NOT NULL,
  status_code INTEGER,
  is_up BOOLEAN NOT NULL,
  response_time_ms FLOAT,
  dns_lookup_ms FLOAT,
  tcp_connect_ms FLOAT,
  tls_handshake_ms FLOAT,
  ttfb_ms FLOAT,
  error_message TEXT,
  region VARCHAR(50) DEFAULT 'us-east',
  content_warning BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('ping_results', 'time');

CREATE TABLE ssl_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  issuer TEXT,
  subject TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  key_algorithm VARCHAR(50),
  is_valid BOOLEAN,
  days_until_expiry INTEGER,
  last_checked_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ssl_certificates ADD CONSTRAINT ssl_certs_monitor_unique UNIQUE (monitor_id);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT FALSE,
  root_cause TEXT,
  resolution_notes TEXT
);

CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  destination TEXT NOT NULL,
  trigger_level INTEGER DEFAULT 2,
  cooldown_minutes INTEGER DEFAULT 15,
  last_alerted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE oncall_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
