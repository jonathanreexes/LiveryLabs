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
            await interaction.reply({
                content: '❌ This command can only be used by the server owner.',
                ephemeral: true
            });
            
            logger.warn(`Unauthorized command attempt: ${interaction.commandName} by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild.id}`);
            return false;
        }
        return true;
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