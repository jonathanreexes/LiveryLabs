const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Find welcome channel
            const welcomeChannel = member.guild.channels.cache.find(
                channel => channel.name === config.welcomeChannel
            );

            if (!welcomeChannel) {
                logger.warn(`Welcome channel '${config.welcomeChannel}' not found in ${member.guild.name}`);
                return;
            }

            // Create welcome embed
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Welcome to the server!')
                .setDescription(`Welcome ${member}, we're glad to have you here!`)
                .addFields(
                    { name: '👤 Member Count', value: `You are member #${member.guild.memberCount}`, inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📋 Quick Tips', value: '• Read the server rules\n• Check out the channels\n• Say hello in chat!', inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.user.id}` })
                .setTimestamp();

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
                    .setColor('#4285f4')
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
