-- User Memory Table
CREATE TABLE IF NOT EXISTS user_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversation History Table
CREATE TABLE IF NOT EXISTS conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings and Preferences Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Study Workspace Table
CREATE TABLE IF NOT EXISTS study_workspace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Learning Database Table (for spaced repetition, etc.)
CREATE TABLE IF NOT EXISTS learning_database (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pronunciation Profiles Table
CREATE TABLE IF NOT EXISTS pronunciation_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_name TEXT NOT NULL UNIQUE,
    voice_sample BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task History Table
CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed'
    started_at DATETIME,
    completed_at DATETIME,
    result TEXT
);

-- Automation History Table
CREATE TABLE IF NOT EXISTS automation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    parameters TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT 1,
    result TEXT
);

-- Logs Table
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL, -- 'info', 'warn', 'error', 'debug'
    message TEXT NOT NULL,
    module TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_memory_key ON user_memory(key);
CREATE INDEX IF NOT EXISTS idx_conversation_history_session ON conversation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_timestamp ON conversation_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_study_workspace_updated ON study_workspace(updated_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_next_review ON learning_database(next_review);
CREATE INDEX IF NOT EXISTS idx_pronunciation_profiles_name ON pronunciation_profiles(profile_name);
CREATE INDEX IF NOT EXISTS idx_task_history_status ON task_history(status);
CREATE INDEX IF NOT EXISTS idx_automation_history_executed ON automation_history(executed_at);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);