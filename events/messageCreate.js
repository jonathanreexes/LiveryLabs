const database = require('../database/database');
const logger = require('../utils/logger');

// Anti-spam tracking
const spamTracker = new Map();
const SPAM_THRESHOLD = 5; // messages
const SPAM_WINDOW = 10000; // 10 seconds
const MUTE_DURATION = 300000; // 5 minutes

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        try {
            // Check if anti-spam is enabled
            const settings = await database.get(
                'SELECT anti_spam FROM guild_settings WHERE guild_id = ?',
                [message.guild.id]
            );

            if (!settings?.anti_spam) return;

            const userId = message.author.id;
            const guildId = message.guild.id;
            const now = Date.now();

            // Initialize spam tracking for user
            if (!spamTracker.has(userId)) {
                spamTracker.set(userId, []);
            }

            const userMessages = spamTracker.get(userId);
            
            // Remove old messages outside the spam window
            const recentMessages = userMessages.filter(timestamp => now - timestamp < SPAM_WINDOW);
            
            // Add current message timestamp
            recentMessages.push(now);
            spamTracker.set(userId, recentMessages);

            // Check for spam
            if (recentMessages.length >= SPAM_THRESHOLD) {
                try {
                    // Delete recent messages
                    const channel = message.channel;
                    const messagesToDelete = await channel.messages.fetch({ limit: 10 });
                    const userMessagesToDelete = messagesToDelete.filter(msg => 
                        msg.author.id === userId && 
                        now - msg.createdTimestamp < SPAM_WINDOW
                    );

                    await channel.bulkDelete(userMessagesToDelete);

                    // Timeout user for 5 minutes
                    const member = await message.guild.members.fetch(userId);
                    await member.timeout(MUTE_DURATION, 'Anti-spam: Excessive messaging');

                    // Send warning
                    const warningMessage = await channel.send(`⚠️ ${message.author}, you have been timed out for 5 minutes due to spamming.`);
                    
                    // Delete warning after 10 seconds
                    setTimeout(() => warningMessage.delete().catch(() => {}), 10000);

                    // Clear spam tracker for user
                    spamTracker.delete(userId);

                    logger.info(`Anti-spam triggered for user ${message.author.tag} in guild ${guildId}`);

                } catch (error) {
                    logger.error('Error applying anti-spam measures:', error);
                }
            }

            // Check for duplicate account patterns (basic detection)
            await checkDuplicateAccount(message);

        } catch (error) {
            logger.error('Error in anti-spam system:', error);
        }
    }
};

async function checkDuplicateAccount(message) {
    try {
        const member = message.member;
        const now = Date.now();
        const accountAge = now - member.user.createdTimestamp;
        const joinAge = now - member.joinedTimestamp;

        // Flag suspicious accounts (less than 7 days old, joined recently)
        if (accountAge < 7 * 24 * 60 * 60 * 1000 && joinAge < 60 * 60 * 1000) {
            // Check for similar usernames or rapid joining patterns
            const recentMembers = await message.guild.members.fetch();
            const suspiciousPatterns = recentMembers.filter(m => {
                const memberJoinAge = now - m.joinedTimestamp;
                const memberAccountAge = now - m.user.createdTimestamp;
                
                return memberJoinAge < 60 * 60 * 1000 && // Joined in last hour
                       memberAccountAge < 7 * 24 * 60 * 60 * 1000 && // Account less than 7 days old
                       m.user.id !== member.user.id;
            });

            if (suspiciousPatterns.size >= 3) {
                logger.warn(`Potential duplicate/suspicious accounts detected in guild ${message.guild.id}: ${suspiciousPatterns.size} similar accounts`);
                
                // Log to moderation channel if exists
                const logChannel = message.guild.channels.cache.find(ch => ch.name.includes('mod-log') || ch.name.includes('audit'));
                if (logChannel) {
                    const embed = {
                        title: '⚠️ Suspicious Account Activity',
                        description: `Multiple new accounts detected:\n${suspiciousPatterns.map(m => `• ${m.user.tag}`).slice(0, 5).join('\n')}`,
                        color: 0xff9900,
                        timestamp: new Date().toISOString()
                    };
                    
                    logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        }
    } catch (error) {
        logger.error('Error in duplicate account check:', error);
    }
}