const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const logger = require('../utils/logger');
const config = require('../config.json');

class MusicPlayer {
    constructor() {
        this.queues = new Map(); // guildId -> queue data
        this.players = new Map(); // guildId -> audio player
        this.connections = new Map(); // guildId -> voice connection
    }

    /**
     * Play music in a voice channel
     * @param {VoiceChannel} voiceChannel - Voice channel to join
     * @param {string} query - Search query or YouTube URL
     * @param {User} requestedBy - User who requested the song
     * @returns {Object} Result object
     */
    async play(voiceChannel, query, requestedBy) {
        const guildId = voiceChannel.guild.id;

        try {
            // Search for the track
            const track = await this.searchTrack(query);
            if (!track) {
                return { success: false, error: 'No results found for your search!' };
            }

            // Get or create queue
            let queue = this.queues.get(guildId);
            if (!queue) {
                queue = {
                    tracks: [],
                    volume: config.music.defaultVolume / 100,
                    currentTrack: null,
                    isPlaying: false
                };
                this.queues.set(guildId, queue);
            }

            // Check queue size limit
            if (queue.tracks.length >= config.music.maxQueueSize) {
                return { success: false, error: `Queue is full! Maximum ${config.music.maxQueueSize} songs allowed.` };
            }

            // Add track to queue
            track.requestedBy = requestedBy;
            queue.tracks.push(track);

            // Join voice channel if not already connected
            await this.joinVoiceChannel(voiceChannel);

            // Start playing if nothing is currently playing
            if (!queue.isPlaying) {
                await this.playNext(guildId);
            }

            return {
                success: true,
                track,
                position: queue.tracks.length
            };
        } catch (error) {
            logger.error('Error in play function:', error);
            return { success: false, error: 'Failed to play the track!' };
        }
    }

    /**
     * Search for a track
     * @param {string} query - Search query or YouTube URL
     * @returns {Object|null} Track object or null
     */
    async searchTrack(query) {
        try {
            let videoInfo;

            if (ytdl.validateURL(query)) {
                // Direct YouTube URL
                videoInfo = await ytdl.getInfo(query);
                return {
                    title: videoInfo.videoDetails.title,
                    url: videoInfo.videoDetails.video_url,
                    duration: this.formatDuration(videoInfo.videoDetails.lengthSeconds),
                    thumbnail: videoInfo.videoDetails.thumbnails[0]?.url
                };
            } else {
                // Search query
                const searchResults = await ytSearch(query);
                if (searchResults.videos.length === 0) {
                    return null;
                }

                const video = searchResults.videos[0];
                return {
                    title: video.title,
                    url: video.url,
                    duration: video.duration.timestamp,
                    thumbnail: video.thumbnail
                };
            }
        } catch (error) {
            logger.error('Error searching for track:', error);
            return null;
        }
    }

    /**
     * Join a voice channel
     * @param {VoiceChannel} voiceChannel - Voice channel to join
     */
    async joinVoiceChannel(voiceChannel) {
        const guildId = voiceChannel.guild.id;

        if (this.connections.has(guildId)) {
            return this.connections.get(guildId);
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        this.connections.set(guildId, connection);

        // Handle connection events
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            this.cleanup(guildId);
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.cleanup(guildId);
        });

        return connection;
    }

    /**
     * Play the next track in queue
     * @param {string} guildId - Guild ID
     */
    async playNext(guildId) {
        const queue = this.queues.get(guildId);
        const connection = this.connections.get(guildId);

        if (!queue || !connection || queue.tracks.length === 0) {
            queue.isPlaying = false;
            queue.currentTrack = null;

            // Leave voice channel if configured to do so
            if (config.music.leaveOnEmpty) {
                setTimeout(() => {
                    if (queue && queue.tracks.length === 0) {
                        this.leave(guildId);
                    }
                }, config.music.leaveTimeout * 1000);
            }
            return;
        }

        const track = queue.tracks.shift();
        queue.currentTrack = track;
        queue.isPlaying = true;

        try {
            // Create audio resource
            const stream = ytdl(track.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            const resource = createAudioResource(stream, {
                metadata: {
                    title: track.title
                }
            });

            // Get or create audio player
            let player = this.players.get(guildId);
            if (!player) {
                player = createAudioPlayer();
                this.players.set(guildId, player);

                // Handle player events
                player.on(AudioPlayerStatus.Idle, () => {
                    this.playNext(guildId);
                });

                player.on('error', (error) => {
                    logger.error(`Audio player error in guild ${guildId}:`, error);
                    this.playNext(guildId);
                });
            }

            // Play the resource
            player.play(resource);
            connection.subscribe(player);

            logger.info(`Now playing: ${track.title} in guild ${guildId}`);
        } catch (error) {
            logger.error('Error playing track:', error);
            queue.isPlaying = false;
            this.playNext(guildId);
        }
    }

    /**
     * Pause current playback
     * @param {string} guildId - Guild ID
     * @returns {Object} Result object
     */
    pause(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);

        if (!player || !queue || !queue.isPlaying) {
            return { success: false, error: 'Nothing is currently playing!' };
        }

        const success = player.pause();
        return success ? 
            { success: true } : 
            { success: false, error: 'Failed to pause playback!' };
    }

    /**
     * Resume current playback
     * @param {string} guildId - Guild ID
     * @returns {Object} Result object
     */
    resume(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);

        if (!player || !queue) {
            return { success: false, error: 'Nothing is currently paused!' };
        }

        const success = player.unpause();
        return success ? 
            { success: true } : 
            { success: false, error: 'Failed to resume playback!' };
    }

    /**
     * Stop current playback and clear queue
     * @param {string} guildId - Guild ID
     * @returns {Object} Result object
     */
    stop(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);

        if (!queue) {
            return { success: false, error: 'Nothing is currently playing!' };
        }

        if (player) {
            player.stop();
        }

        queue.tracks = [];
        queue.currentTrack = null;
        queue.isPlaying = false;

        return { success: true };
    }

    /**
     * Skip current track
     * @param {string} guildId - Guild ID
     * @returns {Object} Result object
     */
    skip(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);

        if (!queue || !queue.isPlaying) {
            return { success: false, error: 'Nothing is currently playing!' };
        }

        if (player) {
            player.stop(); // This will trigger the idle event and play next
        }

        const nextTrack = queue.tracks[0];
        return { 
            success: true, 
            nextTrack: nextTrack || null 
        };
    }

    /**
     * Set volume
     * @param {string} guildId - Guild ID
     * @param {number} volume - Volume level (0-100)
     * @returns {Object} Result object
     */
    setVolume(guildId, volume) {
        const queue = this.queues.get(guildId);

        if (!queue) {
            return { success: false, error: 'No active queue found!' };
        }

        queue.volume = Math.max(0, Math.min(1, volume / 100));
        return { success: true };
    }

    /**
     * Get current queue
     * @param {string} guildId - Guild ID
     * @returns {Array} Queue array
     */
    getQueue(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return [];

        const result = [];
        if (queue.currentTrack) {
            result.push(queue.currentTrack);
        }
        result.push(...queue.tracks);

        return result;
    }

    /**
     * Get currently playing track
     * @param {string} guildId - Guild ID
     * @returns {Object|null} Current track or null
     */
    getNowPlaying(guildId) {
        const queue = this.queues.get(guildId);
        return queue?.currentTrack || null;
    }

    /**
     * Leave voice channel
     * @param {string} guildId - Guild ID
     * @returns {Object} Result object
     */
    leave(guildId) {
        const connection = this.connections.get(guildId);
        
        if (!connection) {
            return { success: false, error: 'Not connected to a voice channel!' };
        }

        this.cleanup(guildId);
        return { success: true };
    }

    /**
     * Cleanup resources for a guild
     * @param {string} guildId - Guild ID
     */
    cleanup(guildId) {
        const player = this.players.get(guildId);
        const connection = this.connections.get(guildId);

        if (player) {
            player.stop();
            this.players.delete(guildId);
        }

        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }

        this.queues.delete(guildId);
        logger.info(`Cleaned up music resources for guild ${guildId}`);
    }

    /**
     * Format duration from seconds to mm:ss
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return 'Unknown';
        
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            activeQueues: this.queues.size,
            activePlayers: this.players.size,
            activeConnections: this.connections.size,
            totalTracks: Array.from(this.queues.values()).reduce((total, queue) => 
                total + queue.tracks.length + (queue.currentTrack ? 1 : 0), 0
            )
        };
    }
}

module.exports = new MusicPlayer();
