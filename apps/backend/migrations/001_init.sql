CREATE TABLE
    IF NOT EXISTS scam_numbers (
        phone_hash VARCHAR(64) PRIMARY KEY,
        confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
        report_count INTEGER NOT NULL DEFAULT 0,
        source VARCHAR(64) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_scam_numbers_updated_at ON scam_numbers (updated_at);

CREATE TABLE
    IF NOT EXISTS scam_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        phone_hash VARCHAR(64) NOT NULL,
        notes TEXT,
        source VARCHAR(64) NOT NULL DEFAULT 'community',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE TABLE
    IF NOT EXISTS designated_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        owner_user_id VARCHAR(128) NOT NULL UNIQUE,
        contact_phone_hash VARCHAR(64) NOT NULL,
        fcm_token TEXT NOT NULL,
        display_name VARCHAR(120) NOT NULL
    );

CREATE TABLE
    IF NOT EXISTS scam_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        owner_user_id VARCHAR(128) NOT NULL,
        call_id VARCHAR(128) NOT NULL,
        score DOUBLE PRECISION NOT NULL,
        transcript_preview TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );