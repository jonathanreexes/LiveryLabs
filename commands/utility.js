const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const permissionManager = require('../utils/permissions');
const database = require('../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('utility')
        .setDescription('Utility and information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('userinfo')
                .setDescription('Get information about a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to get info about')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('serverinfo')
                .setDescription('Get information about the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Get a user\'s avatar')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to get avatar from')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Check the bot\'s latency'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite')
                .setDescription('Get the bot\'s invite link'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('uptime')
                .setDescription('Check how long the bot has been running'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('weather')
                .setDescription('Get weather information')
                .addStringOption(option =>
                    option.setName('location')
                        .setDescription('The location to get weather for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('translate')
                .setDescription('Translate text to another language')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('The text to translate')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('to')
                        .setDescription('Target language (e.g., es, fr, de)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('customize')
                .setDescription('Customize bot appearance (Admin only)')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('What to customize')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Profile Picture', value: 'avatar' },
                            { name: 'Banner', value: 'banner' },
                            { name: 'Name', value: 'name' }
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New value (URL for images, text for name)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('customizations')
                .setDescription('View bot customization history (Admin only)')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Timeout protection - acknowledge immediately
        const timeoutId = setTimeout(async () => {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply().catch(() => {});
            }
        }, 250);

        try {
            switch (subcommand) {
                case 'userinfo':
                    await handleUserInfo(interaction);
                    break;
                case 'serverinfo':
                    await handleServerInfo(interaction);
                    break;
                case 'avatar':
                    await handleAvatar(interaction);
                    break;
                case 'ping':
                    await handlePing(interaction);
                    break;
                case 'invite':
                    await handleInvite(interaction);
                    break;
                case 'uptime':
                    await handleUptime(interaction);
                    break;
                case 'weather':
                    await handleWeather(interaction);
                    break;
                case 'translate':
                    await handleTranslate(interaction);
                    break;
                case 'customize':
                    await handleCustomize(interaction);
                    break;
                case 'customizations':
                    await handleCustomizations(interaction);
                    break;
            }
            
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error('Error in utility command:', error);
            
            // Fix: Use proper interaction state handling
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ An error occurred while executing the utility command.', 
                        flags: MessageFlags.Ephemeral 
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({ 
                        content: '❌ An error occurred while executing the utility command.' 
                    });
                }
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};

async function handleUserInfo(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    
    if (!member) {
        return interaction.reply({ content: '❌ User not found in this server!', flags: MessageFlags.Ephemeral });
    }

    const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString())
        .slice(0, 10);

    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('👤 User Information')
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: 'Username', value: user.tag, inline: true },
            { name: 'ID', value: user.id, inline: true },
            { name: 'Discriminator', value: `#${user.discriminator}`, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
            { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
            { name: 'Highest Role', value: member.roles.highest.toString(), inline: true },
            { name: 'Status', value: member.presence?.status || 'offline', inline: true },
            { name: 'Boost Status', value: member.premiumSince ? `Boosting since <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>` : 'Not boosting', inline: false }
        )
        .setTimestamp();

    if (roles.length > 0) {
        embed.addFields({ name: `Roles [${member.roles.cache.size - 1}]`, value: roles.join(' ') || 'None', inline: false });
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        embed.addFields({ name: 'Permissions', value: '🔑 Administrator', inline: true });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleServerInfo(interaction) {
    const guild = interaction.guild;
    
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const emojis = guild.emojis.cache;
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🏰 Server Information')
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: 'Server Name', value: guild.name, inline: true },
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Owner', value: owner.user.tag, inline: true },
            { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
            { name: 'Members', value: guild.memberCount.toString(), inline: true },
            { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
            { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
            { name: 'Boost Count', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true },
            { name: 'Verification Level', value: guild.verificationLevel.toString(), inline: true },
            { name: 'Channels', value: `📝 Text: ${channels.filter(c => c.type === 0).size}\n🔊 Voice: ${channels.filter(c => c.type === 2).size}\n📁 Categories: ${channels.filter(c => c.type === 4).size}`, inline: true },
            { name: 'Emojis', value: `Regular: ${emojis.filter(e => !e.animated).size}\nAnimated: ${emojis.filter(e => e.animated).size}`, inline: true }
        )
        .setTimestamp();

    if (guild.description) {
        embed.setDescription(guild.description);
    }

    if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleAvatar(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle(`${user.username}'s Avatar`)
        .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setDescription(`[Download Avatar](${user.displayAvatarURL({ dynamic: true, size: 1024 })})`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handlePing(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🏓 Pong!')
        .addFields(
            { name: 'Roundtrip Latency', value: `${timeDiff}ms`, inline: true },
            { name: 'WebSocket Heartbeat', value: `${interaction.client.ws.ping}ms`, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
}

async function handleInvite(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🤖 Invite Me!')
        .setDescription('Click the link below to invite me to your server!')
        .addFields(
            { name: 'Invite Link', value: `[Click Here](https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands)`, inline: false },
            { name: 'Required Permissions', value: 'Administrator (for full functionality)', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleUptime(interaction) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime % 60);
    
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('⏰ Bot Uptime')
        .setDescription(`I have been running for **${uptimeString}**`)
        .addFields(
            { name: 'Started', value: `<t:${Math.floor((Date.now() - uptime * 1000) / 1000)}:F>`, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleWeather(interaction) {
    const location = interaction.options.getString('location');
    
    // This would require a weather API key (OpenWeatherMap, etc.)
    // For now, we'll show a placeholder implementation
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🌤️ Weather Information')
        .setDescription(`Weather for **${location}**`)
        .addFields(
            { name: 'Note', value: 'Weather feature requires API configuration. Please contact the bot administrator.', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleTranslate(interaction) {
    const text = interaction.options.getString('text');
    const targetLang = interaction.options.getString('to');
    
    // This would require a translation API (Google Translate, etc.)
    // For now, we'll show a placeholder implementation
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🌐 Translation')
        .addFields(
            { name: 'Original Text', value: text, inline: false },
            { name: 'Target Language', value: targetLang.toUpperCase(), inline: true },
            { name: 'Note', value: 'Translation feature requires API configuration. Please contact the bot administrator.', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCustomize(interaction) {
    const member = interaction.member;
    
    // Check if user has administrator permissions
    if (!permissionManager.hasPermissionLevel(member, permissionManager.permissionLevels.ADMIN)) {
        return interaction.reply({ 
            content: '❌ You need administrator permissions to customize the bot!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const type = interaction.options.getString('type');
    const value = interaction.options.getString('value');

    await interaction.deferReply();

    try {
        switch (type) {
            case 'avatar':
                await updateBotAvatar(interaction, value);
                break;
            case 'banner':
                await updateBotBanner(interaction, value);
                break;
            case 'name':
                await updateBotName(interaction, value);
                break;
        }
    } catch (error) {
        logger.error('Error in bot customization:', error);
        await interaction.editReply({ 
            content: '❌ Failed to update bot appearance. Please check if the provided URL is valid or if the name meets Discord requirements.' 
        });
    }
}

async function updateBotAvatar(interaction, avatarUrl) {
    try {
        // Validate URL
        const urlPattern = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i;
        if (!urlPattern.test(avatarUrl)) {
            return interaction.editReply({ 
                content: '❌ Invalid image URL! Please provide a direct link to an image file (jpg, png, gif, webp).' 
            });
        }

        // Update bot avatar
        await interaction.client.user.setAvatar(avatarUrl);
        
        // Store in database for future reference
        await saveBotCustomization('avatar', avatarUrl, interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('✅ Avatar Updated')
            .setDescription('Bot profile picture has been successfully updated!')
            .setImage(avatarUrl)
            .addFields({ name: 'Updated by', value: interaction.user.tag, inline: true })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Bot avatar updated by ${interaction.user.tag} to: ${avatarUrl}`);
    } catch (error) {
        logger.error('Error updating bot avatar:', error);
        throw error;
    }
}

async function updateBotBanner(interaction, bannerUrl) {
    try {
        // Validate URL
        const urlPattern = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i;
        if (!urlPattern.test(bannerUrl)) {
            return interaction.editReply({ 
                content: '❌ Invalid image URL! Please provide a direct link to an image file (jpg, png, gif, webp).' 
            });
        }

        // Update bot banner (requires Discord Premium for bots)
        await interaction.client.user.setBanner(bannerUrl);
        
        // Store in database for future reference
        await saveBotCustomization('banner', bannerUrl, interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('✅ Banner Updated')
            .setDescription('Bot banner has been successfully updated!')
            .setImage(bannerUrl)
            .addFields({ name: 'Updated by', value: interaction.user.tag, inline: true })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Bot banner updated by ${interaction.user.tag} to: ${bannerUrl}`);
    } catch (error) {
        if (error.code === 50013) {
            await interaction.editReply({ 
                content: '❌ Bot banner update requires Discord Premium subscription for bots.' 
            });
        } else {
            logger.error('Error updating bot banner:', error);
            throw error;
        }
    }
}

async function updateBotName(interaction, newName) {
    try {
        // Validate name length (Discord requirements)
        if (newName.length < 2 || newName.length > 32) {
            return interaction.editReply({ 
                content: '❌ Bot name must be between 2 and 32 characters long!' 
            });
        }

        // Store old name for logging
        const oldName = interaction.client.user.username;
        
        // Update bot name
        await interaction.client.user.setUsername(newName);
        
        // Store in database for future reference
        await saveBotCustomization('name', newName, interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('✅ Name Updated')
            .setDescription(`Bot name has been successfully updated!`)
            .addFields(
                { name: 'Old Name', value: oldName, inline: true },
                { name: 'New Name', value: newName, inline: true },
                { name: 'Updated by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Bot name updated by ${interaction.user.tag} from "${oldName}" to "${newName}"`);
    } catch (error) {
        if (error.code === 50035) {
            await interaction.editReply({ 
                content: '❌ Invalid username! Make sure it meets Discord requirements (no excessive special characters).' 
            });
        } else if (error.code === 50013) {
            await interaction.editReply({ 
                content: '❌ Rate limited! You can only change the bot name twice per hour.' 
            });
        } else {
            logger.error('Error updating bot name:', error);
            throw error;
        }
    }
}

async function saveBotCustomization(type, value, updatedBy) {
    try {
        const query = `
            INSERT OR REPLACE INTO bot_customizations 
            (customization_type, customization_value, updated_by, updated_at) 
            VALUES (?, ?, ?, datetime('now'))
        `;
        
        await new Promise((resolve, reject) => {
            database.db.run(query, [type, value, updatedBy], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    } catch (error) {
        logger.error('Error saving bot customization to database:', error);
    }
}

async function handleCustomizations(interaction) {
    const member = interaction.member;
    
    // Check if user has administrator permissions
    if (!permissionManager.hasPermissionLevel(member, permissionManager.permissionLevels.ADMIN)) {
        return interaction.reply({ 
            content: '❌ You need administrator permissions to view bot customization history!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    try {
        // Get customization history from database
        const customizations = await new Promise((resolve, reject) => {
            database.db.all(
                'SELECT * FROM bot_customizations ORDER BY updated_at DESC',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('🎨 Bot Customization History')
            .setTimestamp();

        if (customizations.length === 0) {
            embed.setDescription('No customizations have been made yet.');
        } else {
            let description = '';
            
            for (const custom of customizations) {
                const user = await interaction.client.users.fetch(custom.updated_by).catch(() => null);
                const userName = user ? user.tag : 'Unknown User';
                
                let emoji = '🖼️';
                if (custom.customization_type === 'name') emoji = '📝';
                else if (custom.customization_type === 'banner') emoji = '🎨';
                
                description += `${emoji} **${custom.customization_type.charAt(0).toUpperCase() + custom.customization_type.slice(1)}**\n`;
                
                if (custom.customization_type === 'name') {
                    description += `Value: ${custom.customization_value}\n`;
                } else {
                    description += `[View Image](${custom.customization_value})\n`;
                }
                
                description += `Updated by: ${userName}\n`;
                description += `Date: <t:${Math.floor(new Date(custom.updated_at).getTime() / 1000)}:F>\n\n`;
            }
            
            embed.setDescription(description);
        }

        // Add current bot info
        embed.addFields(
            { 
                name: 'Current Bot Info', 
                value: `**Name:** ${interaction.client.user.username}\n**ID:** ${interaction.client.user.id}`, 
                inline: false 
            }
        );

        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        logger.error('Error fetching customization history:', error);
        await interaction.reply({ 
            content: '❌ Failed to retrieve customization history.', 
            flags: MessageFlags.Ephemeral 
        });
    }
}
