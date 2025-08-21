const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);

        // Set bot status
        client.user.setPresence({
            activities: [{
                name: `${client.guilds.cache.size} servers | /help`,
                type: ActivityType.Watching
            }],
            status: 'online'
        });

        // Register slash commands
        try {
            logger.info('Started refreshing application (/) commands.');

            const commands = [];
            client.commands.forEach(command => {
                if (command.data) {
                    commands.push(command.data.toJSON());
                    logger.info(`Registering command: ${command.data.name}`);
                }
            });

            // Clear global commands first to prevent duplicates
            try {
                await client.application.commands.set([]);
                logger.info('Cleared global commands to prevent duplicates');
            } catch (error) {
                logger.warn('Could not clear global commands:', error.message);
            }

            // Register commands to each guild for better permission control
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.commands.set(commands);
                    logger.info(`Commands registered for guild: ${guild.name}`);
                } catch (error) {
                    logger.error(`Failed to register commands for guild ${guild.name}:`, error);
                }
            }
            
            logger.info(`Successfully reloaded ${commands.length} application (/) commands.`);
        } catch (error) {
            logger.error('Error registering slash commands:', error);
        }

        // Update activity every 5 minutes
        setInterval(() => {
            const activities = [
                `${client.guilds.cache.size} servers | /help`,
                `${client.users.cache.size} users | /help`,
                `music, games & more | /help`,
                `moderation tools | /help`
            ];
            
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            
            client.user.setPresence({
                activities: [{
                    name: randomActivity,
                    type: ActivityType.Watching
                }],
                status: 'online'
            });
        }, 300000); // 5 minutes
    }
};
