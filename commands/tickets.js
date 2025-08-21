const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticketing system disabled - use dedicated ticketing bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticketing System')
            .setDescription('The ticketing system has been disabled on this bot.\n\nPlease use the dedicated ticketing bot for support tickets.')
            .setColor(0xD3D3D3)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};