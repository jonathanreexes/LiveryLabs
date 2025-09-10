const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Services and utilities
const database = require('./database/database');
const logger = require('./utils/logger');
const backupService = require('./services/backupService');
const musicPlayer = require('./services/musicPlayer');
const express = require('express');

// Health check server for Koyeb deployment
const app = express();
app.get('/', (req, res) => {
    res.status(200).send('Bot is running!');
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    logger.info(`Health check server running on port ${PORT}`);
});

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Create collections for commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
    } else {
        logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(`Loaded event: ${event.name}`);
}

// Initialize services and database
async function initialize() {
    try {
        // Initialize database
        await database.init();
        logger.info('Database initialized successfully');
        
        // Start backup service
        try {
            backupService.startBackupSchedule();
            logger.info('Backup service started');
        } catch (error) {
            logger.error('Backup service error:', error);
        }
        
        // Music player is initialized when imported
        logger.info('Music player initialized');
        
    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Initialize and login
initialize().then(() => {
    client.login(process.env.DISCORD_TOKEN);
}).catch(error => {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
});