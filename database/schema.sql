-- ==============================================================================
-- EventHub Database Schema: Users, Events, and Registrations
-- Optimized for PostgreSQL / Supabase with JSONB support and high-speed indexing
-- ==============================================================================

-- 1. Users Table
-- Stores participant profiles, contact information, and dynamic JSONB preferences
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{
        "role": "Participant",
        "tshirtSize": "L",
        "dietary": "Standard",
        "track": "General",
        "notifications": true,
        "notes": ""
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- GIN index for ultra-fast JSONB querying inside user preferences
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin(preferences);


-- 2. Events Table
-- Stores event information, scheduling, venue, and attendee metrics
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    details TEXT,
    date DATE NOT NULL,
    start_time TIME DEFAULT '09:00',
    end_time TIME DEFAULT '18:00',
    venue VARCHAR(255) DEFAULT 'Main Campus Auditorium',
    city VARCHAR(100) DEFAULT 'Campus',
    category VARCHAR(100) DEFAULT 'Hackathon',
    max_attendees INT DEFAULT 200,
    attendees INT DEFAULT 0,
    checked_in INT DEFAULT 0,
    organizer_email VARCHAR(255) DEFAULT 'organizer@eventhub.io',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for upcoming events by date
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);


-- 3. Registrations Table
-- Junction table linking events and users with unique ticket codes and timestamps
CREATE TABLE IF NOT EXISTS registrations (
    reg_id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticket_id VARCHAR(64) UNIQUE NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    entry_confirmed BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    CONSTRAINT unique_user_per_event UNIQUE (event_id, user_id)
);

-- Indexes for ultra-fast foreign key joins and ticket scans
CREATE INDEX IF NOT EXISTS idx_reg_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_reg_user ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_ticket ON registrations(ticket_id);


-- ==============================================================================
-- Sample Seed Data
-- ==============================================================================

INSERT INTO users (user_id, name, email, preferences)
VALUES 
    (
        'usr_bala_01', 
        'Bala Aditya', 
        'aditya.kxlmn@gmail.com', 
        '{"role": "Fullstack Developer", "tshirtSize": "L", "dietary": "Vegetarian", "track": "Agentic AI & Robotics", "notifications": true, "notes": "Excited for the AI agent hackathon track!"}'::jsonb
    ),
    (
        'usr_priya_02', 
        'Priya Sharma', 
        'priya.sharma@campus.edu', 
        '{"role": "ML Engineer", "tshirtSize": "M", "dietary": "Vegan", "track": "Computer Vision", "notifications": true, "notes": "Looking for team members for edge-AI project."}'::jsonb
    ),
    (
        'usr_aarav_03', 
        'Aarav Patel', 
        'aarav.patel@tech.edu', 
        '{"role": "UI/UX Designer", "tshirtSize": "XL", "dietary": "Non-Vegetarian", "track": "Product Design", "notifications": true, "notes": "Focused on accessible mobile design."}'::jsonb
    )
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO events (event_id, name, details, date, start_time, end_time, venue, city, category, max_attendees, attendees, checked_in)
VALUES 
    (
        'evt_demo_01',
        'Apex AI & Robotics Hackathon 2026',
        'Join the premier inter-college artificial intelligence and robotics championship. Build high-impact agentic AI pipelines, compete for ₹2,50,000 in grand prizes, and network with leading tech founders.',
        '2026-10-24',
        '09:00',
        '18:00',
        'Main Auditorium & Innovation Lab',
        'Pune',
        'Hackathon',
        150,
        18,
        4
    )
ON CONFLICT (event_id) DO NOTHING;
