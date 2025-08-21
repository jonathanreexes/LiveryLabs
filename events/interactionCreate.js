const { Events, InteractionType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');
const database = require('../database/database');
const { formatMessage } = require('../utils/messageFormatter');
const OwnerAuth = require('../utils/ownerAuth');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.type === InteractionType.ApplicationCommand) {
                await handleSlashCommand(interaction);
            } else if (interaction.type === InteractionType.MessageComponent) {
                await handleMessageComponent(interaction);
            }
        } catch (error) {
            logger.error('Error in interactionCreate event:', error);
            
            const errorMessage = '❌ An unexpected error occurred while processing your interaction.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

async function handleSlashCommand(interaction) {
    // Global owner-only validation for ALL commands
    if (!await OwnerAuth.validateOwnerAccess(interaction)) {
        return; // Already replied with error message
    }

    // If bot is sleeping, ignore all commands except from owner
    if (global.botSleeping && !OwnerAuth.isOwner(interaction)) {
        return await interaction.reply({
            content: '💤 Bot is currently sleeping. Ask the server owner to wake it up.',
            ephemeral: true
        });
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return interaction.reply({ 
            content: '❌ Unknown command!', 
            ephemeral: true 
        });
    }

    // Rate limiting
    const isRateLimited = rateLimiter.checkRateLimit(interaction.user.id, interaction.commandName);
    if (isRateLimited) {
        return interaction.reply({ 
            content: '⏰ You\'re using commands too fast! Please slow down.', 
            ephemeral: true 
        });
    }

    // Check if command is being used in DM when it requires a guild
    if (!interaction.guild && command.guildOnly) {
        return interaction.reply({ 
            content: '❌ This command can only be used in servers!', 
            ephemeral: true 
        });
    }

    // Check bot permissions
    if (interaction.guild) {
        const botMember = interaction.guild.members.me;
        if (command.botPermissions && !botMember.permissions.has(command.botPermissions)) {
            return interaction.reply({ 
                content: '❌ I don\'t have the required permissions to execute this command!', 
                ephemeral: true 
            });
        }
    }

    // Execute command
    try {
        logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = '❌ There was an error executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

async function handleMessageComponent(interaction) {
    const { customId } = interaction;

    try {
        if (customId === 'verify_user') {
            await handleVerification(interaction);
        } else if (customId === 'enter_giveaway') {
            await handleGiveawayEntry(interaction);
        } else if (customId === 'create_ticket') {
            await handleTicketCreation(interaction);
        } else if (customId === 'ticket_close') {
            await handleTicketClose(interaction);
        } else if (customId.startsWith('trivia_')) {
            // Trivia button interactions are handled in the games command
            return;
        } else if (customId === 'self_assign_roles') {
            await handleSelfAssignRoles(interaction);
        } else {
            logger.warn(`Unknown component interaction: ${customId}`);
        }
    } catch (error) {
        logger.error(`Error handling component interaction ${customId}:`, error);
        
        const errorMessage = '❌ There was an error processing your interaction!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

async function handleTicketCreation(interaction) {
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

    // Use the ticket create command logic
    const ticketCommand = interaction.client.commands.get('ticket');
    if (ticketCommand) {
        // Simulate options for the create subcommand
        interaction.options = {
            getSubcommand: () => 'create',
            getString: (name) => name === 'reason' ? 'General support request' : null
        };
        
        await ticketCommand.execute(interaction);
    }
}

async function handleVerification(interaction) {
    try {
        // Check verification settings including all customizations
        const settings = await database.get(
            'SELECT verified_role_id, verification_enabled, verification_color, success_title, success_message FROM guild_settings WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!settings?.verification_enabled || !settings?.verified_role_id) {
            return interaction.reply({
                content: '❌ Verification is not properly configured on this server.',
                ephemeral: true
            });
        }

        const member = interaction.member;
        const verifiedRole = interaction.guild.roles.cache.get(settings.verified_role_id);

        if (!verifiedRole) {
            return interaction.reply({
                content: '❌ Verified role not found. Please contact an administrator.',
                ephemeral: true
            });
        }

        // Check if user already has verified role
        if (member.roles.cache.has(verifiedRole.id)) {
            return interaction.reply({
                content: '✅ You are already verified!',
                ephemeral: true
            });
        }

        // Add verified role
        await member.roles.add(verifiedRole);

        // Use stored verification color or default to light gray
        const verificationColor = settings.verification_color || 0xD3D3D3;
        const defaultSuccessTitle = '✅ Verification Successful';
        const defaultSuccessMessage = 'Welcome to the server! You have been verified and can now access all channels.';
        
        const embed = new EmbedBuilder()
            .setTitle(settings.success_title || defaultSuccessTitle)
            .setDescription(formatMessage(settings.success_message || defaultSuccessMessage))
            .setColor(verificationColor);

        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        logger.info(`User ${member.user.tag} verified in guild ${interaction.guild.id}`);

    } catch (error) {
        logger.error('Error in verification process:', error);
        
        await interaction.reply({
            content: '❌ An error occurred during verification. Please try again or contact an administrator.',
            ephemeral: true
        });
    }
}

async function handleGiveawayEntry(interaction) {
    try {
        const messageId = interaction.message.id;
        
        // Check if giveaway exists and is active
        const giveaway = await database.get(
            'SELECT * FROM giveaways WHERE message_id = ? AND active = 1',
            [messageId]
        );

        if (!giveaway) {
            return await interaction.reply({
                content: '❌ This giveaway is no longer active.',
                ephemeral: true
            });
        }

        // Check if giveaway has ended
        const endTime = new Date(giveaway.end_time);
        if (Date.now() >= endTime.getTime()) {
            return await interaction.reply({
                content: '❌ This giveaway has already ended.',
                ephemeral: true
            });
        }

        // Check if user already entered
        const existingEntry = await database.get(
            'SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
            [messageId, interaction.user.id]
        );

        if (existingEntry) {
            return await interaction.reply({
                content: '✅ You have already entered this giveaway! Good luck!',
                ephemeral: true
            });
        }

        // Add entry
        await database.run(
            'INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)',
            [messageId, interaction.user.id]
        );

        // Get total entries count
        const entriesCount = await database.get(
            'SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?',
            [messageId]
        );

        await interaction.reply({
            content: `🎉 You've successfully entered the giveaway for **${giveaway.prize}**!\n\n**Total Entries:** ${entriesCount.count}`,
            ephemeral: true
        });

        logger.info(`User ${interaction.user.tag} entered giveaway: ${giveaway.prize}`);

    } catch (error) {
        logger.error('Error handling giveaway entry:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while entering the giveaway. Please try again.',
            ephemeral: true
        });
    }
}

async function handleTicketClose(interaction) {
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
    const config = require('../config.json');
    const supportRole = interaction.guild.roles.cache.find(r => r.name === config.tickets.supportRole);
    const hasSupportRole = supportRole && interaction.member.roles.cache.has(supportRole.id);

    if (!isTicketOwner && !hasStaffPerms && !hasSupportRole) {
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

async function handleSelfAssignRoles(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    const selectedRoleIds = interaction.values;
    const member = interaction.member;
    
    if (!member) {
        return interaction.reply({ content: '❌ Member not found!', ephemeral: true });
    }

    const addedRoles = [];
    const removedRoles = [];
    const errors = [];

    for (const roleId of selectedRoleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            errors.push(`Role not found: ${roleId}`);
            continue;
        }

        if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
            errors.push(`Cannot assign role: ${role.name}`);
            continue;
        }

        try {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(role);
                removedRoles.push(role);
            } else {
                await member.roles.add(role);
                addedRoles.push(role);
            }
        } catch (error) {
            errors.push(`Failed to modify role: ${role.name}`);
            logger.error(`Error modifying role ${role.name} for ${member.user.tag}:`, error);
        }
    }

    // Create response embed
    const embed = new EmbedBuilder()
        .setColor('#4285f4')
        .setTitle('🏷️ Role Assignment Results')
        .setTimestamp();

    const fields = [];

    if (addedRoles.length > 0) {
        fields.push({
            name: '✅ Added Roles',
            value: addedRoles.map(r => r.toString()).join(', '),
            inline: false
        });
    }

    if (removedRoles.length > 0) {
        fields.push({
            name: '❌ Removed Roles',
            value: removedRoles.map(r => r.toString()).join(', '),
            inline: false
        });
    }

    if (errors.length > 0) {
        fields.push({
            name: '⚠️ Errors',
            value: errors.join('\n'),
            inline: false
        });
    }

    if (fields.length === 0) {
        embed.setDescription('No changes were made to your roles.');
    } else {
        embed.addFields(fields);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
