const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const logger = require('./utils/logger');
const database = require('./database/database');
const backupService = require('./services/backupService');
const express = require('express');
require('dotenv').config();

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load command files
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
    if (folder.endsWith('.js')) {
        const command = require(`./commands/${folder}`);
        if (command.data) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Initialize database on startup
database.init().then(() => {
    logger.info('Database initialized successfully');
}).catch(err => {
    logger.error('Database initialization failed:', err);
    process.exit(1);
});

// Start backup service
backupService.startBackupSchedule();

// Health check server for Koyeb deployment
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.json({ 
        status: 'Bot is running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        guilds: client.guilds ? client.guilds.cache.size : 0
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Health check server running on port ${PORT}`);
});

// Error handling
process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN || config.token;
if (!token || token === 'your_discord_token_here') {
    logger.error('No valid Discord token provided. Please add your Discord bot token to the DISCORD_TOKEN secret.');
    logger.info('Get your token from: https://discord.com/developers/applications');
    process.exit(1);
}

// Log token length for debugging (without revealing the token)
logger.info(`Token length: ${token.length} characters`);

logger.info('Attempting to connect to Discord...');
client.login(token.trim()).catch(error => {
    logger.error('Failed to login to Discord:', error);
    if (error.code === 'TokenInvalid') {
        logger.error('The provided Discord token is invalid. Please check:');
        logger.error('1. Token is copied correctly from Discord Developer Portal');
        logger.error('2. Bot section is configured in your Discord application');
        logger.error('3. No extra spaces or characters in the token');
    }
    process.exit(1);
});
