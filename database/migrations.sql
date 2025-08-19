ALTER TABLE guild_settings ADD COLUMN verification_image_url TEXT;

-- Add welcome/leave message columns to guild_settings
ALTER TABLE guild_settings ADD COLUMN welcome_enabled INTEGER DEFAULT 0;
ALTER TABLE guild_settings ADD COLUMN leave_enabled INTEGER DEFAULT 0;
ALTER TABLE guild_settings ADD COLUMN leave_channel TEXT;
ALTER TABLE guild_settings ADD COLUMN welcome_title TEXT;
ALTER TABLE guild_settings ADD COLUMN welcome_message TEXT;
ALTER TABLE guild_settings ADD COLUMN leave_title TEXT;
ALTER TABLE guild_settings ADD COLUMN leave_message TEXT;
ALTER TABLE guild_settings ADD COLUMN welcome_color INTEGER DEFAULT 65280;
ALTER TABLE guild_settings ADD COLUMN leave_color INTEGER DEFAULT 16740971;
ALTER TABLE guild_settings ADD COLUMN welcome_image_url TEXT;
ALTER TABLE guild_settings ADD COLUMN leave_image_url TEXT;
ALTER TABLE guild_settings ADD COLUMN welcome_image_position TEXT DEFAULT 'image';
ALTER TABLE guild_settings ADD COLUMN leave_image_position TEXT DEFAULT 'image';
