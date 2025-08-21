const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const database = require('../database/database');
const { formatMessage } = require('../utils/messageFormatter');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            // Get leave settings from database
            const settings = await database.get(
                'SELECT * FROM guild_settings WHERE guild_id = ? AND leave_enabled = 1',
                [member.guild.id]
            );

            if (!settings) {
                logger.debug(`Leave messages not configured or disabled in ${member.guild.name}`);
                return;
            }

            // Use separate leave channel if configured, otherwise fallback to welcome channel
            const leaveChannelId = settings.leave_channel_id || settings.welcome_channel_id;
            if (!leaveChannelId) {
                logger.debug(`No leave channel configured in ${member.guild.name}`);
                return;
            }

            const farewellChannel = member.guild.channels.cache.get(leaveChannelId);
            if (!farewellChannel) {
                logger.warn(`Leave channel not found in ${member.guild.name}`);
                return;
            }

            // Use custom settings or defaults
            const leaveTitle = settings.leave_title || '👋 Goodbye!';
            const leaveMessage = settings.leave_message || '{username} has left the server';
            const leaveColor = settings.leave_color || 0xD3D3D3;
            const leaveImageUrl = settings.leave_image_url;
            const leaveImagePosition = settings.leave_image_position || 'image';

            // Process message placeholders and line breaks
            const processedMessage = formatMessage(leaveMessage)
                .replace('{username}', member.user.username);

            // Create farewell embed
            const farewellEmbed = new EmbedBuilder()
                .setColor(leaveColor)
                .setTitle(leaveTitle)
                .setDescription(processedMessage)
                .addFields(
                    { name: '👤 Member Count', value: `We now have ${member.guild.memberCount} members`, inline: true },
                    { name: '📅 Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '⏱️ Time in Server', value: member.joinedAt ? `${Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24))} days` : 'Unknown', inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.user.id}` });

            // Add custom image if configured
            if (leaveImageUrl) {
                switch (leaveImagePosition) {
                    case 'thumbnail':
                        farewellEmbed.setThumbnail(leaveImageUrl);
                        // Move user avatar to author icon
                        farewellEmbed.setAuthor({ 
                            name: member.user.username, 
                            iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                        });
                        break;
                    case 'author':
                        farewellEmbed.setAuthor({ 
                            name: member.user.username, 
                            iconURL: leaveImageUrl 
                        });
                        break;
                    case 'image':
                    default:
                        farewellEmbed.setImage(leaveImageUrl);
                        break;
                }
            }

            // Send farewell message
            await farewellChannel.send({ embeds: [farewellEmbed] });

            // Log to admin channel if configured
            const logChannel = member.guild.channels.cache.find(
                channel => channel.name === config.logChannel
            );

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xD3D3D3)
                    .setTitle('📤 Member Left')
                    .setDescription(`${member.user.tag} (${member.user.id}) left the server`)
                    .addFields(
                        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown', inline: true },
                        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None', inline: false }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            logger.info(`Member left: ${member.user.tag} from ${member.guild.name}`);
        } catch (error) {
            logger.error('Error in guildMemberRemove event:', error);
        }
    }
};
