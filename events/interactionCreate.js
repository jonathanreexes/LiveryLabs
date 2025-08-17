const { Events, InteractionType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');
const database = require('../database/database');

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
        if (customId === 'create_ticket') {
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
