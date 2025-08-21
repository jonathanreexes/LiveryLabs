const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure welcome and leave messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up welcome and leave messages')
                .addChannelOption(option =>
                    option.setName('welcome_channel')
                        .setDescription('Channel for welcome messages')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
                .addChannelOption(option =>
                    option.setName('leave_channel')
                        .setDescription('Channel for leave messages (optional - uses welcome channel if not set)')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText))
                .addStringOption(option =>
                    option.setName('welcome_title')
                        .setDescription('Custom welcome message title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('welcome_message')
                        .setDescription('Custom welcome message (use {user}, {username}, \\n, • for bullets)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('leave_title')
                        .setDescription('Custom leave message title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('leave_message')
                        .setDescription('Custom leave message (use {username}, \\n, • for bullets)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('welcome_color')
                        .setDescription('Welcome embed color: preset name (blue/green/red/purple/orange/yellow/pink) or hex (#FF5733)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('leave_color')
                        .setDescription('Leave embed color: preset name (blue/green/red/purple/orange/yellow/pink) or hex (#FF5733)')
                        .setRequired(false))
                .addAttachmentOption(option =>
                    option.setName('welcome_image')
                        .setDescription('Image to display in welcome embeds')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('welcome_image_position')
                        .setDescription('Where to place welcome image')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Top (Thumbnail)', value: 'thumbnail' },
                            { name: 'Bottom (Large Image)', value: 'image' },
                            { name: 'Author Icon', value: 'author' }
                        ))
                .addAttachmentOption(option =>
                    option.setName('leave_image')
                        .setDescription('Image to display in leave embeds')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('leave_image_position')
                        .setDescription('Where to place leave image')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Top (Thumbnail)', value: 'thumbnail' },
                            { name: 'Bottom (Large Image)', value: 'image' },
                            { name: 'Author Icon', value: 'author' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable welcome/leave messages')
                .addStringOption(option =>
                    option.setName('feature')
                        .setDescription('Which feature to toggle')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Welcome Messages', value: 'welcome' },
                            { name: 'Leave Messages', value: 'leave' },
                            { name: 'Both', value: 'both' }
                        ))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test welcome/leave messages')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Which message to test')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Welcome Message', value: 'welcome' },
                            { name: 'Leave Message', value: 'leave' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check welcome/leave message settings'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'setup') {
                const welcomeChannel = interaction.options.getChannel('welcome_channel');
                const leaveChannel = interaction.options.getChannel('leave_channel') || welcomeChannel;
                const welcomeTitle = interaction.options.getString('welcome_title');
                const welcomeMessage = interaction.options.getString('welcome_message');
                const leaveTitle = interaction.options.getString('leave_title');
                const leaveMessage = interaction.options.getString('leave_message');
                const welcomeColorChoice = interaction.options.getString('welcome_color');
                const leaveColorChoice = interaction.options.getString('leave_color');
                const welcomeImage = interaction.options.getAttachment('welcome_image');
                const welcomeImagePosition = interaction.options.getString('welcome_image_position') || 'image';
                const leaveImage = interaction.options.getAttachment('leave_image');
                const leaveImagePosition = interaction.options.getString('leave_image_position') || 'image';

                // Process colors
                let welcomeColor = 0xD3D3D3; // Default light gray
                let leaveColor = 0xD3D3D3; // Default light gray

                if (welcomeColorChoice) {
                    const processedColor = processColor(welcomeColorChoice);
                    if (processedColor.error) {
                        return await interaction.reply({ 
                            content: `❌ Invalid welcome color! ${processedColor.error}`, 
                            ephemeral: true 
                        });
                    }
                    welcomeColor = processedColor.color;
                }

                if (leaveColorChoice) {
                    const processedColor = processColor(leaveColorChoice);
                    if (processedColor.error) {
                        return await interaction.reply({ 
                            content: `❌ Invalid leave color! ${processedColor.error}`, 
                            ephemeral: true 
                        });
                    }
                    leaveColor = processedColor.color;
                }

                // Validate images
                let welcomeImageUrl = null;
                let leaveImageUrl = null;

                if (welcomeImage) {
                    const validation = validateImage(welcomeImage);
                    if (validation.error) {
                        return await interaction.reply({
                            content: `❌ Invalid welcome image: ${validation.error}`,
                            ephemeral: true
                        });
                    }
                    welcomeImageUrl = welcomeImage.url;
                }

                if (leaveImage) {
                    const validation = validateImage(leaveImage);
                    if (validation.error) {
                        return await interaction.reply({
                            content: `❌ Invalid leave image: ${validation.error}`,
                            ephemeral: true
                        });
                    }
                    leaveImageUrl = leaveImage.url;
                }

                // Store settings in database
                await database.run(
                    `INSERT OR REPLACE INTO guild_settings 
                     (guild_id, welcome_enabled, leave_enabled, welcome_channel_id, leave_channel_id, welcome_title, welcome_message, leave_title, leave_message, welcome_color, leave_color, welcome_image_url, leave_image_url, welcome_image_position, leave_image_position) 
                     VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [guildId, welcomeChannel.id, leaveChannel.id, welcomeTitle, welcomeMessage, leaveTitle, leaveMessage, welcomeColor, leaveColor, welcomeImageUrl, leaveImageUrl, welcomeImagePosition, leaveImagePosition]
                );

                const embed = new EmbedBuilder()
                    .setTitle('✅ Welcome/Leave Messages Configured')
                    .setDescription(`Welcome and leave messages have been configured!`)
                    .addFields(
                        { name: '📥 Welcome Channel', value: `${welcomeChannel}`, inline: true },
                        { name: '📤 Leave Channel', value: `${leaveChannel}`, inline: true },
                        { name: '📝 Welcome Title', value: welcomeTitle || 'Default: 🎉 Welcome to the server!', inline: true },
                        { name: '📝 Leave Title', value: leaveTitle || 'Default: 👋 Goodbye!', inline: true },
                        { name: '🎨 Colors', value: `Welcome: #${welcomeColor.toString(16).padStart(6, '0')}\nLeave: #${leaveColor.toString(16).padStart(6, '0')}`, inline: false },
                        { name: '🖼️ Images', value: `Welcome: ${welcomeImageUrl ? '✅ Custom' : '❌ None'}\nLeave: ${leaveImageUrl ? '✅ Custom' : '❌ None'}`, inline: true }
                    )
                    .setColor(0xD3D3D3)

                await interaction.reply({ embeds: [embed] });
                logger.info(`Welcome/leave messages configured in guild ${guildId} by ${interaction.user.tag}`);

            } else if (subcommand === 'toggle') {
                const feature = interaction.options.getString('feature');
                const action = interaction.options.getString('action');
                const enabled = action === 'enable';

                let updateQuery = '';
                let params = [];

                if (feature === 'welcome') {
                    updateQuery = `INSERT OR REPLACE INTO guild_settings (guild_id, welcome_enabled) VALUES (?, ?)`;
                    params = [guildId, enabled ? 1 : 0];
                } else if (feature === 'leave') {
                    updateQuery = `INSERT OR REPLACE INTO guild_settings (guild_id, leave_enabled) VALUES (?, ?)`;
                    params = [guildId, enabled ? 1 : 0];
                } else if (feature === 'both') {
                    updateQuery = `INSERT OR REPLACE INTO guild_settings (guild_id, welcome_enabled, leave_enabled) VALUES (?, ?, ?)`;
                    params = [guildId, enabled ? 1 : 0, enabled ? 1 : 0];
                }

                await database.run(updateQuery, params);

                const embed = new EmbedBuilder()
                    .setTitle('🔄 Settings Updated')
                    .setDescription(`${feature.charAt(0).toUpperCase() + feature.slice(1)} messages have been **${enabled ? 'enabled' : 'disabled'}**`)
                    .setColor(0xD3D3D3)

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'test') {
                const type = interaction.options.getString('type');
                
                if (type === 'welcome') {
                    await testWelcomeMessage(interaction);
                } else {
                    await testLeaveMessage(interaction);
                }

            } else if (subcommand === 'status') {
                const settings = await database.get(
                    'SELECT * FROM guild_settings WHERE guild_id = ?',
                    [guildId]
                );

                const embed = new EmbedBuilder()
                    .setTitle('📊 Welcome/Leave Status')
                    .setColor(0xD3D3D3)

                if (!settings) {
                    embed.setDescription('❌ Welcome/leave messages are not configured. Use `/welcome setup` to get started.');
                } else {
                    const welcomeChannel = interaction.guild.channels.cache.get(settings.welcome_channel_id);
                    const leaveChannel = interaction.guild.channels.cache.get(settings.leave_channel_id || settings.welcome_channel_id);
                    embed.setDescription('Current welcome/leave message settings:')
                        .addFields(
                            { name: '📥 Welcome Messages', value: settings.welcome_enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: '📤 Leave Messages', value: settings.leave_enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: '📺 Welcome Channel', value: welcomeChannel ? `${welcomeChannel}` : '❌ Not set', inline: true },
                            { name: '📺 Leave Channel', value: leaveChannel ? `${leaveChannel}` : '❌ Not set', inline: true },
                            { name: '🎨 Welcome Color', value: settings.welcome_color ? `#${settings.welcome_color.toString(16).padStart(6, '0')}` : 'Default', inline: true },
                            { name: '🎨 Leave Color', value: settings.leave_color ? `#${settings.leave_color.toString(16).padStart(6, '0')}` : 'Default', inline: true },
                            { name: '🖼️ Images', value: `Welcome: ${settings.welcome_image_url ? '✅' : '❌'} | Leave: ${settings.leave_image_url ? '✅' : '❌'}`, inline: true }
                        );
                }

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in welcome command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing the welcome command.', 
                ephemeral: true 
            });
        }
    }
};

function processColor(colorChoice) {
    if (colorChoice.startsWith('#')) {
        const hexValue = colorChoice.slice(1);
        if (/^[0-9A-Fa-f]{6}$/.test(hexValue)) {
            return { color: parseInt(hexValue, 16) };
        } else {
            return { error: 'Use format #FF5733' };
        }
    } else {
        const colors = {
            'blue': 0x5865F2,
            'green': 0x57F287,
            'red': 0xED4245,
            'purple': 0x9B59B6,
            'orange': 0xE67E22,
            'yellow': 0xF1C40F,
            'pink': 0xE91E63
        };
        
        if (colors[colorChoice.toLowerCase()]) {
            return { color: colors[colorChoice.toLowerCase()] };
        } else {
            return { error: 'Use: blue, green, red, purple, orange, yellow, pink, or hex code (#FF5733)' };
        }
    }
}

function validateImage(attachment) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 8 * 1024 * 1024; // 8MB
    
    if (!validTypes.includes(attachment.contentType)) {
        return { error: 'Please upload a valid image (JPG, PNG, GIF, WebP)' };
    }
    
    if (attachment.size > maxSize) {
        return { error: 'Image must be under 8MB' };
    }
    
    return { success: true };
}

async function testWelcomeMessage(interaction) {
    // Create a test welcome message using current settings
    const settings = await database.get(
        'SELECT * FROM guild_settings WHERE guild_id = ?',
        [interaction.guild.id]
    );

    const welcomeTitle = settings?.welcome_title || '🎉 Welcome to the server!';
    const welcomeMessage = settings?.welcome_message || 'Welcome {user}, we\'re glad to have you here!';
    const welcomeColor = settings?.welcome_color || 0x00ff00;
    const welcomeImageUrl = settings?.welcome_image_url;

    const processedMessage = welcomeMessage.replace('{user}', `${interaction.user}`).replace('{username}', interaction.user.username);

    const embed = new EmbedBuilder()
        .setTitle(welcomeTitle)
        .setDescription(processedMessage)
        .setColor(welcomeColor)
        .addFields(
            { name: '👤 Member Count', value: `You are member #${interaction.guild.memberCount}`, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `🧪 Test Message • ID: ${interaction.user.id}` });

    if (welcomeImageUrl) {
        embed.setImage(welcomeImageUrl);
    }

    await interaction.reply({ 
        content: '🧪 **Test Welcome Message:**',
        embeds: [embed],
        ephemeral: true 
    });
}

async function testLeaveMessage(interaction) {
    // Create a test leave message using current settings
    const settings = await database.get(
        'SELECT * FROM guild_settings WHERE guild_id = ?',
        [interaction.guild.id]
    );

    const leaveTitle = settings?.leave_title || '👋 Goodbye!';
    const leaveMessage = settings?.leave_message || '{username} has left the server';
    const leaveColor = settings?.leave_color || 0xff6b6b;
    const leaveImageUrl = settings?.leave_image_url;

    const processedMessage = leaveMessage.replace('{username}', interaction.user.username);

    const embed = new EmbedBuilder()
        .setTitle(leaveTitle)
        .setDescription(processedMessage)
        .setColor(leaveColor)
        .addFields(
            { name: '👤 Member Count', value: `We now have ${interaction.guild.memberCount} members`, inline: true },
            { name: '📅 Joined Server', value: `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:R>`, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `🧪 Test Message • ID: ${interaction.user.id}` });

    if (leaveImageUrl) {
        embed.setImage(leaveImageUrl);
    }

    await interaction.reply({ 
        content: '🧪 **Test Leave Message:**',
        embeds: [embed],
        ephemeral: true 
    });
}