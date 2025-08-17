const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const logger = require('./utils/logger');
const database = require('./database/database');
const backupService = require('./services/backupService');
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
if (!token) {
    logger.error('No Discord token provided');
    process.exit(1);
}

client.login(token);
