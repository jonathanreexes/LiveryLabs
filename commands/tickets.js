const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticketing system disabled - use dedicated ticketing bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // Check if user is server owner
        if (interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: '❌ This command can only be used by the server owner.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticketing System')
            .setDescription('The ticketing system has been disabled on this bot.\n\nPlease use the dedicated ticketing bot for support tickets.')
            .setColor(0xffa500)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};