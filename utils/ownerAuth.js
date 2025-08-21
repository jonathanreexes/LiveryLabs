const logger = require('./logger');

/**
 * Centralized owner authentication utility
 * Ensures all commands are restricted to server owner only
 */
class OwnerAuth {
    /**
     * Check if user is the server owner
     * @param {Object} interaction - Discord interaction object
     * @returns {boolean} - True if user is owner, false otherwise
     */
    static isOwner(interaction) {
        return interaction.user.id === interaction.guild.ownerId;
    }

    /**
     * Validate owner access and reply with error if unauthorized
     * @param {Object} interaction - Discord interaction object
     * @returns {boolean} - True if authorized, false if unauthorized (already replied)
     */
    static async validateOwnerAccess(interaction) {
        if (!this.isOwner(interaction)) {
            // Check if user has permission to see commands but can't execute
            const canSeeCommands = this.canSeeCommands(interaction);
            
            const message = canSeeCommands 
                ? '🔒 You can see this command but only the server owner can execute it.'
                : '❌ This command can only be used by the server owner.';
            
            await interaction.reply({
                content: message,
                ephemeral: true
            });
            
            logger.warn(`Unauthorized command attempt: ${interaction.commandName} by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild.id}`);
            return false;
        }
        return true;
    }

    /**
     * Check if user has roles that allow them to see commands
     * @param {Object} interaction - Discord interaction object
     * @returns {boolean} - True if user can see commands
     */
    static canSeeCommands(interaction) {
        const member = interaction.member;
        if (!member) return false;

        // Roles that can see commands (but not execute them)
        const allowedRoleNames = [
            'Administrator',
            'Admin', 
            'Moderator',
            'Mod',
            'Staff',
            'Helper',
            'Bot Manager',
            'Server Manager'
        ];

        return member.roles.cache.some(role => 
            allowedRoleNames.some(allowedName => 
                role.name.toLowerCase().includes(allowedName.toLowerCase())
            )
        );
    }

    /**
     * Middleware function for automatic owner validation
     * Use this wrapper for all command execute functions
     * @param {Function} executeFunction - The original command execute function
     * @returns {Function} - Wrapped execute function with owner validation
     */
    static ownerOnly(executeFunction) {
        return async function(interaction) {
            // Validate owner access first
            if (!await OwnerAuth.validateOwnerAccess(interaction)) {
                return; // Already replied with error message
            }
            
            // If authorized, execute the original function
            return await executeFunction.call(this, interaction);
        };
    }

    /**
     * Check if message sender is owner (for text commands like sleep/wake)
     * @param {Object} message - Discord message object
     * @returns {boolean} - True if sender is owner
     */
    static isMessageOwner(message) {
        return message.author.id === message.guild.ownerId;
    }
}

module.exports = OwnerAuth;