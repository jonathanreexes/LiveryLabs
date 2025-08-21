# Discord Bot

## Overview

This is a comprehensive Discord bot built with Node.js and the discord.js library. The bot provides a wide range of features including moderation tools, music playback, economy system, games, role management, support tickets, and various utility commands. It uses SQLite for data persistence and includes advanced features like rate limiting, automated backups, comprehensive logging, and bot appearance customization.

## User Preferences

Preferred communication style: Simple, everyday language.

**Bot Configuration (Updated):**
- Using dedicated ticketing bot for support tickets
- Using Dyno bot for heavy moderation and community management  
- Livery Labs bot focused on: music, games, welcome/leave messages, verification, light anti-spam, and anti-nuke protection
- Removed heavy moderation commands (kick, ban, warn) to avoid conflicts with other bots
- Verification system successfully configured and tested (August 18, 2025)
- Complete verification customization implemented: custom titles, messages, success responses, and colors for full branding control
- Timestamps removed from verification embeds for cleaner appearance (August 19, 2025)
- Comprehensive giveaway system with full customization: custom titles, messages, banners, colors, and automated management
- Image upload support for both verification embeds and custom embed command with flexible positioning (August 19, 2025)
- Line break support added to all text fields using \\n notation for paragraph formatting (August 21, 2025)
- Professional bullet point formatting with hanging indents using • notation for clean bulletin-style lists (August 21, 2025)
- Centralized owner-only security system implemented for ALL current and future commands (August 21, 2025)
- Role-based command visibility system: certain roles can see commands but only owner can execute them (August 21, 2025)
- Default embed colors standardized to light gray (0xD3D3D3) across all bot messages for consistent branding (August 21, 2025)
- Comprehensive welcome and leave message system with separate channel configuration: welcome messages in public channels, leave messages in private bot channels, owner-only management (August 19, 2025)
- Detailed Discord role permissions guide created for multi-bot server setup and security best practices

## System Architecture

### Core Framework
- **Discord.js v14**: Modern Discord API wrapper with full slash command support
- **Node.js Runtime**: Asynchronous event-driven architecture
- **Modular Command System**: Commands organized by category with standardized structure using SlashCommandBuilder

### Database Layer
- **SQLite3**: Lightweight file-based database for data persistence
- **Custom Database Wrapper**: Abstraction layer in `/database/database.js` for query management
- **Automatic Schema Setup**: Database tables created from `/database/init.sql` on startup
- **Data Storage**: User economy data, moderation logs, tickets, reaction roles, configuration, and bot customization history

### Event System
- **Discord Event Handlers**: Modular event system in `/events/` directory
- **Member Events**: Welcome/farewell messages with embeds and auto-role assignment
- **Interaction Handling**: Centralized slash command and component interaction processing
- **Reaction Roles**: Automatic role assignment/removal based on message reactions

### Command Architecture
- **Slash Commands**: All commands use Discord's native slash command system
- **Subcommand Pattern**: Commands grouped by functionality (economy, moderation, music, etc.)
- **Permission Levels**: Role-based access control with custom permission manager
- **Rate Limiting**: Per-user command rate limiting to prevent abuse
- **Bot Customization Commands**: Admin-only commands for changing bot avatar, banner, and name
- **Verification System**: Owner-only `/verification setup` command with comprehensive customization options:
  - Custom verification prompt title and message
  - Custom success message title and text
  - Hex color code support for consistent branding
  - Automatic role creation and button-based user verification

### Music System
- **Discord.js Voice**: Native Discord voice connection handling
- **YouTube Integration**: ytdl-core and yt-search for YouTube audio streaming
- **Queue Management**: Per-guild music queues with volume control and track persistence
- **Voice Channel Management**: Automatic leave on empty with configurable timeout

### Moderation Features
- **Automated Actions**: Kick, ban, mute with duration support
- **Warning System**: Cumulative warning tracking with configurable thresholds
- **Auto-Moderation**: Configurable automatic moderation rules
- **Audit Logging**: Comprehensive moderation action logging

### Services Layer
- **Backup Service**: Automated database backups using node-cron with retention policies
- **Music Player**: Centralized music playback management with queue persistence
- **Rate Limiter**: Token bucket algorithm for command rate limiting
- **Permission Manager**: Hierarchical permission system with role-based access

### Utility Systems
- **Custom Logger**: File-based logging with multiple log levels and colored console output
- **Configuration Management**: JSON-based configuration with hot-reload capability
- **Error Handling**: Comprehensive error catching and user-friendly error messages
- **Bot Customization**: Admin-only commands to customize bot avatar, banner, and username with history tracking

### File Structure
```
├── commands/          # Slash command implementations
├── events/           # Discord event handlers
├── database/         # Database management and schemas
├── services/         # Core service implementations
├── utils/           # Utility classes and helpers
├── logs/            # Application log files
└── backups/         # Automated database backups
```

## External Dependencies

### Core Dependencies
- **discord.js**: Discord API interaction and gateway connection
- **sqlite3**: Database engine for persistent data storage
- **dotenv**: Environment variable management for sensitive configuration

### Music Features
- **@discordjs/voice**: Discord voice connection and audio streaming
- **ytdl-core**: YouTube video/audio downloading and streaming
- **yt-search**: YouTube search API for finding tracks by query

### Utility Services
- **node-cron**: Scheduled task management for automated backups
- **fs-extra**: Enhanced file system operations for backup management

### Development Tools
- **File System Monitoring**: Dynamic command and event loading
- **Process Management**: Graceful shutdown handling and resource cleanup