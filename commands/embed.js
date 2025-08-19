const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create a custom embed message (Owner Only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Embed title')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Embed message/description')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Hex color code (e.g., #FF5733 or ff5733)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Image to display in the embed')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the embed (defaults to current)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author')
                .setDescription('Author name (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('Thumbnail image URL (optional)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check if user is server owner
            if (interaction.user.id !== interaction.guild.ownerId) {
                return await interaction.reply({
                    content: '❌ This command can only be used by the server owner.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const title = interaction.options.getString('title');
            const message = interaction.options.getString('message');
            const colorInput = interaction.options.getString('color');
            const imageAttachment = interaction.options.getAttachment('image');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const footerText = interaction.options.getString('footer');
            const authorName = interaction.options.getString('author');
            const thumbnailUrl = interaction.options.getString('thumbnail');

            // Validate target channel
            if (targetChannel.type !== 0) { // 0 = GUILD_TEXT
                return await interaction.editReply({
                    content: '❌ Embeds can only be sent to text channels.'
                });
            }

            // Check bot permissions in target channel
            const botMember = interaction.guild.members.me;
            const channelPermissions = targetChannel.permissionsFor(botMember);
            
            if (!channelPermissions.has(['SendMessages', 'EmbedLinks'])) {
                return await interaction.editReply({
                    content: '❌ I need Send Messages and Embed Links permissions in that channel.'
                });
            }

            // Validate and parse color
            let embedColor = 0x5865F2; // Default Discord blue
            if (colorInput) {
                const cleanColor = colorInput.replace('#', '');
                if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
                    embedColor = parseInt(cleanColor, 16);
                } else {
                    return await interaction.editReply({
                        content: '❌ Invalid color format. Please use hex format like #FF5733 or FF5733.'
                    });
                }
            }

            // Validate thumbnail URL if provided
            if (thumbnailUrl && !this.isValidImageUrl(thumbnailUrl)) {
                return await interaction.editReply({
                    content: '❌ Invalid thumbnail URL. Please provide a valid image URL (jpg, jpeg, png, gif, webp).'
                });
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(message)
                .setColor(embedColor);

            // Add optional fields
            if (footerText) {
                embed.setFooter({ text: footerText });
            }

            if (authorName) {
                embed.setAuthor({ name: authorName });
            }

            if (thumbnailUrl) {
                embed.setThumbnail(thumbnailUrl);
            }

            // Handle image attachment
            if (imageAttachment) {
                // Validate image attachment
                if (!this.isValidImageFile(imageAttachment)) {
                    return await interaction.editReply({
                        content: '❌ Invalid image file. Please upload a valid image (jpg, jpeg, png, gif, webp) under 8MB.'
                    });
                }

                try {
                    // Use Discord's direct URL approach - no temp file needed
                    const imageFileName = `embed_image_${randomUUID().slice(0, 8)}.${this.getFileExtension(imageAttachment.name)}`;
                    
                    // Download image data directly to buffer
                    const imageResponse = await fetch(imageAttachment.url);
                    if (!imageResponse.ok) {
                        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                    }
                    
                    const imageBuffer = await imageResponse.arrayBuffer();
                    
                    // Create attachment for Discord
                    const imageAttachmentBuilder = new AttachmentBuilder(Buffer.from(imageBuffer), { 
                        name: imageFileName 
                    });

                    // Set image in embed
                    embed.setImage(`attachment://${imageFileName}`);

                    // Send embed with attached image
                    const embedMessage = await targetChannel.send({ 
                        embeds: [embed], 
                        files: [imageAttachmentBuilder] 
                    });

                    await interaction.editReply({
                        content: `✅ Custom embed sent successfully to ${targetChannel}!\n\n[View Message](${embedMessage.url})`
                    });

                    logger.info(`Custom embed created by ${interaction.user.tag} in ${interaction.guild.name}: ${title}`);
                    return;

                } catch (error) {
                    logger.error('Error processing image attachment:', error);
                    return await interaction.editReply({
                        content: `❌ Failed to process the image attachment. Error: ${error.message}`
                    });
                }
            }

            // Send embed without image
            const embedMessage = await targetChannel.send({ embeds: [embed] });

            await interaction.editReply({
                content: `✅ Custom embed sent successfully to ${targetChannel}!\n\n[View Message](${embedMessage.url})`
            });

            logger.info(`Custom embed created by ${interaction.user.tag} in ${interaction.guild.name}: ${title}`);

        } catch (error) {
            logger.error('Error in embed command:', error);
            
            const errorMessage = '❌ An error occurred while creating the embed.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },

    isValidImageUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname.toLowerCase();
            return pathname.match(/\.(jpg|jpeg|png|gif|webp)$/);
        } catch {
            return false;
        }
    },

    isValidImageFile(attachment) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 8 * 1024 * 1024; // 8MB
        
        return validTypes.includes(attachment.contentType) && attachment.size <= maxSize;
    },

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },


};