const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

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
                        .setDescription('Requirements to enter (optional)')
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to host the giveaway (defaults to current)')
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
        } catch (error) {
            logger.error('Error in giveaway command:', error);
            
            const errorMessage = '❌ An error occurred while processing the giveaway command.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },

    async createGiveaway(interaction) {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winners = interaction.options.getInteger('winners') || 1;
        const requirements = interaction.options.getString('requirements');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        // Validate channel type
        if (channel.type !== 0) { // 0 = GUILD_TEXT
            return await interaction.reply({
                content: '❌ Giveaways can only be created in text channels.',
                ephemeral: true
            });
        }

        // Check bot permissions in target channel
        const botMember = interaction.guild.members.me;
        const channelPermissions = channel.permissionsFor(botMember);
        
        if (!channelPermissions.has(['SendMessages', 'EmbedLinks', 'AddReactions'])) {
            return await interaction.reply({
                content: '❌ I need Send Messages, Embed Links, and Add Reactions permissions in that channel.',
                ephemeral: true
            });
        }

        // Calculate end time
        const endTime = new Date(Date.now() + duration * 60 * 1000);
        const endTimestamp = Math.floor(endTime.getTime() / 1000);

        // Create giveaway embed
        const giveawayEmbed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(`**Prize:** ${prize}\n\n**Winners:** ${winners}\n**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)${requirements ? `\n**Requirements:** ${requirements}` : ''}\n\n**How to enter:** Click the 🎉 button below!`)
            .setColor(0xff69b4)
            .setFooter({ text: `${winners} winner${winners > 1 ? 's' : ''} | Ends` })
            .setTimestamp(endTime);

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

        // Store giveaway in database
        await database.run(
            `INSERT INTO giveaways (message_id, guild_id, channel_id, host_id, prize, winners_count, end_time, requirements, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [giveawayMessage.id, interaction.guild.id, channel.id, interaction.user.id, prize, winners, endTime.toISOString(), requirements]
        );

        // Schedule giveaway end
        setTimeout(() => {
            this.endGiveawayAutomatically(giveawayMessage.id, interaction.guild.id);
        }, duration * 60 * 1000);

        const confirmEmbed = new EmbedBuilder()
            .setTitle('✅ Giveaway Created')
            .setDescription(`Giveaway for **${prize}** has been created in ${channel}!\n\nIt will end <t:${endTimestamp}:R>.`)
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
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
                ephemeral: true
            });
        }

        await this.endGiveawayProcess(interaction.guild, giveaway);

        await interaction.reply({
            content: '✅ Giveaway has been ended and winners have been selected!',
            ephemeral: true
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
                ephemeral: true
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
                ephemeral: true
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
                .setColor(0xff69b4)
                .setTimestamp();

            await channel.send({ embeds: [rerollEmbed] });
        }

        await interaction.reply({
            content: `✅ Giveaway rerolled! ${winnersToSelect} new winner${winnersToSelect > 1 ? 's' : ''} selected.`,
            ephemeral: true
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
                ephemeral: true
            });
        }

        const giveawayList = giveaways.map(g => {
            const endTimestamp = Math.floor(new Date(g.end_time).getTime() / 1000);
            return `**${g.prize}** - Ends <t:${endTimestamp}:R>\nID: \`${g.message_id}\` | Channel: <#${g.channel_id}>`;
        }).join('\n\n');

        const listEmbed = new EmbedBuilder()
            .setTitle('🎉 Active Giveaways')
            .setDescription(giveawayList)
            .setColor(0xff69b4)
            .setTimestamp();

        await interaction.reply({ embeds: [listEmbed], ephemeral: true });
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
                // No entries
                const noWinnerEmbed = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Ended')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner:** No valid entries\n\nBetter luck next time!`)
                    .setColor(0xff0000)
                    .setTimestamp();

                await message.edit({ embeds: [noWinnerEmbed], components: [disabledButton] });
                
                const noWinnerAnnouncement = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Results')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner:** No valid entries\n\nThe giveaway has ended with no participants.`)
                    .setColor(0xff0000)
                    .setTimestamp();

                await channel.send({ embeds: [noWinnerAnnouncement] });
            } else {
                // Select winners
                const winners = this.selectWinners(entries, giveaway.winners_count);
                const winnerMentions = winners.map(winner => `<@${winner.user_id}>`).join(', ');

                // Update original message
                const endedEmbed = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Ended')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations!`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                await message.edit({ embeds: [endedEmbed], components: [disabledButton] });

                // Announce winners
                const winnerAnnouncement = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Results')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations! Please contact the giveaway host to claim your prize.`)
                    .setColor(0x00ff00)
                    .setTimestamp();

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
    }
};