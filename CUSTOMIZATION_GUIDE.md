# Bot Customization Guide

## Overview

Your Discord bot now includes powerful customization features that allow administrators to change the bot's appearance and name directly through Discord commands.

## Features Added

### 1. Profile Picture Customization
- **Command:** `/utility customize type:Profile Picture value:[IMAGE_URL]`
- **Requirements:** Administrator permissions
- **Supported formats:** JPG, JPEG, PNG, GIF, WEBP
- **Example:** `/utility customize type:Profile Picture value:https://example.com/avatar.png`

### 2. Banner Customization
- **Command:** `/utility customize type:Banner value:[IMAGE_URL]`
- **Requirements:** Administrator permissions + Discord Premium for bots
- **Supported formats:** JPG, JPEG, PNG, GIF, WEBP
- **Example:** `/utility customize type:Banner value:https://example.com/banner.png`

### 3. Bot Name Customization
- **Command:** `/utility customize type:Name value:[NEW_NAME]`
- **Requirements:** Administrator permissions
- **Limitations:** 2-32 characters, Discord naming rules
- **Rate limit:** 2 changes per hour (Discord limitation)
- **Example:** `/utility customize type:Name value:MyAwesomeBot`

### 4. Customization History
- **Command:** `/utility customizations`
- **Requirements:** Administrator permissions
- **Shows:** Complete history of all bot customizations with dates and users

## How It Works

1. **Permission Check:** Only users with Administrator permission can use customization commands
2. **Validation:** URLs are validated for proper format and file extensions
3. **Discord API:** Changes are applied directly through Discord's API
4. **Database Storage:** All changes are logged in the database for history tracking
5. **Error Handling:** Clear error messages for invalid inputs or API limitations

## Database Storage

All customizations are stored in the `bot_customizations` table:
- **Type:** avatar, banner, or name
- **Value:** URL or new name
- **Updated by:** User who made the change
- **Timestamp:** When the change was made

## Error Handling

The system handles various error scenarios:
- Invalid image URLs
- Unsupported file formats
- Discord API rate limits
- Permission errors
- Banner changes without premium
- Name validation errors

## Security Features

- **Admin-only access:** Only users with Administrator permissions can make changes
- **URL validation:** Image URLs are validated for security
- **Rate limiting:** Built-in rate limiting prevents abuse
- **Audit trail:** Complete history of all changes with user tracking

## Usage Tips

1. Use direct image URLs (not gallery or webpage links)
2. Ensure images are publicly accessible
3. Consider image dimensions (Discord has specific requirements)
4. Test URLs before applying to avoid errors
5. Use the history command to track changes over time

## Example Workflow

```
1. Upload your desired image to a image hosting service
2. Copy the direct image URL
3. Use: /utility customize type:Profile Picture value:[URL]
4. Bot will validate and apply the change
5. Check history: /utility customizations
```

## Configuration

Bot customization settings can be modified in `config.json`:
```json
"botCustomization": {
    "allowAvatarChanges": true,
    "allowBannerChanges": true,
    "allowNameChanges": true,
    "maxNameLength": 32,
    "minNameLength": 2,
    "supportedImageFormats": ["jpg", "jpeg", "png", "gif", "webp"]
}
```