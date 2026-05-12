-- V1: Initialize PostgreSQL extensions required by Bhuvigyan V7
-- Forward-only. No rollback needed.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
