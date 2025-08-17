const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            // Find welcome/farewell channel
            const farewellChannel = member.guild.channels.cache.find(
                channel => channel.name === config.welcomeChannel
            );

            if (!farewellChannel) {
                logger.warn(`Farewell channel '${config.welcomeChannel}' not found in ${member.guild.name}`);
                return;
            }

            // Create farewell embed
            const farewellEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('👋 Goodbye!')
                .setDescription(`${member.user.username} has left the server`)
                .addFields(
                    { name: '👤 Member Count', value: `We now have ${member.guild.memberCount} members`, inline: true },
                    { name: '📅 Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '⏱️ Time in Server', value: member.joinedAt ? `${Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24))} days` : 'Unknown', inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.user.id}` })
                .setTimestamp();

            // Send farewell message
            await farewellChannel.send({ embeds: [farewellEmbed] });

            // Log to admin channel if configured
            const logChannel = member.guild.channels.cache.find(
                channel => channel.name === config.logChannel
            );

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ffa500')
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
