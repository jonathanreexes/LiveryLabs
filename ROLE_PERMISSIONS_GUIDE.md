# Discord Role Management & Permissions Guide
*Complete setup guide for Livery Labs Discord server*

## Overview
This guide covers everything you need to know about setting up roles and permissions in your Discord server, specifically designed for a multi-bot environment with Livery Labs, Dyno, and a ticketing bot.

## Understanding Discord Permissions

### Permission Hierarchy
Discord permissions work on a **hierarchy system**:
1. **Server Owner** - Has all permissions automatically
2. **Administrator** - Has all permissions except owner-only actions
3. **Role Position** - Higher positioned roles override lower ones
4. **Channel Overrides** - Can grant or deny specific permissions per channel

### Key Permission Categories

#### **Administrative Permissions**
- `Administrator` - Grants ALL permissions (use sparingly)
- `Manage Server` - Edit server settings, create invites
- `Manage Roles` - Create/edit roles below their position
- `Manage Channels` - Create/edit/delete channels
- `Manage Messages` - Delete any message, pin messages
- `Manage Nicknames` - Change other users' nicknames
- `Kick Members` - Remove users temporarily
- `Ban Members` - Remove users permanently
- `Moderate Members` - Timeout users

#### **Communication Permissions**
- `Send Messages` - Basic chatting ability
- `Send Messages in Threads` - Participate in thread discussions
- `Create Public Threads` - Start new thread discussions
- `Send TTS Messages` - Text-to-speech messages
- `Embed Links` - Auto-embed URLs
- `Attach Files` - Upload images/documents
- `Use External Emojis` - Emojis from other servers
- `Use External Stickers` - Stickers from other servers
- `Add Reactions` - React to messages
- `Use Slash Commands` - Access bot commands

#### **Voice Permissions**
- `Connect` - Join voice channels
- `Speak` - Talk in voice channels
- `Video` - Use camera in voice channels
- `Use Voice Activity` - Voice detection (vs push-to-talk)
- `Priority Speaker` - Louder voice, reduces others' volume
- `Mute Members` - Mute other users
- `Deafen Members` - Deafen other users
- `Move Members` - Move users between voice channels

## Recommended Role Structure

### Core Staff Roles

#### **🔴 Owner**
- **Position**: Highest
- **Permissions**: All (automatic)
- **Purpose**: Ultimate authority, server configuration
- **Who Gets It**: You only
- **Color**: Red (#FF0000)

#### **🟡 Admin**
- **Position**: Second highest
- **Key Permissions**:
  - Administrator (or specific admin permissions)
  - Manage Server
  - Manage Roles (for roles below them)
  - Manage Channels
  - Ban Members
  - Kick Members
  - Moderate Members
- **Purpose**: Server management, handle serious issues
- **Who Gets It**: Trusted long-term helpers
- **Color**: Orange (#FF8C00)

#### **🟢 Moderator**
- **Position**: Third highest
- **Key Permissions**:
  - Manage Messages
  - Moderate Members (timeout)
  - Kick Members
  - Manage Nicknames
  - View Audit Log
- **Purpose**: Daily moderation, enforce rules
- **Who Gets It**: Active community helpers
- **Color**: Green (#00FF00)

#### **🔵 Helper**
- **Position**: Fourth highest
- **Key Permissions**:
  - Manage Messages (in specific channels only)
  - View Audit Log
  - All standard user permissions
- **Purpose**: Answer questions, light moderation
- **Who Gets It**: Helpful community members
- **Color**: Blue (#0080FF)

### Member Roles

#### **✅ Verified**
- **Position**: Above unverified
- **Key Permissions**:
  - Send Messages
  - Embed Links
  - Attach Files
  - Add Reactions
  - Use External Emojis
  - Connect (voice)
  - Speak
  - Use Voice Activity
  - Use Slash Commands
- **Purpose**: Confirmed server members
- **Who Gets It**: Users who complete verification
- **Color**: Light Blue (#87CEEB)

#### **👤 Member**
- **Position**: Base level
- **Key Permissions**:
  - Read Message History
  - Send Messages (limited channels)
  - Add Reactions
  - Connect (to specific voice channels)
- **Purpose**: New/unverified users
- **Who Gets It**: Everyone on join
- **Color**: Gray (#808080)

### Special Roles

#### **🎵 DJ**
- **Position**: Above verified
- **Key Permissions**:
  - All Verified permissions
  - Priority Speaker (in music channels)
- **Purpose**: Music queue management privileges
- **Who Gets It**: Trusted music users
- **Color**: Purple (#8A2BE2)

#### **🎮 Gamer**
- **Position**: Same as verified
- **Key Permissions**:
  - All Verified permissions
  - Access to gaming channels
- **Purpose**: Gaming community access
- **Who Gets It**: Active gamers
- **Color**: Red (#FF4500)

#### **🎨 Creator**
- **Position**: Same as verified
- **Key Permissions**:
  - All Verified permissions
  - Attach Files (larger limit)
  - Embed Links
- **Purpose**: Content creation, art sharing
- **Who Gets It**: Artists, content creators
- **Color**: Pink (#FF69B4)

## Channel-Specific Permission Setup

### Text Channels

#### **#general** (Public Chat)
- **@everyone**: Read Messages, Send Messages, Add Reactions
- **@Member**: Send Messages, Embed Links
- **@Verified**: All standard permissions
- **@Moderator**: Manage Messages

#### **#announcements** (Important Updates)
- **@everyone**: Read Messages, Add Reactions
- **@Member**: Read Messages only
- **@Verified**: Read Messages, Add Reactions
- **@Admin**: Send Messages, Manage Messages

#### **#verification** (Bot Verification)
- **@everyone**: Read Messages
- **@Member**: Read Messages, Use Slash Commands
- **@Verified**: Denied access (already verified)
- **Livery Labs Bot**: Send Messages, Manage Messages

#### **#music-requests** (Music Commands)
- **@everyone**: Denied
- **@Verified**: Send Messages, Use Slash Commands
- **@DJ**: All permissions
- **Livery Labs Bot**: Send Messages, Manage Messages

#### **#gaming** (Gaming Discussion)
- **@everyone**: Denied
- **@Verified**: Read Messages
- **@Gamer**: Send Messages, Embed Links, Attach Files
- **@Moderator**: Manage Messages

#### **#showcase** (Art/Content Sharing)
- **@everyone**: Read Messages, Add Reactions
- **@Verified**: Read Messages, Add Reactions
- **@Creator**: Send Messages, Embed Links, Attach Files
- **@Moderator**: Manage Messages

#### **#mod-chat** (Staff Only)
- **@everyone**: Denied all
- **@Helper**: Read Messages, Send Messages
- **@Moderator**: All permissions
- **@Admin**: All permissions

### Voice Channels

#### **🔊 General Voice**
- **@everyone**: Denied
- **@Verified**: Connect, Speak, Use Voice Activity
- **@Moderator**: Mute Members, Move Members

#### **🎵 Music Lounge**
- **@everyone**: Denied
- **@Verified**: Connect, Speak
- **@DJ**: Priority Speaker, Move Members
- **Livery Labs Bot**: Connect, Speak

#### **🎮 Gaming Voice**
- **@everyone**: Denied
- **@Gamer**: Connect, Speak, Video, Use Voice Activity
- **@Moderator**: Mute Members, Move Members

#### **🔒 Staff Voice**
- **@everyone**: Denied all
- **@Helper**: Connect, Speak
- **@Moderator**: All voice permissions
- **@Admin**: All voice permissions

## Bot Integration Permissions

### Livery Labs Bot
**Required Permissions**:
- Send Messages
- Manage Messages
- Embed Links
- Add Reactions
- Use Slash Commands
- Connect (voice)
- Speak (voice)
- Manage Roles (for verification role only)

**Recommended Role Position**: Just below @Helper

### Dyno Bot
**Required Permissions**:
- Administrator (or specific moderation permissions)
- Manage Messages
- Ban Members
- Kick Members
- Moderate Members
- View Audit Log

**Recommended Role Position**: Between @Admin and @Moderator

### Ticketing Bot
**Required Permissions**:
- Send Messages
- Manage Messages
- Manage Channels (create ticket channels)
- Embed Links
- Add Reactions

**Recommended Role Position**: Just below @Helper

## Security Best Practices

### Permission Guidelines
1. **Principle of Least Privilege**: Give minimum permissions needed
2. **Role Separation**: Don't combine unrelated permissions
3. **Regular Audits**: Review permissions monthly
4. **Bot Permissions**: Limit bot roles to specific needs
5. **Channel Overrides**: Use for fine-grained control

### Common Mistakes to Avoid
❌ **DON'T**: Give @everyone Administrator permission
❌ **DON'T**: Make bot roles too high in hierarchy
❌ **DON'T**: Give Manage Roles to untrusted users
❌ **DON'T**: Forget to deny @everyone in private channels
❌ **DON'T**: Give Send Messages to @everyone in announcement channels

✅ **DO**: Use channel-specific overrides
✅ **DO**: Test permissions before going live
✅ **DO**: Document permission changes
✅ **DO**: Use role hierarchy effectively
✅ **DO**: Regular permission reviews

## Implementation Steps

### Phase 1: Basic Setup
1. Create core staff roles (Owner, Admin, Moderator)
2. Set up basic member roles (Verified, Member)
3. Configure bot permissions
4. Test verification system

### Phase 2: Channel Configuration
1. Create channel categories
2. Set up channel-specific permissions
3. Configure private staff channels
4. Test all channel access

### Phase 3: Special Roles
1. Add community-specific roles (DJ, Gamer, Creator)
2. Set up reaction roles system
3. Configure auto-role assignment
4. Test all role functionality

### Phase 4: Fine-Tuning
1. Adjust permissions based on usage
2. Add additional roles as needed
3. Regular permission audits
4. Community feedback integration

## Quick Reference Commands

### Using Livery Labs Bot for Roles
```
/roles add @user @role           # Add role to user
/roles remove @user @role        # Remove role from user
/roles list                      # Show all roles
/roles reaction setup            # Set up reaction roles
```

### Verification Setup
```
/verification setup 
    title:"Welcome to Livery Labs" 
    message:"Click to verify and unlock all channels!" 
    success_title:"Welcome!" 
    success_message:"You're now verified! Check out our channels!" 
    color:#7289DA
    verified_role:@Verified
```

## Troubleshooting

### Common Issues
- **Bot can't assign roles**: Check bot role position
- **Users can't see channels**: Check @everyone permissions
- **Commands not working**: Verify Use Slash Commands permission
- **Voice issues**: Check Connect and Speak permissions

### Permission Testing
1. Create test account
2. Assign roles step by step
3. Test each permission level
4. Document any issues
5. Adjust as needed

---

*This guide covers the essential setup for a professional Discord server with proper role management and security. Refer back to this when configuring your server permissions.*