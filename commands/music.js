const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const musicPlayer = require('../services/musicPlayer');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music playback commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a song from YouTube')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Song name or YouTube URL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume the paused song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop playing and clear the queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Show the current music queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('volume')
                .setDescription('Set the music volume')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('Volume level (0-100)')
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Show the currently playing song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Make the bot leave the voice channel')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Timeout protection - acknowledge immediately
        const timeoutId = setTimeout(async () => {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply().catch(() => {});
            }
        }, 250);

        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel && !['queue', 'nowplaying'].includes(subcommand)) {
                clearTimeout(timeoutId);
                return interaction.reply({ 
                    content: '❌ You need to be in a voice channel to use music commands!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            switch (subcommand) {
                case 'play':
                    await handlePlay(interaction, voiceChannel);
                    break;
                case 'pause':
                    await handlePause(interaction);
                    break;
                case 'resume':
                    await handleResume(interaction);
                    break;
                case 'stop':
                    await handleStop(interaction);
                    break;
                case 'skip':
                    await handleSkip(interaction);
                    break;
                case 'queue':
                    await handleQueue(interaction);
                    break;
                case 'volume':
                    await handleVolume(interaction);
                    break;
                case 'nowplaying':
                    await handleNowPlaying(interaction);
                    break;
                case 'leave':
                    await handleLeave(interaction);
                    break;
            }
            
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error('Error in music command:', error);
            
            // Fix: Use proper interaction state handling
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ An error occurred while executing the music command.', 
                        flags: MessageFlags.Ephemeral 
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({ 
                        content: '❌ An error occurred while executing the music command.' 
                    });
                }
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};

async function handlePlay(interaction, voiceChannel) {
    const query = interaction.options.getString('query');
    
    await interaction.deferReply();
    
    try {
        const result = await musicPlayer.play(voiceChannel, query, interaction.user);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0xD3D3D3)
                .setTitle('🎵 Added to Queue')
                .setDescription(`**${result.track.title}**`)
                .addFields(
                    { name: 'Duration', value: result.track.duration || 'Unknown', inline: true },
                    { name: 'Requested by', value: interaction.user.toString(), inline: true },
                    { name: 'Position in queue', value: result.position.toString(), inline: true }
                )
                .setThumbnail(result.track.thumbnail || null)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ content: `❌ ${result.error}` });
        }
    } catch (error) {
        logger.error('Error playing music:', error);
        await interaction.editReply({ content: '❌ Failed to play the requested song!' });
    }
}

async function handlePause(interaction) {
    const result = musicPlayer.pause(interaction.guild.id);
    
    if (result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('⏸️ Music Paused')
            .setDescription('The music has been paused')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
}

async function handleResume(interaction) {
    const result = musicPlayer.resume(interaction.guild.id);
    
    if (result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('▶️ Music Resumed')
            .setDescription('The music has been resumed')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
}

async function handleStop(interaction) {
    const result = musicPlayer.stop(interaction.guild.id);
    
    if (result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('⏹️ Music Stopped')
            .setDescription('Music stopped and queue cleared')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
}

async function handleSkip(interaction) {
    const result = musicPlayer.skip(interaction.guild.id);
    
    if (result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('⏭️ Song Skipped')
            .setDescription(result.nextTrack ? `Now playing: **${result.nextTrack.title}**` : 'Queue is now empty')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
}

async function handleQueue(interaction) {
    const queue = musicPlayer.getQueue(interaction.guild.id);
    
    if (!queue || queue.length === 0) {
        return interaction.reply({ content: '❌ The music queue is empty!', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🎵 Music Queue')
        .setTimestamp();

    const queueList = queue.slice(0, 10).map((track, index) => {
        const position = index === 0 ? '🎵 Now Playing' : `${index}.`;
        return `${position} **${track.title}** - Requested by ${track.requestedBy.username}`;
    }).join('\n');

    embed.setDescription(queueList);
    
    if (queue.length > 10) {
        embed.setFooter({ text: `And ${queue.length - 10} more songs...` });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleVolume(interaction) {
    const volume = interaction.options.getInteger('level');
    const result = musicPlayer.setVolume(interaction.guild.id, volume);
    
    if (result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('🔊 Volume Changed')
            .setDescription(`Volume set to **${volume}%**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
}

async function handleNowPlaying(interaction) {
    const nowPlaying = musicPlayer.getNowPlaying(interaction.guild.id);
    
    if (!nowPlaying) {
        return interaction.reply({ content: '❌ Nothing is currently playing!', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setColor(0xD3D3D3)
        .setTitle('🎵 Now Playing')
        .setDescription(`**${nowPlaying.title}**`)
        .addFields(
            { name: 'Duration', value: nowPlaying.duration || 'Unknown', inline: true },
            { name: 'Requested by', value: nowPlaying.requestedBy.username, inline: true }
        )
        .setThumbnail(nowPlaying.thumbnail || null)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeave(interaction) {
    const result = musicPlayer.leave(interaction.guild.id);
    
    if (result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xD3D3D3)
            .setTitle('👋 Left Voice Channel')
            .setDescription('Disconnected from voice channel and cleared the queue')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
}
