const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Role management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Give a role to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to give the role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to give')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to get info about')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all roles in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('members')
                .setDescription('List members with a specific role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to check members for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reaction-add')
                .setDescription('Add a reaction role to a message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID to add reaction role to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('The emoji for the reaction')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reaction-remove')
                .setDescription('Remove a reaction role from a message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID to remove reaction role from')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('The emoji to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('self-assign')
                .setDescription('Create a self-assignable role menu')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'give':
                    await handleGive(interaction);
                    break;
                case 'remove':
                    await handleRemove(interaction);
                    break;
                case 'info':
                    await handleInfo(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
                case 'members':
                    await handleMembers(interaction);
                    break;
                case 'reaction-add':
                    await handleReactionAdd(interaction);
                    break;
                case 'reaction-remove':
                    await handleReactionRemove(interaction);
                    break;
                case 'self-assign':
                    await handleSelfAssign(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Error in roles command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while executing the roles command.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};

async function handleGive(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to manage roles!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.reply({ content: '❌ User not found in this server!', flags: MessageFlags.Ephemeral });
    }

    if (role.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ 
            content: '❌ You cannot assign roles higher than or equal to your highest role!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ 
            content: '❌ I cannot assign roles higher than or equal to my highest role!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    if (member.roles.cache.has(role.id)) {
        return interaction.reply({ 
            content: `❌ ${user.username} already has the ${role.name} role!`, 
            flags: MessageFlags.Ephemeral 
        });
    }

    try {
        await member.roles.add(role);

        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('✅ Role Assigned')
            .setDescription(`Successfully gave ${role} to ${user}`)
            .addFields(
                { name: 'Moderator', value: interaction.user.toString(), inline: true },
                { name: 'Target', value: user.toString(), inline: true },
                { name: 'Role', value: role.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Role ${role.name} assigned to ${user.tag} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error assigning role:', error);
        await interaction.reply({ content: '❌ Failed to assign the role!', flags: MessageFlags.Ephemeral });
    }
}

async function handleRemove(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to manage roles!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.reply({ content: '❌ User not found in this server!', flags: MessageFlags.Ephemeral });
    }

    if (role.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ 
            content: '❌ You cannot remove roles higher than or equal to your highest role!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    if (!member.roles.cache.has(role.id)) {
        return interaction.reply({ 
            content: `❌ ${user.username} doesn't have the ${role.name} role!`, 
            flags: MessageFlags.Ephemeral 
        });
    }

    try {
        await member.roles.remove(role);

        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('❌ Role Removed')
            .setDescription(`Successfully removed ${role} from ${user}`)
            .addFields(
                { name: 'Moderator', value: interaction.user.toString(), inline: true },
                { name: 'Target', value: user.toString(), inline: true },
                { name: 'Role', value: role.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Role ${role.name} removed from ${user.tag} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error removing role:', error);
        await interaction.reply({ content: '❌ Failed to remove the role!', flags: MessageFlags.Ephemeral });
    }
}

async function handleInfo(interaction) {
    const role = interaction.options.getRole('role');
    
    const membersWithRole = role.members.size;
    const permissions = role.permissions.toArray();
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🏷️ Role Information')
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'ID', value: role.id, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Position', value: role.position.toString(), inline: true },
            { name: 'Members', value: membersWithRole.toString(), inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false }
        )
        .setTimestamp();

    if (permissions.length > 0) {
        const permissionList = permissions.slice(0, 10).join(', ');
        embed.addFields({ 
            name: 'Key Permissions', 
            value: permissionList + (permissions.length > 10 ? '...' : ''), 
            inline: false 
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction) {
    const roles = interaction.guild.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position);

    if (roles.size === 0) {
        return interaction.reply({ content: '❌ No roles found in this server!', flags: MessageFlags.Ephemeral });
    }

    const roleList = roles.map(role => {
        const memberCount = role.members.size;
        return `${role} - ${memberCount} members`;
    }).slice(0, 20);

    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🏷️ Server Roles')
        .setDescription(roleList.join('\n'))
        .setFooter({ text: `Total: ${roles.size} roles${roles.size > 20 ? ' (showing first 20)' : ''}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleMembers(interaction) {
    const role = interaction.options.getRole('role');
    
    if (role.members.size === 0) {
        return interaction.reply({ 
            content: `❌ No members have the ${role.name} role!`, 
            flags: MessageFlags.Ephemeral 
        });
    }

    const members = role.members
        .sort((a, b) => a.user.username.localeCompare(b.user.username))
        .map(member => member.user.username)
        .slice(0, 50);

    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle(`👥 Members with ${role.name}`)
        .setDescription(members.join('\n'))
        .setFooter({ 
            text: `Total: ${role.members.size} members${role.members.size > 50 ? ' (showing first 50)' : ''}` 
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleReactionAdd(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to manage reaction roles!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');

    try {
        const message = await interaction.channel.messages.fetch(messageId);
        
        if (!message) {
            return interaction.reply({ content: '❌ Message not found!', flags: MessageFlags.Ephemeral });
        }

        // Add reaction role to database
        await database.addReactionRole(interaction.guild.id, messageId, emoji, role.id);
        
        // Add reaction to message
        await message.react(emoji);

        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('✅ Reaction Role Added')
            .setDescription(`Reaction role has been set up successfully!`)
            .addFields(
                { name: 'Message', value: `[Jump to message](${message.url})`, inline: true },
                { name: 'Emoji', value: emoji, inline: true },
                { name: 'Role', value: role.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Reaction role added: ${emoji} -> ${role.name} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error adding reaction role:', error);
        await interaction.reply({ content: '❌ Failed to add reaction role!', flags: MessageFlags.Ephemeral });
    }
}

async function handleReactionRemove(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to manage reaction roles!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');

    try {
        // Remove from database
        const result = await new Promise((resolve, reject) => {
            database.db.run(
                'DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?',
                [interaction.guild.id, messageId, emoji],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });

        if (result === 0) {
            return interaction.reply({ 
                content: '❌ No reaction role found for that emoji on that message!', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('❌ Reaction Role Removed')
            .setDescription(`Reaction role has been removed successfully!`)
            .addFields(
                { name: 'Message ID', value: messageId, inline: true },
                { name: 'Emoji', value: emoji, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`Reaction role removed: ${emoji} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error removing reaction role:', error);
        await interaction.reply({ content: '❌ Failed to remove reaction role!', flags: MessageFlags.Ephemeral });
    }
}

async function handleSelfAssign(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ 
            content: '❌ You don\'t have permission to create self-assign menus!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    // Get assignable roles (roles that are not managed and below bot's highest role)
    const assignableRoles = interaction.guild.roles.cache
        .filter(role => 
            !role.managed && 
            role.id !== interaction.guild.id &&
            role.position < interaction.guild.members.me.roles.highest.position
        )
        .sort((a, b) => b.position - a.position)
        .first(25); // Discord select menu limit

    if (assignableRoles.length === 0) {
        return interaction.reply({ 
            content: '❌ No assignable roles found!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🏷️ Self-Assignable Roles')
        .setDescription('Select roles from the dropdown menu below to assign/remove them!')
        .setFooter({ text: 'You can select multiple roles at once' })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('self_assign_roles')
        .setPlaceholder('Choose roles to assign/remove')
        .setMinValues(0)
        .setMaxValues(assignableRoles.length)
        .addOptions(
            assignableRoles.map(role => ({
                label: role.name,
                value: role.id,
                description: `${role.members.size} members`,
                emoji: role.unicodeEmoji || '🏷️'
            }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row] });
}
