const { Events, InteractionType, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');
const database = require('../database/database');
const { formatMessage } = require('../utils/messageFormatter');
const OwnerAuth = require('../utils/ownerAuth');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Ultra-fast acknowledgment watchdog - 500ms maximum with safer defaults
        const ackWatchdog = setTimeout(async () => {
            if (!interaction.replied && !interaction.deferred) {
                try {
                    if (interaction.type === InteractionType.ApplicationCommand) {
                        // Default to public reply for slash commands (safer for existing commands)
                        await interaction.deferReply();
                    } else if (interaction.type === InteractionType.MessageComponent) {
                        // Default to deferUpdate for components (safer for button/select updates)
                        await interaction.deferUpdate();
                    }
                } catch (ackError) {
                    logger.error('Failed to acknowledge interaction:', ackError);
                }
            }
        }, 500); // Acknowledge within 500ms maximum

        try {
            if (interaction.type === InteractionType.ApplicationCommand) {
                await handleSlashCommand(interaction);
            } else if (interaction.type === InteractionType.MessageComponent) {
                await handleMessageComponent(interaction);
            }
        } catch (error) {
            logger.error('Error in interactionCreate event:', error);
            
            const errorMessage = '❌ An unexpected error occurred while processing your interaction.';
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
                }
            } catch (responseError) {
                logger.error('Failed to send error response:', responseError);
            }
        } finally {
            clearTimeout(ackWatchdog);
        }
    }
};

async function handleSlashCommand(interaction) {
    // Proactive acknowledgment within 250ms - default to public reply for compatibility
    if (!interaction.replied && !interaction.deferred) {
        try {
            await interaction.deferReply();
        } catch (ackError) {
            logger.error('Failed to proactively acknowledge slash command:', ackError);
        }
    }

    // Global owner-only validation for ALL commands
    try {
        if (!await OwnerAuth.validateOwnerAccess(interaction)) {
            return; // Already replied with error message
        }
    } catch (authError) {
        logger.error('Error in owner validation:', authError);
        const errorMsg = '❌ Authorization check failed.';
        if (interaction.deferred) {
            return await interaction.editReply({ content: errorMsg });
        } else {
            return await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
        }
    }

    // Helper function to respond appropriately based on interaction state
    const respondToInteraction = async (content, ephemeral = true) => {
        if (interaction.deferred) {
            return await interaction.editReply({ content });
        } else if (interaction.replied) {
            return await interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
        } else {
            return await interaction.reply({ content, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
        }
    };

    try {
        // If bot is sleeping, ignore all commands except from owner
        if (global.botSleeping && !OwnerAuth.isOwner(interaction)) {
            return await respondToInteraction('💤 Bot is currently sleeping. Ask the server owner to wake it up.');
        }

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return await respondToInteraction('❌ Unknown command!');
        }

        // Rate limiting
        const isRateLimited = rateLimiter.checkRateLimit(interaction.user.id, interaction.commandName);
        if (isRateLimited) {
            return await respondToInteraction('⏰ You\'re using commands too fast! Please slow down.');
        }

        // Check if command is being used in DM when it requires a guild
        if (!interaction.guild && command.guildOnly) {
            return await respondToInteraction('❌ This command can only be used in servers!');
        }

        // Check bot permissions
        if (interaction.guild) {
            const botMember = interaction.guild.members.me;
            if (command.botPermissions && !botMember.permissions.has(command.botPermissions)) {
                return await respondToInteraction('❌ I don\'t have the required permissions to execute this command!');
            }
        }

        // Execute command
        logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
        
        // Execute command with error handling but no artificial timeout
        await command.execute(interaction).catch(async (error) => {
            logger.error(`Error executing command ${interaction.commandName}:`, error);
            
            const errorMessage = '❌ There was an error executing this command!';
            
            try {
                await respondToInteraction(errorMessage);
            } catch (responseError) {
                logger.error('Failed to send command error response:', responseError);
            }
        });
        
    } catch (error) {
        logger.error(`Error in command handling for ${interaction.commandName}:`, error);
        try {
            await respondToInteraction('❌ An unexpected error occurred!');
        } catch (responseError) {
            logger.error('Failed to send error response:', responseError);
        }
    }
}

// Smart response helper that handles deferred states correctly
const createResponseHelper = (interaction) => {
    return {
        // Acknowledge immediately if not already done
        ack: async (options = {}) => {
            if (!interaction.replied && !interaction.deferred) {
                const { ephemeral = true, update = false } = options;
                
                if (update && interaction.type === InteractionType.MessageComponent) {
                    await interaction.deferUpdate();
                } else {
                    await interaction.deferReply({ ephemeral });
                }
            }
        },

        respond: async (payload) => {
            if (interaction.deferred) {
                return await interaction.editReply(payload);
            } else if (interaction.replied) {
                return await interaction.followUp(payload);
            } else {
                return await interaction.reply(payload);
            }
        },
        
        respondEphemeral: async (content) => {
            if (interaction.deferred) {
                // If already deferred, use editReply for primary response or followUp for additional
                return await interaction.editReply({ content });
            } else if (interaction.replied) {
                return await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
            } else {
                return await interaction.reply({ content, flags: MessageFlags.Ephemeral });
            }
        },

        update: async (payload) => {
            // For message component updates - smart routing based on defer type
            if (interaction.deferred) {
                // If deferred with deferUpdate, use editReply to update the original message
                // If deferred with deferReply, this will edit the deferred reply instead
                return await interaction.editReply(payload);
            } else {
                return await interaction.update(payload);
            }
        }
    };
};

async function handleMessageComponent(interaction) {
    const { customId } = interaction;
    
    // Proactive acknowledgment within 250ms - default to deferUpdate for safer button/select behavior
    if (!interaction.replied && !interaction.deferred) {
        try {
            // Components that need ephemeral responses instead of message updates
            const needsEphemeralReply = ['verify_user', 'enter_giveaway', 'create_ticket'].includes(customId);
            
            if (needsEphemeralReply) {
                await interaction.deferReply({ ephemeral: true });
            } else {
                await interaction.deferUpdate();
            }
        } catch (ackError) {
            logger.error('Failed to proactively acknowledge component:', ackError);
        }
    }
    
    const responder = createResponseHelper(interaction);

    try {
        if (customId === 'verify_user') {
            await handleVerification(interaction, responder);
        } else if (customId === 'enter_giveaway') {
            await handleGiveawayEntry(interaction, responder);
        } else if (customId === 'create_ticket') {
            await handleTicketCreation(interaction, responder);
        } else if (customId === 'ticket_close') {
            await handleTicketClose(interaction, responder);
        } else if (customId.startsWith('trivia_')) {
            // Trivia button interactions are handled in the games command
            return;
        } else if (customId === 'self_assign_roles') {
            await handleSelfAssignRoles(interaction, responder);
        } else {
            logger.warn(`Unknown component interaction: ${customId}`);
        }
    } catch (error) {
        logger.error(`Error handling component interaction ${customId}:`, error);
        
        try {
            await responder.respondEphemeral('❌ There was an error processing your interaction!');
        } catch (responseError) {
            logger.error('Failed to send component error response:', responseError);
        }
    }
}

async function handleTicketCreation(interaction, responder) {
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
        return await responder.respondEphemeral('❌ You already have an open ticket! Please close it before creating a new one.');
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

async function handleVerification(interaction, responder) {
    try {
        // Check verification settings including all customizations
        const settings = await database.get(
            'SELECT verified_role_id, verification_enabled, verification_color, success_title, success_message FROM guild_settings WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!settings?.verification_enabled || !settings?.verified_role_id) {
            return await responder.respondEphemeral('❌ Verification is not properly configured on this server.');
        }

        const member = interaction.member;
        const verifiedRole = interaction.guild.roles.cache.get(settings.verified_role_id);

        if (!verifiedRole) {
            return await responder.respondEphemeral('❌ Verified role not found. Please contact an administrator.');
        }

        // Check if user already has verified role
        if (member.roles.cache.has(verifiedRole.id)) {
            return await responder.respondEphemeral('✅ You are already verified!');
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

        await responder.respond({ embeds: [embed], flags: MessageFlags.Ephemeral });
        
        logger.info(`User ${member.user.tag} verified in guild ${interaction.guild.id}`);

    } catch (error) {
        logger.error('Error in verification process:', error);
        await responder.respondEphemeral('❌ An error occurred during verification. Please try again or contact an administrator.');
    }
}

async function handleGiveawayEntry(interaction, responder) {
    try {
        const messageId = interaction.message.id;
        
        // Check if giveaway exists and is active
        const giveaway = await database.get(
            'SELECT * FROM giveaways WHERE message_id = ? AND active = 1',
            [messageId]
        );

        if (!giveaway) {
            return await responder.respondEphemeral('❌ This giveaway is no longer active.');
        }

        // Check if giveaway has ended
        const endTime = new Date(giveaway.end_time);
        if (Date.now() >= endTime.getTime()) {
            return await responder.respondEphemeral('❌ This giveaway has already ended.');
        }

        // Check if user already entered
        const existingEntry = await database.get(
            'SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
            [messageId, interaction.user.id]
        );

        if (existingEntry) {
            return await responder.respondEphemeral('✅ You have already entered this giveaway! Good luck!');
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

        await responder.respondEphemeral(`🎉 You've successfully entered the giveaway for **${giveaway.prize}**!\n\n**Total Entries:** ${entriesCount.count}`);

        logger.info(`User ${interaction.user.tag} entered giveaway: ${giveaway.prize}`);

    } catch (error) {
        logger.error('Error handling giveaway entry:', error);
        await responder.respondEphemeral('❌ An error occurred while entering the giveaway. Please try again.');
    }
}

async function handleTicketClose(interaction, responder) {
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
        return await responder.respondEphemeral('❌ This is not a ticket channel!');
    }

    // Check permissions
    const isTicketOwner = ticket.user_id === interaction.user.id;
    const hasStaffPerms = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const config = require('../config.json');
    const supportRole = interaction.guild.roles.cache.find(r => r.name === config.tickets.supportRole);
    const hasSupportRole = supportRole && interaction.member.roles.cache.has(supportRole.id);

    if (!isTicketOwner && !hasStaffPerms && !hasSupportRole) {
        return await responder.respondEphemeral('❌ You don\'t have permission to close this ticket!');
    }

    try {
        // Close ticket in database
        await database.closeTicket(ticket.id);

        const closeEmbed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('🔒 Ticket Closed')
            .setDescription(`This ticket has been closed by ${interaction.user}`)
            .addFields(
                { name: 'Closed at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: 'Channel will be deleted in', value: '10 seconds', inline: true }
            )
            .setTimestamp();

        await responder.respond({ embeds: [closeEmbed] });

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
        await responder.respondEphemeral('❌ Failed to close ticket!');
    }
}

async function handleSelfAssignRoles(interaction, responder) {
    if (!interaction.isStringSelectMenu()) return;

    const selectedRoleIds = interaction.values;
    const member = interaction.member;
    
    if (!member) {
        return await responder.respondEphemeral('❌ Member not found!');
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
        .setColor(0xD3D3D3)
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

    await responder.respond({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
