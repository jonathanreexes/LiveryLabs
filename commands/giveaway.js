const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');
const { formatMessage } = require('../utils/messageFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage server giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What prize to give away')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes (minimum 1, maximum 10080 - 1 week)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10080))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners to select')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addStringOption(option =>
                    option.setName('requirements')
                        .setDescription('Requirements to enter (use \\n, • for bullets)')
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to host the giveaway (defaults to current)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Custom title for the giveaway (optional)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Custom giveaway message (use \\n, • for bullets)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('banner')
                        .setDescription('Banner image URL for the giveaway (optional)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Hex color code for embed (e.g., #FF5733 or ff5733)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('ID of the giveaway message to end')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll winners for a giveaway')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('ID of the giveaway message to reroll')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of new winners to select')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Timeout protection - acknowledge immediately
        const timeoutId = setTimeout(async () => {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply().catch(() => {});
            }
        }, 250);

        try {
            if (subcommand === 'create') {
                await this.createGiveaway(interaction);
            } else if (subcommand === 'end') {
                await this.endGiveaway(interaction);
            } else if (subcommand === 'reroll') {
                await this.rerollGiveaway(interaction);
            } else if (subcommand === 'list') {
                await this.listGiveaways(interaction);
            }
            
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error('Error in giveaway command:', error);
            
            const errorMessage = '❌ An error occurred while processing the giveaway command.';
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                } else {
                    await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
                }
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    },

    async createGiveaway(interaction) {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winners = interaction.options.getInteger('winners') || 1;
        const requirements = interaction.options.getString('requirements');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const customTitle = interaction.options.getString('title');
        const customMessage = interaction.options.getString('message');
        const bannerUrl = interaction.options.getString('banner');
        const colorInput = interaction.options.getString('color');

        // Validate channel type
        if (channel.type !== 0) { // 0 = GUILD_TEXT
            return await interaction.reply({
                content: '❌ Giveaways can only be created in text channels.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Check bot permissions in target channel
        const botMember = interaction.guild.members.me;
        const channelPermissions = channel.permissionsFor(botMember);
        
        if (!channelPermissions.has(['SendMessages', 'EmbedLinks', 'AddReactions'])) {
            return await interaction.reply({
                content: '❌ I need Send Messages, Embed Links, and Add Reactions permissions in that channel.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Validate and parse color
        let embedColor = 0xD3D3D3; // Default light gray
        if (colorInput) {
            const cleanColor = colorInput.replace('#', '');
            if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
                embedColor = parseInt(cleanColor, 16);
            } else {
                return await interaction.reply({
                    content: '❌ Invalid color format. Please use hex format like #FF5733 or FF5733.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // Validate banner URL if provided
        if (bannerUrl && !this.isValidImageUrl(bannerUrl)) {
            return await interaction.reply({
                content: '❌ Invalid banner URL. Please provide a valid image URL (jpg, jpeg, png, gif, webp).',
                flags: MessageFlags.Ephemeral
            });
        }

        // Calculate end time
        const endTime = new Date(Date.now() + duration * 60 * 1000);
        const endTimestamp = Math.floor(endTime.getTime() / 1000);

        // Build description
        let description;
        if (customMessage) {
            description = formatMessage(customMessage);
            description += `\n\n**Prize:** ${prize}`;
            description += `\n**Winners:** ${winners}`;
            description += `\n**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)`;
            if (requirements) description += `\n**Requirements:** ${formatMessage(requirements)}`;
            description += `\n\n**How to enter:** Click the 🎉 button below!`;
        } else {
            description = `**Prize:** ${prize}\n\n**Winners:** ${winners}\n**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)${requirements ? `\n**Requirements:** ${formatMessage(requirements)}` : ''}\n\n**How to enter:** Click the 🎉 button below!`;
        }

        // Create giveaway embed
        const giveawayEmbed = new EmbedBuilder()
            .setTitle(customTitle || '🎉 GIVEAWAY 🎉')
            .setDescription(description)
            .setColor(embedColor)
            .setFooter({ text: `${winners} winner${winners > 1 ? 's' : ''} | Ends` })
            .setTimestamp(endTime);

        // Add banner if provided
        if (bannerUrl) {
            giveawayEmbed.setImage(bannerUrl);
        }

        // Create enter button
        const enterButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_giveaway')
                    .setLabel('Enter Giveaway')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎉')
            );

        // Send giveaway message
        const giveawayMessage = await channel.send({
            embeds: [giveawayEmbed],
            components: [enterButton]
        });

        // Store giveaway in database with customization data
        await database.run(
            `INSERT INTO giveaways (message_id, guild_id, channel_id, host_id, prize, winners_count, end_time, requirements, active, custom_title, custom_message, banner_url, embed_color)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
            [giveawayMessage.id, interaction.guild.id, channel.id, interaction.user.id, prize, winners, endTime.toISOString(), requirements, customTitle, customMessage, bannerUrl, embedColor]
        );

        // Schedule giveaway end
        setTimeout(() => {
            this.endGiveawayAutomatically(giveawayMessage.id, interaction.guild.id);
        }, duration * 60 * 1000);

        const confirmEmbed = new EmbedBuilder()
            .setTitle('✅ Giveaway Created')
            .setDescription(`Giveaway for **${prize}** has been created in ${channel}!\n\nIt will end <t:${endTimestamp}:R>.`)
            .setColor(0xD3D3D3)
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });
        logger.info(`Giveaway created by ${interaction.user.tag} in ${interaction.guild.name}: ${prize}`);
    },

    async endGiveaway(interaction) {
        const giveawayId = interaction.options.getString('giveaway_id');

        // Get giveaway from database
        const giveaway = await database.get(
            'SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ? AND active = 1',
            [giveawayId, interaction.guild.id]
        );

        if (!giveaway) {
            return await interaction.reply({
                content: '❌ No active giveaway found with that ID.',
                flags: MessageFlags.Ephemeral
            });
        }

        await this.endGiveawayProcess(interaction.guild, giveaway);

        await interaction.reply({
            content: '✅ Giveaway has been ended and winners have been selected!',
            flags: MessageFlags.Ephemeral
        });
    },

    async rerollGiveaway(interaction) {
        const giveawayId = interaction.options.getString('giveaway_id');
        const newWinnerCount = interaction.options.getInteger('winners');

        // Get giveaway from database
        const giveaway = await database.get(
            'SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ?',
            [giveawayId, interaction.guild.id]
        );

        if (!giveaway) {
            return await interaction.reply({
                content: '❌ No giveaway found with that ID.',
                flags: MessageFlags.Ephemeral
            });
        }

        const winnersToSelect = newWinnerCount || giveaway.winners_count;

        // Get all entries for this giveaway
        const entries = await database.all(
            'SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?',
            [giveaway.message_id]
        );

        if (entries.length === 0) {
            return await interaction.reply({
                content: '❌ No entries found for this giveaway.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Select winners
        const winners = this.selectWinners(entries, winnersToSelect);
        const channel = interaction.guild.channels.cache.get(giveaway.channel_id);

        if (channel) {
            const winnerMentions = winners.map(winner => `<@${winner.user_id}>`).join(', ');
            
            const rerollEmbed = new EmbedBuilder()
                .setTitle('🎉 Giveaway Rerolled!')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**New Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations!`)
                .setColor(0xD3D3D3)
                .setTimestamp();

            await channel.send({ embeds: [rerollEmbed] });
        }

        await interaction.reply({
            content: `✅ Giveaway rerolled! ${winnersToSelect} new winner${winnersToSelect > 1 ? 's' : ''} selected.`,
            flags: MessageFlags.Ephemeral
        });

        logger.info(`Giveaway rerolled by ${interaction.user.tag}: ${giveaway.prize}`);
    },

    async listGiveaways(interaction) {
        const giveaways = await database.all(
            'SELECT * FROM giveaways WHERE guild_id = ? AND active = 1 ORDER BY end_time ASC',
            [interaction.guild.id]
        );

        if (giveaways.length === 0) {
            return await interaction.reply({
                content: '📭 No active giveaways in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const giveawayList = giveaways.map(g => {
            const endTimestamp = Math.floor(new Date(g.end_time).getTime() / 1000);
            return `**${g.prize}** - Ends <t:${endTimestamp}:R>\nID: \`${g.message_id}\` | Channel: <#${g.channel_id}>`;
        }).join('\n\n');

        const listEmbed = new EmbedBuilder()
            .setTitle('🎉 Active Giveaways')
            .setDescription(giveawayList)
            .setColor(0xD3D3D3)
            .setTimestamp();

        await interaction.reply({ embeds: [listEmbed], flags: MessageFlags.Ephemeral });
    },

    async endGiveawayAutomatically(messageId, guildId) {
        try {
            const giveaway = await database.get(
                'SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ? AND active = 1',
                [messageId, guildId]
            );

            if (giveaway) {
                const guild = await database.client.guilds.fetch(guildId);
                await this.endGiveawayProcess(guild, giveaway);
            }
        } catch (error) {
            logger.error('Error ending giveaway automatically:', error);
        }
    },

    async endGiveawayProcess(guild, giveaway) {
        const channel = guild.channels.cache.get(giveaway.channel_id);
        
        if (!channel) {
            logger.warn(`Channel ${giveaway.channel_id} not found for giveaway ${giveaway.message_id}`);
            return;
        }

        try {
            const message = await channel.messages.fetch(giveaway.message_id);
            
            // Get all entries
            const entries = await database.all(
                'SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?',
                [giveaway.message_id]
            );

            // Disable the button
            const disabledButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('enter_giveaway_ended')
                        .setLabel('Giveaway Ended')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔒')
                        .setDisabled(true)
                );

            if (entries.length === 0) {
                // No entries with custom styling
                const noWinnerEmbed = new EmbedBuilder()
                    .setTitle(giveaway.custom_title ? giveaway.custom_title.replace('🎉', '🔒') : '🔒 Giveaway Ended')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner:** No valid entries\n\nBetter luck next time!`)
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                if (giveaway.banner_url) {
                    noWinnerEmbed.setImage(giveaway.banner_url);
                }

                await message.edit({ embeds: [noWinnerEmbed], components: [disabledButton] });
                
                const noWinnerAnnouncement = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Results')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner:** No valid entries\n\nThe giveaway has ended with no participants.`)
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                if (giveaway.banner_url) {
                    noWinnerAnnouncement.setImage(giveaway.banner_url);
                }

                await channel.send({ embeds: [noWinnerAnnouncement] });
            } else {
                // Select winners
                const winners = this.selectWinners(entries, giveaway.winners_count);
                const winnerMentions = winners.map(winner => `<@${winner.user_id}>`).join(', ');

                // Update original message with custom styling
                const endedEmbed = new EmbedBuilder()
                    .setTitle(giveaway.custom_title ? giveaway.custom_title.replace('🎉', '🔒') : '🔒 Giveaway Ended')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations!`)
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                if (giveaway.banner_url) {
                    endedEmbed.setImage(giveaway.banner_url);
                }

                await message.edit({ embeds: [endedEmbed], components: [disabledButton] });

                // Announce winners with custom styling
                const winnerAnnouncement = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Results')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations! Please contact the giveaway host to claim your prize.`)
                    .setColor(0xD3D3D3)
                    .setTimestamp();

                if (giveaway.banner_url) {
                    winnerAnnouncement.setImage(giveaway.banner_url);
                }

                await channel.send({ embeds: [winnerAnnouncement] });
            }

            // Mark giveaway as inactive
            await database.run(
                'UPDATE giveaways SET active = 0 WHERE message_id = ?',
                [giveaway.message_id]
            );

            logger.info(`Giveaway ended: ${giveaway.prize} in ${guild.name}`);

        } catch (error) {
            logger.error('Error processing giveaway end:', error);
        }
    },

    selectWinners(entries, count) {
        const shuffled = entries.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, entries.length));
    },

    isValidImageUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname.toLowerCase();
            return pathname.match(/\.(jpg|jpeg|png|gif|webp)$/);
        } catch {
            return false;
        }
    }
};