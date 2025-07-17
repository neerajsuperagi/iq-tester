-- IQ Tester Database Schema

-- Create database if not exists
-- CREATE DATABASE iq_tester;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Made nullable for simplified login (no passwords for users)
    full_name VARCHAR(255) NOT NULL,
    has_attempted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table for express-session
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

-- Questions bank table (stores all available questions)
CREATE TABLE IF NOT EXISTS questions_bank (
    id SERIAL PRIMARY KEY,
    question_text TEXT DEFAULT 'Choose the appropriate shape to replace the shape that is missing.',
    question_image VARCHAR(255) NOT NULL, -- filename of the question pattern image
    option_a_image VARCHAR(255), -- filename for option A image (optional, can be text)
    option_b_image VARCHAR(255), -- filename for option B image (optional, can be text)
    option_c_image VARCHAR(255), -- filename for option C image (optional, can be text)
    option_d_image VARCHAR(255), -- filename for option D image (optional, can be text)
    option_e_image VARCHAR(255), -- filename for option E image (optional, can be text)
    option_f_image VARCHAR(255), -- filename for option F image (optional, can be text)
    option_a_text VARCHAR(50), -- text content for option A (if not image)
    option_b_text VARCHAR(50), -- text content for option B (if not image)
    option_c_text VARCHAR(50), -- text content for option C (if not image)
    option_d_text VARCHAR(50), -- text content for option D (if not image)
    option_e_text VARCHAR(50), -- text content for option E (if not image)
    option_f_text VARCHAR(50), -- text content for option F (if not image)
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F')),
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    category VARCHAR(100) DEFAULT 'pattern_recognition',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- User question sets table (stores which 30 questions each user gets)
CREATE TABLE IF NOT EXISTS user_question_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_ids INTEGER[] NOT NULL, -- Array of 30 question IDs in specific order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Test sessions table
CREATE TABLE IF NOT EXISTS test_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    time_limit INTEGER DEFAULT 900, -- 15 minutes in seconds
    current_question INTEGER DEFAULT 1,
    answers JSONB DEFAULT '{}',
    is_completed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP NULL
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES test_sessions(id) ON DELETE CASCADE,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    unanswered INTEGER NOT NULL,
    iq_score INTEGER NOT NULL,
    time_taken INTEGER NOT NULL, -- in seconds
    completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin user will be created dynamically using environment variables

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id); 