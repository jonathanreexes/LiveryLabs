const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification')
        .setDescription('User verification system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup verification system in current channel')
                .addRoleOption(option =>
                    option.setName('verified_role')
                        .setDescription('Role to give verified users (will create "Verified" if not provided)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable verification')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Enable or disable verification')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('verify')
                .setDescription('Manually verify a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to verify')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check verification status'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'setup') {
                // Check permissions
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({ 
                        content: '❌ You need "Manage Server" permissions to set up verification!', 
                        ephemeral: true 
                    });
                }

                let verifiedRole = interaction.options.getRole('verified_role');
                const verificationChannel = interaction.channel;

                // Create verified role if not provided
                if (!verifiedRole) {
                    try {
                        verifiedRole = await interaction.guild.roles.create({
                            name: 'Verified',
                            color: 0x00ff00,
                            reason: 'Verification system setup'
                        });
                    } catch (error) {
                        return await interaction.reply({ 
                            content: '❌ Could not create verified role. Please create a role and specify it manually.', 
                            ephemeral: true 
                        });
                    }
                }

                // Store verification settings
                await database.run(
                    `INSERT OR REPLACE INTO guild_settings 
                     (guild_id, verification_enabled, verified_role_id, verification_channel_id, updated_at) 
                     VALUES (?, 1, ?, ?, datetime('now'))`,
                    [guildId, verifiedRole.id, verificationChannel.id]
                );

                // Create verification message
                const verifyEmbed = new EmbedBuilder()
                    .setTitle('🔐 Server Verification')
                    .setDescription('Click the button below to verify yourself and gain access to the server!')
                    .setColor(0x00ff00)
                    .setTimestamp();

                const verifyButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('verify_user')
                            .setLabel('Verify')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅')
                    );

                await verificationChannel.send({ 
                    embeds: [verifyEmbed], 
                    components: [verifyButton] 
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Verification Setup Complete')
                    .setDescription(`Verification system configured!\n\n**Verified Role:** ${verifiedRole}\n**Channel:** ${verificationChannel}\n\n*New users will now need to click the verify button to access your server.*`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                logger.info(`Verification setup completed in guild ${guildId}`);

            } else if (subcommand === 'toggle') {
                const action = interaction.options.getString('action');
                const enabled = action === 'enable';

                await database.run(
                    `INSERT OR REPLACE INTO guild_settings (guild_id, verification_enabled, updated_at) 
                     VALUES (?, ?, datetime('now'))`,
                    [guildId, enabled ? 1 : 0]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🔐 Verification System')
                    .setDescription(`Verification has been **${enabled ? 'enabled' : 'disabled'}**`)
                    .setColor(enabled ? 0x00ff00 : 0xff0000)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'verify') {
                const user = interaction.options.getUser('user');
                const member = await interaction.guild.members.fetch(user.id);

                const settings = await database.get(
                    'SELECT verified_role_id FROM guild_settings WHERE guild_id = ?',
                    [guildId]
                );

                if (!settings?.verified_role_id) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Setup Required')
                        .setDescription('Verification system is not set up. Use `/verification setup` first.')
                        .setColor(0xff0000);

                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const verifiedRole = interaction.guild.roles.cache.get(settings.verified_role_id);
                await member.roles.add(verifiedRole);

                const embed = new EmbedBuilder()
                    .setTitle('✅ User Verified')
                    .setDescription(`${user} has been manually verified and given the ${verifiedRole} role.`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                logger.info(`User ${user.tag} manually verified in guild ${guildId}`);

            } else if (subcommand === 'status') {
                const settings = await database.get(
                    'SELECT * FROM guild_settings WHERE guild_id = ?',
                    [guildId]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🔐 Verification Status')
                    .addFields(
                        { 
                            name: 'Status', 
                            value: settings?.verification_enabled ? '✅ Enabled' : '❌ Disabled', 
                            inline: true 
                        },
                        { 
                            name: 'Verified Role', 
                            value: settings?.verified_role_id ? `<@&${settings.verified_role_id}>` : 'Not Set', 
                            inline: true 
                        },
                        { 
                            name: 'Verification Channel', 
                            value: settings?.verification_channel_id ? `<#${settings.verification_channel_id}>` : 'Not Set', 
                            inline: true 
                        }
                    )
                    .setColor(0x3498db)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in verification command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing the verification command.')
                .setColor(0xff0000);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};