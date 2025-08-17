const { PermissionFlagsBits } = require('discord.js');

class PermissionManager {
    constructor() {
        // Define permission levels
        this.permissionLevels = {
            USER: 0,
            MODERATOR: 1,
            ADMIN: 2,
            OWNER: 3
        };

        // Define required permissions for each level
        this.requiredPermissions = {
            [this.permissionLevels.MODERATOR]: [
                PermissionFlagsBits.ModerateMembers,
                PermissionFlagsBits.ManageMessages
            ],
            [this.permissionLevels.ADMIN]: [
                PermissionFlagsBits.Administrator
            ]
        };
    }

    /**
     * Get user's permission level in a guild
     * @param {GuildMember} member - The guild member
     * @returns {number} Permission level
     */
    getUserLevel(member) {
        if (!member || !member.guild) return this.permissionLevels.USER;

        // Check if user is guild owner
        if (member.id === member.guild.ownerId) {
            return this.permissionLevels.OWNER;
        }

        // Check for Administrator permission
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return this.permissionLevels.ADMIN;
        }

        // Check for Moderator permissions
        const modPerms = this.requiredPermissions[this.permissionLevels.MODERATOR];
        if (modPerms.some(perm => member.permissions.has(perm))) {
            return this.permissionLevels.MODERATOR;
        }

        return this.permissionLevels.USER;
    }

    /**
     * Check if user has required permission level
     * @param {GuildMember} member - The guild member
     * @param {number} requiredLevel - Required permission level
     * @returns {boolean} Whether user has sufficient permissions
     */
    hasPermissionLevel(member, requiredLevel) {
        const userLevel = this.getUserLevel(member);
        return userLevel >= requiredLevel;
    }

    /**
     * Check if user can manage another user
     * @param {GuildMember} moderator - The moderator
     * @param {GuildMember} target - The target user
     * @returns {boolean} Whether moderator can manage target
     */
    canManageUser(moderator, target) {
        if (!moderator || !target || !moderator.guild) return false;

        // Can't manage guild owner
        if (target.id === target.guild.ownerId) return false;

        // Guild owner can manage anyone
        if (moderator.id === moderator.guild.ownerId) return true;

        // Check role hierarchy
        const moderatorHighest = moderator.roles.highest;
        const targetHighest = target.roles.highest;

        return moderatorHighest.position > targetHighest.position;
    }

    /**
     * Check if bot can manage a user
     * @param {GuildMember} bot - The bot member
     * @param {GuildMember} target - The target user
     * @returns {boolean} Whether bot can manage target
     */
    canBotManageUser(bot, target) {
        if (!bot || !target || !bot.guild) return false;

        // Can't manage guild owner
        if (target.id === target.guild.ownerId) return false;

        // Check role hierarchy
        const botHighest = bot.roles.highest;
        const targetHighest = target.roles.highest;

        return botHighest.position > targetHighest.position;
    }

    /**
     * Check if bot can manage a role
     * @param {GuildMember} bot - The bot member
     * @param {Role} role - The target role
     * @returns {boolean} Whether bot can manage role
     */
    canBotManageRole(bot, role) {
        if (!bot || !role || !bot.guild) return false;

        // Can't manage roles higher than or equal to bot's highest role
        const botHighest = bot.roles.highest;
        return botHighest.position > role.position;
    }

    /**
     * Get permission level name
     * @param {number} level - Permission level
     * @returns {string} Level name
     */
    getLevelName(level) {
        const levelNames = {
            [this.permissionLevels.USER]: 'User',
            [this.permissionLevels.MODERATOR]: 'Moderator',
            [this.permissionLevels.ADMIN]: 'Administrator',
            [this.permissionLevels.OWNER]: 'Owner'
        };

        return levelNames[level] || 'Unknown';
    }

    /**
     * Check if user has specific Discord permission
     * @param {GuildMember} member - The guild member
     * @param {bigint} permission - Discord permission flag
     * @returns {boolean} Whether user has the permission
     */
    hasDiscordPermission(member, permission) {
        if (!member || !member.permissions) return false;
        return member.permissions.has(permission);
    }

    /**
     * Check multiple Discord permissions
     * @param {GuildMember} member - The guild member
     * @param {bigint[]} permissions - Array of Discord permission flags
     * @param {boolean} requireAll - Whether all permissions are required (default: false)
     * @returns {boolean} Whether user has the required permissions
     */
    hasDiscordPermissions(member, permissions, requireAll = false) {
        if (!member || !member.permissions || !Array.isArray(permissions)) return false;

        if (requireAll) {
            return permissions.every(perm => member.permissions.has(perm));
        } else {
            return permissions.some(perm => member.permissions.has(perm));
        }
    }

    /**
     * Get missing permissions for a user
     * @param {GuildMember} member - The guild member
     * @param {bigint[]} requiredPermissions - Required permissions
     * @returns {bigint[]} Array of missing permissions
     */
    getMissingPermissions(member, requiredPermissions) {
        if (!member || !member.permissions || !Array.isArray(requiredPermissions)) {
            return requiredPermissions;
        }

        return requiredPermissions.filter(perm => !member.permissions.has(perm));
    }

    /**
     * Format permission names for display
     * @param {bigint[]} permissions - Array of permission flags
     * @returns {string[]} Array of formatted permission names
     */
    formatPermissionNames(permissions) {
        const permissionNames = {
            [PermissionFlagsBits.Administrator]: 'Administrator',
            [PermissionFlagsBits.ManageGuild]: 'Manage Server',
            [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
            [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
            [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
            [PermissionFlagsBits.ModerateMembers]: 'Moderate Members',
            [PermissionFlagsBits.KickMembers]: 'Kick Members',
            [PermissionFlagsBits.BanMembers]: 'Ban Members',
            [PermissionFlagsBits.ViewChannel]: 'View Channels',
            [PermissionFlagsBits.SendMessages]: 'Send Messages',
            [PermissionFlagsBits.ReadMessageHistory]: 'Read Message History',
            [PermissionFlagsBits.UseExternalEmojis]: 'Use External Emojis',
            [PermissionFlagsBits.AddReactions]: 'Add Reactions',
            [PermissionFlagsBits.Connect]: 'Connect to Voice',
            [PermissionFlagsBits.Speak]: 'Speak in Voice',
            [PermissionFlagsBits.UseVAD]: 'Use Voice Activity'
        };

        return permissions.map(perm => permissionNames[perm] || 'Unknown Permission');
    }
}

module.exports = new PermissionManager();
