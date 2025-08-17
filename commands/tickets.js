const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Support ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new support ticket')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for creating the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the current ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the current ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the ticket system (Admin only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all open tickets (Staff only)')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'close':
                    await handleClose(interaction);
                    break;
                case 'add':
                    await handleAdd(interaction);
                    break;
                case 'remove':
                    await handleRemove(interaction);
                    break;
                case 'setup':
                    await handleSetup(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Error in ticket command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while executing the ticket command.', 
                ephemeral: true 
            });
        }
    }
};

async function handleCreate(interaction) {
    const reason = interaction.options.getString('reason');
    
    // Check if user already has an open ticket
    const existingTicket = await new Promise((resolve, reject) => {
        database.db.get(
            'SELECT * FROM tickets WHERE user_id = ? AND guild_id = ? AND status = "open"',
            [interaction.user.id, interaction.guild.id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (existingTicket) {
        return interaction.reply({ 
            content: '❌ You already have an open ticket! Please close it before creating a new one.', 
            ephemeral: true 
        });
    }

    try {
        // Find or create ticket category
        let category = interaction.guild.channels.cache.find(c => c.name === config.tickets.category && c.type === ChannelType.GuildCategory);
        
        if (!category) {
            category = await interaction.guild.channels.create({
                name: config.tickets.category,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
        }

        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: interaction.client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        // Add support role if it exists
        const supportRole = interaction.guild.roles.cache.find(r => r.name === config.tickets.supportRole);
        if (supportRole) {
            await ticketChannel.permissionOverwrites.create(supportRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }

        // Save ticket to database
        await database.createTicket(interaction.user.id, interaction.guild.id, ticketChannel.id, reason);

        // Create ticket embed
        const ticketEmbed = new EmbedBuilder()
            .setColor('#4285f4')
            .setTitle('🎫 Support Ticket Created')
            .setDescription(`Hello ${interaction.user}, your ticket has been created!`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Created by', value: interaction.user.toString(), inline: true },
                { name: 'Created at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Support team will be with you shortly!' })
            .setTimestamp();

        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });

        // Mention support role if it exists
        if (supportRole) {
            await ticketChannel.send(`${supportRole}, a new ticket has been created!`);
        }

        await interaction.reply({ 
            content: `✅ Ticket created! Please check ${ticketChannel}`, 
            ephemeral: true 
        });

        logger.info(`Ticket created by ${interaction.user.tag} in ${interaction.guild.name}`);
    } catch (error) {
        logger.error('Error creating ticket:', error);
        await interaction.reply({ content: '❌ Failed to create ticket!', ephemeral: true });
    }
}

async function handleClose(interaction) {
    // Check if this is a ticket channel
    const ticket = await new Promise((resolve, reject) => {
        database.db.get(
            'SELECT * FROM tickets WHERE channel_id = ? AND status = "open"',
            [interaction.channel.id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel!', ephemeral: true });
    }

    // Check permissions
    const isTicketOwner = ticket.user_id === interaction.user.id;
    const hasStaffPerms = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const supportRole = interaction.guild.roles.cache.find(r => r.name === config.tickets.supportRole);
    const hasupportRole = supportRole && interaction.member.roles.cache.has(supportRole.id);

    if (!isTicketOwner && !hasStaffPerms && !hasupportRole) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to close this ticket!', 
            ephemeral: true 
        });
    }

    try {
        // Close ticket in database
        await database.closeTicket(ticket.id);

        const closeEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔒 Ticket Closed')
            .setDescription(`This ticket has been closed by ${interaction.user}`)
            .addFields(
                { name: 'Closed at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: 'Channel will be deleted in', value: '10 seconds', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [closeEmbed] });

        // Delete channel after 10 seconds
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                logger.error('Error deleting ticket channel:', error);
            }
        }, 10000);

        logger.info(`Ticket ${ticket.id} closed by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error closing ticket:', error);
        await interaction.reply({ content: '❌ Failed to close ticket!', ephemeral: true });
    }
}

async function handleAdd(interaction) {
    const user = interaction.options.getUser('user');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to add users to tickets!', 
            ephemeral: true 
        });
    }

    // Check if this is a ticket channel
    const ticket = await new Promise((resolve, reject) => {
        database.db.get(
            'SELECT * FROM tickets WHERE channel_id = ? AND status = "open"',
            [interaction.channel.id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel!', ephemeral: true });
    }

    try {
        await interaction.channel.permissionOverwrites.create(user, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ User Added')
            .setDescription(`${user} has been added to this ticket by ${interaction.user}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error adding user to ticket:', error);
        await interaction.reply({ content: '❌ Failed to add user to ticket!', ephemeral: true });
    }
}

async function handleRemove(interaction) {
    const user = interaction.options.getUser('user');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to remove users from tickets!', 
            ephemeral: true 
        });
    }

    // Check if this is a ticket channel
    const ticket = await new Promise((resolve, reject) => {
        database.db.get(
            'SELECT * FROM tickets WHERE channel_id = ? AND status = "open"',
            [interaction.channel.id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel!', ephemeral: true });
    }

    if (user.id === ticket.user_id) {
        return interaction.reply({ 
            content: '❌ You cannot remove the ticket creator!', 
            ephemeral: true 
        });
    }

    try {
        await interaction.channel.permissionOverwrites.delete(user);

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ User Removed')
            .setDescription(`${user} has been removed from this ticket by ${interaction.user}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error removing user from ticket:', error);
        await interaction.reply({ content: '❌ Failed to remove user from ticket!', ephemeral: true });
    }
}

async function handleSetup(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ You need Administrator permission to setup the ticket system!', 
            ephemeral: true 
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#4285f4')
        .setTitle('🎫 Support Tickets')
        .setDescription('Click the button below to create a support ticket!')
        .addFields(
            { name: 'Before creating a ticket:', value: '• Check if your question is already answered in FAQ\n• Make sure your issue requires staff assistance\n• Be ready to provide details about your problem', inline: false }
        )
        .setFooter({ text: 'Support tickets help us assist you better!' })
        .setTimestamp();

    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

    await interaction.reply({ embeds: [embed], components: [button] });
}

async function handleList(interaction) {
    const supportRole = interaction.guild.roles.cache.find(r => r.name === config.tickets.supportRole);
    const hasStaffPerms = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const hasSupportRole = supportRole && interaction.member.roles.cache.has(supportRole.id);

    if (!hasStaffPerms && !hasSupportRole) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to view the ticket list!', 
            ephemeral: true 
        });
    }

    try {
        const tickets = await new Promise((resolve, reject) => {
            database.db.all(
                'SELECT * FROM tickets WHERE guild_id = ? AND status = "open" ORDER BY created_at DESC',
                [interaction.guild.id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        if (tickets.length === 0) {
            return interaction.reply({ content: '✅ No open tickets!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#4285f4')
            .setTitle('🎫 Open Tickets')
            .setDescription(
                tickets.map(ticket => {
                    const user = interaction.client.users.cache.get(ticket.user_id);
                    const channel = interaction.guild.channels.cache.get(ticket.channel_id);
                    return `**${user ? user.username : 'Unknown User'}** - ${channel ? channel.toString() : 'Deleted Channel'}\nReason: ${ticket.reason || 'No reason provided'}`;
                }).join('\n\n')
            )
            .setFooter({ text: `Total: ${tickets.length} open tickets` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        logger.error('Error listing tickets:', error);
        await interaction.reply({ content: '❌ Failed to list tickets!', ephemeral: true });
    }
}
