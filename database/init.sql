-- Users table for economy and user data
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    username TEXT NOT NULL,
    balance INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(user_id, guild_id)
);

-- Warnings table for moderation
CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Tickets table for support system
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL,
    closed_at INTEGER,
    closed_by TEXT
);

-- Reaction roles table
CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    UNIQUE(guild_id, message_id, emoji)
);

-- Guild settings table
CREATE TABLE IF NOT EXISTS guild_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT UNIQUE NOT NULL,
    welcome_channel TEXT,
    log_channel TEXT,
    mute_role TEXT,
    prefix TEXT DEFAULT '!',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Music queue table
CREATE TABLE IF NOT EXISTS music_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    duration TEXT,
    requested_by TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Bot customizations table for storing bot appearance changes
CREATE TABLE IF NOT EXISTS bot_customizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customization_type TEXT NOT NULL, -- 'avatar', 'banner', 'name'
    customization_value TEXT NOT NULL, -- URL or new name
    updated_by TEXT NOT NULL, -- User ID who made the change
    updated_at TEXT NOT NULL, -- Timestamp
    UNIQUE(customization_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_guild_user ON users(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_message ON reaction_roles(guild_id, message_id);
CREATE INDEX IF NOT EXISTS idx_bot_customizations_type ON bot_customizations(customization_type);
