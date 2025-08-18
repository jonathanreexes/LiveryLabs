const database = require('../database/database');
const logger = require('../utils/logger');

// Anti-nuke tracking
const roleChangeTracker = new Map();
const ROLE_CHANGE_THRESHOLD = 10; // role changes
const ROLE_CHANGE_WINDOW = 60000; // 1 minute
const PERMISSION_CHANGE_THRESHOLD = 5; // permission changes
const PERMISSION_CHANGE_WINDOW = 30000; // 30 seconds

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            // Check if anti-nuke is enabled
            const settings = await new Promise((resolve, reject) => {
                database.db.get(
                    'SELECT anti_nuke FROM guild_settings WHERE guild_id = ?',
                    [newMember.guild.id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            // If no settings exist or anti-nuke is disabled, skip
            if (!settings || !settings.anti_nuke) return;

            // Track role changes for anti-nuke
            await trackRoleChanges(oldMember, newMember);

        } catch (error) {
            logger.error('Error in guildMemberUpdate anti-nuke:', error.message || error);
        }
    }
};

async function trackRoleChanges(oldMember, newMember) {
    try {
        const guildId = newMember.guild.id;
        const now = Date.now();

        // Check for role additions/removals
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
            // Initialize tracking for guild
            if (!roleChangeTracker.has(guildId)) {
                roleChangeTracker.set(guildId, []);
            }

            const guildChanges = roleChangeTracker.get(guildId);
            
            // Remove old changes outside the window
            const recentChanges = guildChanges.filter(change => now - change.timestamp < ROLE_CHANGE_WINDOW);
            
            // Add current change
            recentChanges.push({
                timestamp: now,
                type: 'role_change',
                target: newMember.user.id,
                addedRoles: addedRoles.size,
                removedRoles: removedRoles.size
            });

            roleChangeTracker.set(guildId, recentChanges);

            // Check for anti-nuke threshold
            if (recentChanges.length >= ROLE_CHANGE_THRESHOLD) {
                await handleAntiNukeDetection(newMember.guild, 'role_mass_change', recentChanges);
            }
        }

        // Check for dangerous permission additions
        await checkDangerousPermissions(oldMember, newMember);

    } catch (error) {
        logger.error('Error tracking role changes:', error);
    }
}

async function checkDangerousPermissions(oldMember, newMember) {
    try {
        const dangerousPermissions = [
            'ADMINISTRATOR',
            'MANAGE_GUILD',
            'MANAGE_ROLES', 
            'MANAGE_CHANNELS',
            'BAN_MEMBERS',
            'KICK_MEMBERS',
            'MANAGE_WEBHOOKS'
        ];

        const oldPermissions = oldMember.permissions.toArray();
        const newPermissions = newMember.permissions.toArray();

        const addedPermissions = newPermissions.filter(perm => !oldPermissions.includes(perm));
        const dangerousAdded = addedPermissions.filter(perm => dangerousPermissions.includes(perm));

        if (dangerousAdded.length > 0) {
            logger.warn(`Dangerous permissions added to ${newMember.user.tag} in guild ${newMember.guild.id}: ${dangerousAdded.join(', ')}`);
            
            // Log to moderation channel
            const logChannel = newMember.guild.channels.cache.find(ch => ch.name.includes('mod-log') || ch.name.includes('audit'));
            if (logChannel) {
                const embed = {
                    title: '🚨 Dangerous Permission Change',
                    description: `**User:** ${newMember.user.tag}\n**Added Permissions:** ${dangerousAdded.join(', ')}`,
                    color: 0xff0000,
                    timestamp: new Date().toISOString()
                };
                
                logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }

    } catch (error) {
        logger.error('Error checking dangerous permissions:', error);
    }
}

async function handleAntiNukeDetection(guild, type, changes) {
    try {
        logger.warn(`Anti-nuke triggered in guild ${guild.id}: ${type} - ${changes.length} changes detected`);

        // Find moderation/audit log channel
        const logChannel = guild.channels.cache.find(ch => 
            ch.name.includes('mod-log') || 
            ch.name.includes('audit') || 
            ch.name.includes('security')
        );

        if (logChannel) {
            const embed = {
                title: '🚨 ANTI-NUKE ALERT',
                description: `**Type:** ${type.replace('_', ' ').toUpperCase()}\n**Changes:** ${changes.length} rapid changes detected\n**Time Window:** Last minute`,
                fields: [
                    {
                        name: 'Recommended Actions',
                        value: '• Review recent audit logs\n• Check for unauthorized moderators\n• Consider temporary lockdown if needed',
                        inline: false
                    }
                ],
                color: 0xff0000,
                timestamp: new Date().toISOString()
            };

            await logChannel.send({ embeds: [embed] });
        }

        // Clear tracker to prevent spam
        roleChangeTracker.delete(guild.id);

    } catch (error) {
        logger.error('Error handling anti-nuke detection:', error);
    }
}