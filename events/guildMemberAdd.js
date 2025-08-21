const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const database = require('../database/database');
const { formatMessage } = require('../utils/messageFormatter');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Get welcome settings from database
            const settings = await database.get(
                'SELECT * FROM guild_settings WHERE guild_id = ? AND welcome_enabled = 1',
                [member.guild.id]
            );

            if (!settings || !settings.welcome_channel_id) {
                logger.debug(`Welcome messages not configured or disabled in ${member.guild.name}`);
                return;
            }

            const welcomeChannel = member.guild.channels.cache.get(settings.welcome_channel_id);
            if (!welcomeChannel) {
                logger.warn(`Welcome channel not found in ${member.guild.name}`);
                return;
            }

            // Use custom settings or defaults
            const welcomeTitle = settings.welcome_title || '🎉 Welcome to the server!';
            const welcomeMessage = settings.welcome_message || 'Welcome {user}, we\'re glad to have you here!';
            const welcomeColor = settings.welcome_color || 0xD3D3D3;
            const welcomeImageUrl = settings.welcome_image_url;
            const welcomeImagePosition = settings.welcome_image_position || 'image';

            // Process message placeholders and line breaks
            const processedMessage = formatMessage(welcomeMessage)
                .replace('{user}', `${member}`)
                .replace('{username}', member.user.username);

            // Create welcome embed
            const welcomeEmbed = new EmbedBuilder()
                .setColor(welcomeColor)
                .setTitle(welcomeTitle)
                .setDescription(processedMessage)
                .addFields(
                    { name: '👤 Member Count', value: `You are member #${member.guild.memberCount}`, inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📋 Quick Tips', value: '• Read the server rules\n• Check out the channels\n• Say hello in chat!', inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.user.id}` });

            // Add custom image if configured
            if (welcomeImageUrl) {
                switch (welcomeImagePosition) {
                    case 'thumbnail':
                        welcomeEmbed.setThumbnail(welcomeImageUrl);
                        // Move user avatar to author icon
                        welcomeEmbed.setAuthor({ 
                            name: member.user.username, 
                            iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                        });
                        break;
                    case 'author':
                        welcomeEmbed.setAuthor({ 
                            name: member.user.username, 
                            iconURL: welcomeImageUrl 
                        });
                        break;
                    case 'image':
                    default:
                        welcomeEmbed.setImage(welcomeImageUrl);
                        break;
                }
            }

            // Send welcome message
            await welcomeChannel.send({ 
                content: `${member}`, 
                embeds: [welcomeEmbed] 
            });

            // Auto-assign default role if configured
            const defaultRole = member.guild.roles.cache.find(role => role.name === 'Member');
            if (defaultRole && defaultRole.position < member.guild.members.me.roles.highest.position) {
                try {
                    await member.roles.add(defaultRole);
                    logger.info(`Auto-assigned default role to ${member.user.tag} in ${member.guild.name}`);
                } catch (error) {
                    logger.error(`Failed to auto-assign role to ${member.user.tag}:`, error);
                }
            }

            // Send DM with server info (optional)
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xD3D3D3)
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription('Here are some helpful commands to get you started:')
                    .addFields(
                        { name: '🤖 Bot Commands', value: 'Type `/help` to see all available commands', inline: false },
                        { name: '🎵 Music', value: 'Use `/music play` to play music in voice channels', inline: false },
                        { name: '🎮 Games', value: 'Try `/games` for fun activities and entertainment', inline: false },
                        { name: '🎫 Support', value: 'Use `/ticket create` if you need help from staff', inline: false }
                    )
                    .setThumbnail(member.guild.iconURL({ dynamic: true }))
                    .setTimestamp();

                await member.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                logger.debug(`Could not send DM to ${member.user.tag}: ${error.message}`);
            }

            logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);
        } catch (error) {
            logger.error('Error in guildMemberAdd event:', error);
        }
    }
};
