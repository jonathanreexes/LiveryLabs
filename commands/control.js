const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('control')
        .setDescription('Bot control commands (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Restart the bot (pineapple trigger)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sleep')
                .setDescription('Put the bot to sleep'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('wake')
                .setDescription('Wake the bot up'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check bot status')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'restart':
                    await interaction.reply('🍍 Restarting bot...');
                    logger.info(`Bot restart triggered via slash command by owner: ${interaction.user.tag}`);
                    
                    // Graceful restart
                    setTimeout(() => {
                        process.exit(0);
                    }, 1000);
                    break;

                case 'sleep':
                    await interaction.reply('💤 Bot going to sleep... Use `/control wake` to wake me up.');
                    logger.info(`Bot sleep mode activated via slash command by owner: ${interaction.user.tag}`);
                    
                    // Set bot to invisible and stop responding to commands
                    interaction.client.user.setPresence({
                        status: 'invisible',
                        activities: []
                    });
                    
                    // Set sleep flag
                    global.botSleeping = true;
                    break;

                case 'wake':
                    if (!global.botSleeping) {
                        return await interaction.reply({
                            content: '☀️ Bot is already awake!',
                            ephemeral: true
                        });
                    }

                    await interaction.reply('🌅 Bot is now awake and ready!');
                    logger.info(`Bot wake mode activated via slash command by owner: ${interaction.user.tag}`);
                    
                    // Set bot back to online
                    interaction.client.user.setPresence({
                        status: 'online',
                        activities: [{ name: 'Managing your server', type: 3 }]
                    });
                    
                    // Clear sleep flag
                    global.botSleeping = false;
                    break;

                case 'status':
                    const uptime = process.uptime();
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);
                    
                    const statusEmbed = {
                        title: '🤖 Bot Status',
                        fields: [
                            {
                                name: 'Status',
                                value: global.botSleeping ? '💤 Sleeping' : '✅ Online',
                                inline: true
                            },
                            {
                                name: 'Uptime',
                                value: `${hours}h ${minutes}m ${seconds}s`,
                                inline: true
                            },
                            {
                                name: 'Commands Available',
                                value: 'restart, sleep, wake, status',
                                inline: false
                            }
                        ],
                        color: global.botSleeping ? 0x808080 : 0x00ff00,
                        timestamp: new Date().toISOString()
                    };

                    await interaction.reply({ embeds: [statusEmbed] });
                    break;
            }
        } catch (error) {
            logger.error('Error in control command:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while executing the control command.',
                    ephemeral: true
                });
            }
        }
    }
};