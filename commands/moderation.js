const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Moderation commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a user from the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the kick')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a user from the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Days of messages to delete (0-7)')
                        .setMinValue(0)
                        .setMaxValue(7)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Mute a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to mute')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the mute')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Warn a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to warn')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnings')
                .setDescription('View warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to check warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear messages from a channel')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of messages to delete (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ 
                content: '❌ You do not have permission to use moderation commands!', 
                ephemeral: true 
            });
        }

        try {
            switch (subcommand) {
                case 'kick':
                    await handleKick(interaction);
                    break;
                case 'ban':
                    await handleBan(interaction);
                    break;
                case 'mute':
                    await handleMute(interaction);
                    break;
                case 'warn':
                    await handleWarn(interaction);
                    break;
                case 'warnings':
                    await handleWarnings(interaction);
                    break;
                case 'clear':
                    await handleClear(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Error in moderation command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while executing the command.', 
                ephemeral: true 
            });
        }
    }
};

async function handleKick(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
    }

    if (!member.kickable) {
        return interaction.reply({ content: '❌ I cannot kick this user!', ephemeral: true });
    }

    try {
        await member.kick(reason);
        
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('👢 User Kicked')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`User ${user.tag} kicked by ${interaction.user.tag} for: ${reason}`);
    } catch (error) {
        logger.error('Error kicking user:', error);
        await interaction.reply({ content: '❌ Failed to kick the user!', ephemeral: true });
    }
}

async function handleBan(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;
    const member = interaction.guild.members.cache.get(user.id);

    if (member && !member.bannable) {
        return interaction.reply({ content: '❌ I cannot ban this user!', ephemeral: true });
    }

    try {
        await interaction.guild.members.ban(user, { deleteMessageDays: days, reason });
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔨 User Banned')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Messages Deleted', value: `${days} days`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`User ${user.tag} banned by ${interaction.user.tag} for: ${reason}`);
    } catch (error) {
        logger.error('Error banning user:', error);
        await interaction.reply({ content: '❌ Failed to ban the user!', ephemeral: true });
    }
}

async function handleMute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration') || config.moderation.defaultMuteDuration;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
    }

    try {
        const muteUntil = new Date(Date.now() + duration * 60 * 1000);
        await member.timeout(duration * 60 * 1000, reason);
        
        const embed = new EmbedBuilder()
            .setColor('#ffa500')
            .setTitle('🔇 User Muted')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Duration', value: `${duration} minutes`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Muted Until', value: `<t:${Math.floor(muteUntil.getTime() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        logger.info(`User ${user.tag} muted by ${interaction.user.tag} for ${duration} minutes: ${reason}`);
    } catch (error) {
        logger.error('Error muting user:', error);
        await interaction.reply({ content: '❌ Failed to mute the user!', ephemeral: true });
    }
}

async function handleWarn(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    
    try {
        // Ensure user exists in database
        await database.createUser(user.id, interaction.guild.id, user.username);
        
        // Add warning
        await database.addWarning(user.id, interaction.guild.id, reason, interaction.user.id);
        
        // Get updated user data
        const userData = await database.getUser(user.id, interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('⚠️ User Warned')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Total Warnings', value: `${userData.warnings}`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
        // Auto-action if warnings exceed threshold
        if (userData.warnings >= config.moderation.maxWarnings) {
            const member = interaction.guild.members.cache.get(user.id);
            if (member && member.bannable) {
                await member.ban({ reason: `Exceeded maximum warnings (${config.moderation.maxWarnings})` });
                await interaction.followUp({ content: `🔨 ${user.tag} has been automatically banned for exceeding the warning limit.` });
            }
        }
        
        logger.info(`User ${user.tag} warned by ${interaction.user.tag}: ${reason}`);
    } catch (error) {
        logger.error('Error warning user:', error);
        await interaction.reply({ content: '❌ Failed to warn the user!', ephemeral: true });
    }
}

async function handleWarnings(interaction) {
    const user = interaction.options.getUser('user');
    
    try {
        const userData = await database.getUser(user.id, interaction.guild.id);
        
        if (!userData) {
            return interaction.reply({ content: '❌ No data found for this user!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#4285f4')
            .setTitle('📋 User Warnings')
            .setDescription(`**${user.tag}** has **${userData.warnings}** warnings`)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error fetching warnings:', error);
        await interaction.reply({ content: '❌ Failed to fetch warnings!', ephemeral: true });
    }
}

async function handleClear(interaction) {
    const amount = interaction.options.getInteger('amount');
    
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: '❌ You need Manage Messages permission!', ephemeral: true });
    }

    try {
        const messages = await interaction.channel.bulkDelete(amount, true);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🧹 Messages Cleared')
            .setDescription(`Successfully deleted **${messages.size}** messages`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        logger.info(`${messages.size} messages cleared by ${interaction.user.tag} in ${interaction.channel.name}`);
    } catch (error) {
        logger.error('Error clearing messages:', error);
        await interaction.reply({ content: '❌ Failed to clear messages!', ephemeral: true });
    }
}
