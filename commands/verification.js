const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');
const { formatMessage } = require('../utils/messageFormatter');

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
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Custom verification message (use \\n for line breaks, • for bullets)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Custom verification title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('success_title')
                        .setDescription('Custom success message title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('success_message')
                        .setDescription('Custom success message text (use \\n for line breaks, • for bullets)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Border color: preset name (blue/green/red/purple/orange/yellow/pink) or hex code (#FF5733)')
                        .setRequired(false))
                .addAttachmentOption(option =>
                    option.setName('image')
                        .setDescription('Image to display in the verification embed')
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'setup') {
                let verifiedRole = interaction.options.getRole('verified_role');
                const customMessage = interaction.options.getString('message');
                const customTitle = interaction.options.getString('title');
                const successTitle = interaction.options.getString('success_title');
                const successMessage = interaction.options.getString('success_message');
                const colorChoice = interaction.options.getString('color');
                const imageAttachment = interaction.options.getAttachment('image');
                const verificationChannel = interaction.channel;

                // Color processing - support both presets and hex codes
                let embedColor = 0xD3D3D3; // Default light gray
                
                if (colorChoice) {
                    // Check if it's a hex color code
                    if (colorChoice.startsWith('#')) {
                        const hexValue = colorChoice.slice(1);
                        if (/^[0-9A-Fa-f]{6}$/.test(hexValue)) {
                            embedColor = parseInt(hexValue, 16);
                        } else {
                            return await interaction.reply({ 
                                content: '❌ Invalid hex color code! Use format #FF5733', 
                                ephemeral: true 
                            });
                        }
                    } else {
                        // Preset color names
                        const colors = {
                            'blue': 0x5865F2,      // Discord blurple
                            'green': 0x57F287,     // Green
                            'red': 0xED4245,       // Red  
                            'purple': 0x9B59B6,    // Purple
                            'orange': 0xE67E22,    // Orange
                            'yellow': 0xF1C40F,    // Yellow
                            'pink': 0xE91E63,      // Pink
                            'gray': 0xD3D3D3       // Light gray
                        };
                        
                        if (colors[colorChoice.toLowerCase()]) {
                            embedColor = colors[colorChoice.toLowerCase()];
                        } else {
                            return await interaction.reply({ 
                                content: '❌ Invalid color! Use: blue, green, red, purple, orange, yellow, pink, or hex code (#FF5733)', 
                                ephemeral: true 
                            });
                        }
                    }
                }

                // Validate image attachment if provided
                let verificationImageUrl = null;
                if (imageAttachment) {
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                    const maxSize = 8 * 1024 * 1024; // 8MB
                    
                    if (!validTypes.includes(imageAttachment.contentType) || imageAttachment.size > maxSize) {
                        return await interaction.reply({
                            content: '❌ Invalid image file. Please upload a valid image (jpg, jpeg, png, gif, webp) under 8MB.',
                            ephemeral: true
                        });
                    }
                    
                    verificationImageUrl = imageAttachment.url;
                }

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

                // Store verification settings including all customizations
                await database.run(
                    `INSERT OR REPLACE INTO guild_settings 
                     (guild_id, verification_enabled, verified_role_id, verification_channel_id, verification_color, verification_title, success_title, success_message, verification_image_url) 
                     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
                    [guildId, verifiedRole.id, verificationChannel.id, embedColor, customTitle, successTitle, successMessage, verificationImageUrl]
                );

                // Create verification message
                const defaultMessage = 'Welcome to our server! Please click the button below to verify yourself and gain access to all channels and features.';
                const defaultTitle = '🔐 Server Verification';
                const description = formatMessage(customMessage || defaultMessage);
                const title = customTitle || defaultTitle;
                
                const verifyEmbed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(embedColor);

                // Add image if provided
                if (verificationImageUrl) {
                    verifyEmbed.setImage(verificationImageUrl);
                }

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
                    .setDescription(`Single-step verification system configured!\n\n**Verified Role:** ${verifiedRole}\n**Channel:** ${verificationChannel}\n\n*New users will click verify and gain immediate access to your server.*`)
                    .setColor(0x00ff00);

                await interaction.reply({ embeds: [embed] });
                logger.info(`Verification setup completed in guild ${guildId}`);

            } else if (subcommand === 'toggle') {
                const action = interaction.options.getString('action');
                const enabled = action === 'enable';

                await database.run(
                    `INSERT OR REPLACE INTO guild_settings (guild_id, verification_enabled) 
                     VALUES (?, ?)`,
                    [guildId, enabled ? 1 : 0]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🔐 Verification System')
                    .setDescription(`Verification has been **${enabled ? 'enabled' : 'disabled'}**`)
                    .setColor(enabled ? 0x00ff00 : 0xff0000);

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
                    .setColor(0x00ff00);

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
                    .setColor(0x3498db);

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