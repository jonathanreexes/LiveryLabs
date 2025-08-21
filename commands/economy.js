const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check your or someone else\'s balance')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to check balance for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Claim your daily reward'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('work')
                .setDescription('Work to earn some coins'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pay')
                .setDescription('Pay another user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to pay')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to pay')
                        .setMinValue(1)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View the server\'s richest users'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('gamble')
                .setDescription('Gamble your coins')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to gamble')
                        .setMinValue(1)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('View the server shop'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy an item from the shop')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('The item to buy')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            // Ensure user exists in database
            await database.createUser(interaction.user.id, interaction.guild.id, interaction.user.username);

            switch (subcommand) {
                case 'balance':
                    await handleBalance(interaction);
                    break;
                case 'daily':
                    await handleDaily(interaction);
                    break;
                case 'work':
                    await handleWork(interaction);
                    break;
                case 'pay':
                    await handlePay(interaction);
                    break;
                case 'leaderboard':
                    await handleLeaderboard(interaction);
                    break;
                case 'gamble':
                    await handleGamble(interaction);
                    break;
                case 'shop':
                    await handleShop(interaction);
                    break;
                case 'buy':
                    await handleBuy(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Error in economy command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while executing the economy command.', 
                ephemeral: true 
            });
        }
    }
};

async function handleBalance(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    try {
        await database.createUser(user.id, interaction.guild.id, user.username);
        const userData = await database.getUser(user.id, interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💰 Balance')
            .setDescription(`${user.username} has **${userData.balance}** ${config.economy.currency}`)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error fetching balance:', error);
        await interaction.reply({ content: '❌ Failed to fetch balance!', ephemeral: true });
    }
}

async function handleDaily(interaction) {
    try {
        const userData = await database.getUser(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const lastDaily = userData.last_daily || 0;
        const timeUntilNext = 24 * 60 * 60 * 1000 - (now - lastDaily);

        if (timeUntilNext > 0) {
            const hours = Math.floor(timeUntilNext / (1000 * 60 * 60));
            const minutes = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
            
            return interaction.reply({ 
                content: `❌ You can claim your daily reward in **${hours}h ${minutes}m**!`, 
                ephemeral: true 
            });
        }

        const reward = config.economy.dailyReward;
        await database.updateUserBalance(interaction.user.id, interaction.guild.id, reward);
        
        // Update last daily timestamp
        await database.db.run(
            'UPDATE users SET last_daily = ? WHERE user_id = ? AND guild_id = ?',
            [now, interaction.user.id, interaction.guild.id]
        );

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎁 Daily Reward Claimed!')
            .setDescription(`You received **${reward}** ${config.economy.currency}!`)
            .addFields(
                { name: 'Next Daily', value: '<t:' + Math.floor((now + 24 * 60 * 60 * 1000) / 1000) + ':R>', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error with daily command:', error);
        await interaction.reply({ content: '❌ Failed to claim daily reward!', ephemeral: true });
    }
}

async function handleWork(interaction) {
    try {
        const workMessages = [
            "You worked as a programmer and earned",
            "You delivered pizzas and earned",
            "You worked at a coffee shop and earned",
            "You did some freelance work and earned",
            "You helped an old lady and she gave you",
            "You found some money on the ground worth",
            "You sold some old items and earned",
            "You completed a survey and earned"
        ];

        const randomMessage = workMessages[Math.floor(Math.random() * workMessages.length)];
        const earnings = Math.floor(Math.random() * config.economy.workReward) + 1;

        await database.updateUserBalance(interaction.user.id, interaction.guild.id, earnings);

        const embed = new EmbedBuilder()
            .setColor('#4285f4')
            .setTitle('💼 Work Complete!')
            .setDescription(`${randomMessage} **${earnings}** ${config.economy.currency}!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error with work command:', error);
        await interaction.reply({ content: '❌ Failed to work!', ephemeral: true });
    }
}

async function handlePay(interaction) {
    const recipient = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (recipient.id === interaction.user.id) {
        return interaction.reply({ content: '❌ You cannot pay yourself!', ephemeral: true });
    }

    if (recipient.bot) {
        return interaction.reply({ content: '❌ You cannot pay bots!', ephemeral: true });
    }

    try {
        await database.createUser(recipient.id, interaction.guild.id, recipient.username);
        const senderData = await database.getUser(interaction.user.id, interaction.guild.id);

        if (senderData.balance < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        }

        await database.updateUserBalance(interaction.user.id, interaction.guild.id, -amount);
        await database.updateUserBalance(recipient.id, interaction.guild.id, amount);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💸 Payment Sent!')
            .setDescription(`${interaction.user.username} paid **${amount}** ${config.economy.currency} to ${recipient.username}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error with pay command:', error);
        await interaction.reply({ content: '❌ Failed to send payment!', ephemeral: true });
    }
}

async function handleLeaderboard(interaction) {
    try {
        const leaderboard = await new Promise((resolve, reject) => {
            database.db.all(
                'SELECT user_id, username, balance FROM users WHERE guild_id = ? ORDER BY balance DESC LIMIT 10',
                [interaction.guild.id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        if (leaderboard.length === 0) {
            return interaction.reply({ content: '❌ No users found in the economy system!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏆 Server Leaderboard')
            .setDescription(
                leaderboard.map((user, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    return `${medal} **${user.username}** - ${user.balance} ${config.economy.currency}`;
                }).join('\n')
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error with leaderboard command:', error);
        await interaction.reply({ content: '❌ Failed to fetch leaderboard!', ephemeral: true });
    }
}

async function handleGamble(interaction) {
    const amount = interaction.options.getInteger('amount');

    try {
        const userData = await database.getUser(interaction.user.id, interaction.guild.id);

        if (userData.balance < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins to gamble!', ephemeral: true });
        }

        const chance = Math.random();
        let result, multiplier, color;

        if (chance < 0.45) {
            // Lose
            result = 'lost';
            multiplier = -1;
            color = '#ff0000';
        } else if (chance < 0.85) {
            // Win small
            result = 'won';
            multiplier = 1.5;
            color = '#00ff00';
        } else if (chance < 0.95) {
            // Win big
            result = 'won big';
            multiplier = 2;
            color = '#ffd700';
        } else {
            // Jackpot
            result = 'hit the jackpot';
            multiplier = 3;
            color = '#ff6b9d';
        }

        const winnings = Math.floor(amount * multiplier) - amount;
        await database.updateUserBalance(interaction.user.id, interaction.guild.id, winnings);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎰 Gambling Results')
            .setDescription(`You ${result}!`)
            .addFields(
                { name: 'Bet Amount', value: `${amount} ${config.economy.currency}`, inline: true },
                { name: 'Result', value: winnings >= 0 ? `+${winnings} ${config.economy.currency}` : `${winnings} ${config.economy.currency}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error with gamble command:', error);
        await interaction.reply({ content: '❌ Failed to gamble!', ephemeral: true });
    }
}

async function handleShop(interaction) {
    const shopItems = [
        { name: 'Custom Role Color', price: 1000, description: 'Get a custom colored role for 30 days' },
        { name: 'VIP Status', price: 2500, description: 'Get VIP perks for 7 days' },
        { name: 'Custom Nickname', price: 500, description: 'Set a custom nickname for 24 hours' },
        { name: 'Bot Avatar Change', price: 5000, description: 'Change the bot\'s avatar for 1 hour' },
        { name: 'Server Boost Equivalent', price: 10000, description: 'Get boost-like perks for 24 hours' }
    ];

    const embed = new EmbedBuilder()
        .setColor('#4285f4')
        .setTitle('🛒 Server Shop')
        .setDescription('Use `/economy buy <item>` to purchase items!')
        .addFields(
            shopItems.map(item => ({
                name: `${item.name} - ${item.price} ${config.economy.currency}`,
                value: item.description,
                inline: false
            }))
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleBuy(interaction) {
    const itemName = interaction.options.getString('item');
    
    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🛒 Shop Purchase')
        .setDescription(`Shop purchasing for **${itemName}** is not yet implemented. This feature requires additional server configuration.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
