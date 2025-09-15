const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticketing system disabled - use dedicated ticketing bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // Timeout protection - acknowledge immediately
        const timeoutId = setTimeout(async () => {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }, 250);

        try {
            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticketing System')
                .setDescription('The ticketing system has been disabled on this bot.\n\nPlease use the dedicated ticketing bot for support tickets.')
                .setColor(0xD3D3D3)
                .setTimestamp();

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.editReply({ embeds: [embed] });
            }
            
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error('Error in ticket command:', error);
        }
    }
};