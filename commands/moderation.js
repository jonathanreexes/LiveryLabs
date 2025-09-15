const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Light moderation and anti-spam commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('antispam')
                .setDescription('Configure anti-spam settings')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Enable or disable anti-spam')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('antinuke')
                .setDescription('Configure anti-nuke protection')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Enable or disable anti-nuke')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check protection status'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Timeout protection - acknowledge immediately
        const timeoutId = setTimeout(async () => {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply().catch(() => {});
            }
        }, 250);

        // Note: Global owner-only validation now handles all access control

        try {
            if (subcommand === 'antispam') {
                const action = interaction.options.getString('action');
                const enabled = action === 'enable';

                // Update database
                await database.run(
                    `INSERT OR REPLACE INTO guild_settings (guild_id, anti_spam, updated_at) 
                     VALUES (?, ?, datetime('now'))`,
                    [guildId, enabled ? 1 : 0]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-Spam Protection')
                    .setDescription(`Anti-spam protection has been **${enabled ? 'enabled' : 'disabled'}**`)
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                logger.info(`Anti-spam ${enabled ? 'enabled' : 'disabled'} in guild ${guildId}`);

            } else if (subcommand === 'antinuke') {
                const action = interaction.options.getString('action');
                const enabled = action === 'enable';

                // Update database
                await database.run(
                    `INSERT OR REPLACE INTO guild_settings (guild_id, anti_nuke, updated_at) 
                     VALUES (?, ?, datetime('now'))`,
                    [guildId, enabled ? 1 : 0]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🔒 Anti-Nuke Protection')
                    .setDescription(`Anti-nuke protection has been **${enabled ? 'enabled' : 'disabled'}**`)
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                logger.info(`Anti-nuke ${enabled ? 'enabled' : 'disabled'} in guild ${guildId}`);

            } else if (subcommand === 'status') {
                const settings = await database.get(
                    'SELECT * FROM guild_settings WHERE guild_id = ?',
                    [guildId]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Protection Status')
                    .addFields(
                        { 
                            name: 'Anti-Spam', 
                            value: settings?.anti_spam ? '✅ Enabled' : '❌ Disabled', 
                            inline: true 
                        },
                        { 
                            name: 'Anti-Nuke', 
                            value: settings?.anti_nuke ? '✅ Enabled' : '❌ Disabled', 
                            inline: true 
                        },
                        { 
                            name: 'Verification', 
                            value: settings?.verification_enabled ? '✅ Enabled' : '❌ Disabled', 
                            inline: true 
                        }
                    )
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error('Error in moderation command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing the command.')
                .setColor(0xD3D3D3)

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                } else if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                }
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};