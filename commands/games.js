const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Fun games and entertainment commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('8ball')
                .setDescription('Ask the magic 8-ball a question')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Your question for the 8-ball')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dice')
                .setDescription('Roll dice')
                .addIntegerOption(option =>
                    option.setName('sides')
                        .setDescription('Number of sides on the die (default: 6)')
                        .setMinValue(2)
                        .setMaxValue(100)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of dice to roll (default: 1)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coinflip')
                .setDescription('Flip a coin'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rps')
                .setDescription('Play Rock Paper Scissors with the bot')
                .addStringOption(option =>
                    option.setName('choice')
                        .setDescription('Your choice')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Rock', value: 'rock' },
                            { name: 'Paper', value: 'paper' },
                            { name: 'Scissors', value: 'scissors' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trivia')
                .setDescription('Play a trivia game'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('riddle')
                .setDescription('Get a riddle to solve'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('joke')
                .setDescription('Get a random joke')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case '8ball':
                    await handle8Ball(interaction);
                    break;
                case 'dice':
                    await handleDice(interaction);
                    break;
                case 'coinflip':
                    await handleCoinFlip(interaction);
                    break;
                case 'rps':
                    await handleRockPaperScissors(interaction);
                    break;
                case 'trivia':
                    await handleTrivia(interaction);
                    break;
                case 'riddle':
                    await handleRiddle(interaction);
                    break;
                case 'joke':
                    await handleJoke(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Error in games command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while executing the game command.', 
                ephemeral: true 
            });
        }
    }
};

async function handle8Ball(interaction) {
    const question = interaction.options.getString('question');
    
    const responses = [
        "It is certain", "It is decidedly so", "Without a doubt", "Yes definitely",
        "You may rely on it", "As I see it, yes", "Most likely", "Outlook good",
        "Yes", "Signs point to yes", "Reply hazy, try again", "Ask again later",
        "Better not tell you now", "Cannot predict now", "Concentrate and ask again",
        "Don't count on it", "My reply is no", "My sources say no",
        "Outlook not so good", "Very doubtful"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🎱 Magic 8-Ball')
        .addFields(
            { name: 'Question', value: question, inline: false },
            { name: 'Answer', value: randomResponse, inline: false }
        )
        .setFooter({ text: `Asked by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleDice(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;
    
    const rolls = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🎲 Dice Roll')
        .addFields(
            { name: 'Dice', value: `${count}d${sides}`, inline: true },
            { name: 'Rolls', value: rolls.join(', '), inline: true },
            { name: 'Total', value: total.toString(), inline: true }
        )
        .setFooter({ text: `Rolled by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCoinFlip(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🟡' : '⚪';
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🪙 Coin Flip')
        .setDescription(`${emoji} **${result}**`)
        .setFooter({ text: `Flipped by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRockPaperScissors(interaction) {
    const userChoice = interaction.options.getString('choice');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    
    const emojis = {
        rock: '🗿',
        paper: '📄',
        scissors: '✂️'
    };
    
    let result;
    if (userChoice === botChoice) {
        result = "It's a tie! 🤝";
    } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
    ) {
        result = "You win! 🎉";
    } else {
        result = "I win! 🤖";
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('✂️ Rock Paper Scissors')
        .addFields(
            { name: 'Your Choice', value: `${emojis[userChoice]} ${userChoice}`, inline: true },
            { name: 'Bot Choice', value: `${emojis[botChoice]} ${botChoice}`, inline: true },
            { name: 'Result', value: result, inline: false }
        )
        .setFooter({ text: `Played by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleTrivia(interaction) {
    const triviaQuestions = [
        {
            question: "What is the capital of France?",
            options: ["London", "Berlin", "Paris", "Madrid"],
            correct: 2,
            answer: "Paris"
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Venus", "Mars", "Jupiter", "Saturn"],
            correct: 1,
            answer: "Mars"
        },
        {
            question: "What is the largest mammal in the world?",
            options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
            correct: 1,
            answer: "Blue Whale"
        },
        {
            question: "In which year did World War II end?",
            options: ["1944", "1945", "1946", "1947"],
            correct: 1,
            answer: "1945"
        },
        {
            question: "What is the chemical symbol for gold?",
            options: ["Go", "Gd", "Au", "Ag"],
            correct: 2,
            answer: "Au"
        }
    ];
    
    const randomQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    
    const buttons = randomQuestion.options.map((option, index) => 
        new ButtonBuilder()
            .setCustomId(`trivia_${index}`)
            .setLabel(`${String.fromCharCode(65 + index)}. ${option}`)
            .setStyle(ButtonStyle.Primary)
    );
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🧠 Trivia Question')
        .setDescription(randomQuestion.question)
        .setFooter({ text: 'You have 30 seconds to answer!' })
        .setTimestamp();

    const response = await interaction.reply({ embeds: [embed], components: [row] });
    
    const filter = (i) => i.user.id === interaction.user.id && i.customId.startsWith('trivia_');
    
    try {
        const buttonInteraction = await response.awaitMessageComponent({ filter, time: 30000 });
        
        const selectedIndex = parseInt(buttonInteraction.customId.split('_')[1]);
        const isCorrect = selectedIndex === randomQuestion.correct;
        
        const resultEmbed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle(isCorrect ? '✅ Correct!' : '❌ Incorrect!')
            .setDescription(`The correct answer was: **${randomQuestion.answer}**`)
            .setFooter({ text: `Answered by ${interaction.user.username}` })
            .setTimestamp();

        await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
    } catch (error) {
        const timeoutEmbed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('⏰ Time\'s up!')
            .setDescription(`The correct answer was: **${randomQuestion.answer}**`)
            .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
}

async function handleRiddle(interaction) {
    const riddles = [
        {
            question: "What has keys but no locks, space but no room, and you can enter but not go inside?",
            answer: "A keyboard"
        },
        {
            question: "I'm tall when I'm young, and short when I'm old. What am I?",
            answer: "A candle"
        },
        {
            question: "What gets wet while drying?",
            answer: "A towel"
        },
        {
            question: "What has hands but cannot clap?",
            answer: "A clock"
        },
        {
            question: "The more you take, the more you leave behind. What am I?",
            answer: "Footsteps"
        }
    ];
    
    const randomRiddle = riddles[Math.floor(Math.random() * riddles.length)];
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🤔 Riddle')
        .setDescription(randomRiddle.question)
        .setFooter({ text: 'Think you know the answer? Reply with your guess!' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    
    // Store the answer for potential follow-up (in a real bot, you'd use a more persistent storage)
    global.riddleAnswers = global.riddleAnswers || new Map();
    global.riddleAnswers.set(interaction.user.id, randomRiddle.answer);
    
    // Auto-reveal after 60 seconds
    setTimeout(async () => {
        try {
            const revealEmbed = new EmbedBuilder()
                .setColor(0xD3D3D3)
                .setTitle('💡 Riddle Answer')
                .setDescription(`**${randomRiddle.answer}**`)
                .setTimestamp();

            await interaction.followUp({ embeds: [revealEmbed] });
        } catch (error) {
            // Interaction might have expired
        }
    }, 60000);
}

async function handleJoke(interaction) {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "I told my wife she was drawing her eyebrows too high. She looked surprised.",
        "Why don't programmers like nature? It has too many bugs.",
        "I'm reading a book about anti-gravity. It's impossible to put down!",
        "Why did the scarecrow win an award? He was outstanding in his field!",
        "What do you call a fake noodle? An impasta!",
        "Why don't eggs tell jokes? They'd crack each other up!",
        "What do you call a fish wearing a crown? A king fish!",
        "Why did the math book look so sad? Because it had too many problems!",
        "What do you call a sleeping bull? A bulldozer!"
    ];
    
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    
    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('😂 Random Joke')
        .setDescription(randomJoke)
        .setFooter({ text: `Requested by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
