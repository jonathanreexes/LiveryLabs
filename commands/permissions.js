const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('Manage command visibility permissions (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up command visibility for roles')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to grant command visibility')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Grant or revoke visibility')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Grant Visibility', value: 'grant' },
                            { name: 'Revoke Visibility', value: 'revoke' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List roles that can see commands'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update command permissions for all commands')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'setup':
                    await this.handleSetup(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'update':
                    await this.handleUpdate(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Error in permissions command:', error);
            
            const errorMessage = '❌ An error occurred while managing permissions.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
            }
        }
    },

    async handleSetup(interaction) {
        const role = interaction.options.getRole('role');
        const action = interaction.options.getString('action');
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Get all bot commands
            const commands = await interaction.guild.commands.fetch();
            
            for (const [commandId, command] of commands) {
                // Skip the permissions command itself - always owner only
                if (command.name === 'permissions') continue;

                const permissions = [];
                
                if (action === 'grant') {
                    // Grant view permission to the role, but deny execution
                    permissions.push({
                        id: role.id,
                        type: 1, // Role type
                        permission: true // Can see the command
                    });
                }
                
                // Always ensure has full access 
                permissions.push({
                    id: interaction.guild.ownerId,
                    type: 2, // User type
                    permission: true
                });

                try {
                    await command.permissions.set({ permissions });
                } catch (permError) {
                    logger.warn(`Could not set permissions for command ${command.name}:`, permError.message);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔧 Command Permissions Updated')
                .setDescription(`${action === 'grant' ? 'Granted' : 'Revoked'} command visibility for ${role.name}`)
                .addFields([
                    {
                        name: 'Role',
                        value: `${role}`,
                        inline: true
                    },
                    {
                        name: 'Action',
                        value: action === 'grant' ? '✅ Granted Visibility' : '❌ Revoked Visibility',
                        inline: true
                    },
                    {
                        name: 'Note',
                        value: 'Only the server owner can execute commands regardless of visibility.',
                        inline: false
                    }
                ])
                .setColor(0xD3D3D3)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Error setting up permissions:', error);
            await interaction.editReply({
                content: '❌ Failed to update command permissions. Make sure the bot has proper permissions.'
            });
        }
    },

    async handleList(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const commands = await interaction.guild.commands.fetch();
            const permissionInfo = [];

            for (const [commandId, command] of commands) {
                if (command.name === 'permissions') continue;

                try {
                    const permissions = await command.permissions.fetch();
                    const rolePerms = permissions.filter(p => p.type === 1 && p.permission);
                    
                    if (rolePerms.length > 0) {
                        const roleNames = rolePerms.map(p => {
                            const role = interaction.guild.roles.cache.get(p.id);
                            return role ? role.name : 'Unknown Role';
                        }).join(', ');
                        
                        permissionInfo.push(`**/${command.name}**: ${roleNames}`);
                    }
                } catch (error) {
                    // Command might not have custom permissions set
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('👁️ Command Visibility Permissions')
                .setDescription(permissionInfo.length > 0 
                    ? permissionInfo.join('\n') 
                    : 'No special visibility permissions set. Only owner can see and use commands.')
                .addFields([
                    {
                        name: 'Default Roles (Auto-detected)',
                        value: 'Administrator, Admin, Moderator, Mod, Staff, Helper, Bot Manager, Server Manager',
                        inline: false
                    },
                    {
                        name: 'Execution Access',
                        value: 'Server Owner Only',
                        inline: true
                    }
                ])
                .setColor(0xD3D3D3)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error listing permissions:', error);
            await interaction.editReply({
                content: '❌ Failed to fetch command permissions.'
            });
        }
    },

    async handleUpdate(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Refresh all command permissions
            const commands = await interaction.guild.commands.fetch();
            let updated = 0;

            for (const [commandId, command] of commands) {
                if (command.name === 'permissions') continue;

                try {
                    // Reset to default permissions (owner only)
                    await command.permissions.set({
                        permissions: [{
                            id: interaction.guild.ownerId,
                            type: 2, // User type
                            permission: true
                        }]
                    });
                    updated++;
                } catch (error) {
                    logger.warn(`Could not update permissions for ${command.name}:`, error.message);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔄 Permissions Reset')
                .setDescription(`Updated permissions for ${updated} commands`)
                .addFields([
                    {
                        name: 'Status',
                        value: 'All commands reset to owner-only access',
                        inline: false
                    },
                    {
                        name: 'Next Steps',
                        value: 'Use `/permissions setup` to grant visibility to specific roles',
                        inline: false
                    }
                ])
                .setColor(0xD3D3D3)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error updating permissions:', error);
            await interaction.editReply({
                content: '❌ Failed to update command permissions.'
            });
        }
    }
};