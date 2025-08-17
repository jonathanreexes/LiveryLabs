const { Events } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        // Ignore bot reactions
        if (user.bot) return;

        try {
            // Handle partial reactions
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    logger.error('Something went wrong when fetching the message:', error);
                    return;
                }
            }

            // Get guild and member
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = guild.members.cache.get(user.id);
            if (!member) return;

            // Check for reaction roles
            const emoji = reaction.emoji.id || reaction.emoji.name;
            const reactionRole = await database.getReactionRole(
                guild.id,
                reaction.message.id,
                emoji
            );

            if (reactionRole) {
                const role = guild.roles.cache.get(reactionRole.role_id);
                
                if (!role) {
                    logger.warn(`Reaction role not found: ${reactionRole.role_id}`);
                    return;
                }

                // Check if bot can assign the role
                if (role.position >= guild.members.me.roles.highest.position) {
                    logger.warn(`Cannot assign role ${role.name} - position too high`);
                    return;
                }

                // Check if user already has the role
                if (member.roles.cache.has(role.id)) {
                    logger.debug(`User ${user.tag} already has role ${role.name}`);
                    return;
                }

                try {
                    await member.roles.add(role);
                    logger.info(`Assigned role ${role.name} to ${user.tag} via reaction`);

                    // Send DM notification (optional)
                    try {
                        await user.send(`✅ You have been given the **${role.name}** role in **${guild.name}**!`);
                    } catch (error) {
                        // User has DMs disabled
                        logger.debug(`Could not send DM to ${user.tag}: ${error.message}`);
                    }
                } catch (error) {
                    logger.error(`Failed to assign role ${role.name} to ${user.tag}:`, error);
                }
            }
        } catch (error) {
            logger.error('Error in messageReactionAdd event:', error);
        }
    }
};
