# Discord Role Permissions Guide for Livery Labs Bot
*A comprehensive guide for setting up Discord roles with proper permissions for your multi-bot server*

## Table of Contents
1. [Understanding Discord Permissions](#understanding-discord-permissions)
2. [Multi-Bot Server Strategy](#multi-bot-server-strategy)
3. [Essential Role Hierarchy](#essential-role-hierarchy)
4. [Detailed Permission Breakdown](#detailed-permission-breakdown)
5. [Channel-Specific Permissions](#channel-specific-permissions)
6. [Bot-Specific Permissions](#bot-specific-permissions)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Understanding Discord Permissions

### How Discord Permissions Work
Discord uses a hierarchical permission system where:
- **Server-level permissions** apply to the entire server
- **Channel-level permissions** override server permissions for specific channels
- **Role hierarchy** determines which roles can manage others (higher roles manage lower ones)
- **Permission inheritance** flows from server → category → channel

### Permission Types
1. **Administrative**: Full server control
2. **Moderation**: User and content management
3. **General**: Basic server participation
4. **Voice**: Voice channel specific actions
5. **Text**: Text channel specific actions

---

## Multi-Bot Server Strategy

### Your Current Bot Setup
- **Livery Labs Bot**: Verification, games, giveaways, community features
- **Dyno Bot**: Heavy moderation, music, anti-spam, raid protection
- **Ticketing Bot**: Support ticket management

### Why This Approach Works
1. **Specialization**: Each bot excels in its designated area
2. **Reliability**: If one bot goes down, others continue working
3. **Performance**: Distributed load across multiple bots
4. **Flexibility**: Can replace individual bots without affecting others

---

## Essential Role Hierarchy

### Recommended Role Structure (Top to Bottom)

#### 1. **Server Owner** (Automatic Role)
```
Position: Highest
Color: Gold (#FFD700)
Permissions: Administrator
```
**Purpose**: Complete server control
**Members**: Server creator only

#### 2. **Co-Owner/Admin**
```
Position: 2nd Highest
Color: Red (#FF0000)
Permissions: Administrator
```
**Purpose**: Trusted individuals with full server access
**Members**: 1-2 most trusted staff members

#### 3. **Head Moderator**
```
Position: 3rd
Color: Orange (#FFA500)
Permissions: Manage Server, Manage Roles, Manage Channels, Kick Members, Ban Members
```
**Purpose**: Senior moderation team leader
**Members**: 1-2 experienced moderators

#### 4. **Moderator**
```
Position: 4th
Color: Purple (#9932CC)
Permissions: Kick Members, Ban Members, Manage Messages, Mute Members
```
**Purpose**: Core moderation team
**Members**: 3-5 active moderators

#### 5. **Trial Moderator**
```
Position: 5th
Color: Blue (#4169E1)
Permissions: Manage Messages, Mute Members (temporary)
```
**Purpose**: New moderators in training
**Members**: New moderators on probation

#### 6. **VIP/Premium**
```
Position: 6th
Color: Pink (#FF69B4)
Permissions: Enhanced community features
```
**Purpose**: Special members or supporters
**Members**: Donors, long-time members, special contributors

#### 7. **Verified Member**
```
Position: 7th
Color: Green (#00FF00)
Permissions: Standard community access
```
**Purpose**: Verified community members
**Members**: All verified users (managed by Livery Labs bot)

#### 8. **New Member/Unverified**
```
Position: 8th (Default @everyone)
Color: Gray (#808080)
Permissions: Very limited access
```
**Purpose**: New users awaiting verification
**Members**: Unverified users

---

## Detailed Permission Breakdown

### Administrative Permissions

#### **Administrator**
- **Who gets it**: Server Owner, Co-Owner/Admin only
- **What it does**: Grants ALL permissions, bypasses channel restrictions
- **Why limit it**: Prevents accidental server damage, maintains security
- **Security note**: Can kick/ban other admins, delete server

#### **Manage Server**
- **Who gets it**: Head Moderator and above
- **What it does**: Change server settings, create invites, manage integrations
- **Use cases**: Server setup, bot management, invite creation
- **Limitations**: Cannot manage roles higher than their own

#### **Manage Roles**
- **Who gets it**: Head Moderator and above
- **What it does**: Create, edit, delete roles below their position
- **Critical rule**: Cannot manage roles positioned higher than their own
- **Best practice**: Keep important roles above moderator positions

#### **Manage Channels**
- **Who gets it**: Head Moderator and above
- **What it does**: Create, edit, delete channels and categories
- **Use cases**: Channel organization, permission setup, category management
- **Caution**: Can override channel permissions

### Moderation Permissions

#### **Kick Members**
- **Who gets it**: Moderator and above
- **What it does**: Remove users (they can rejoin with invite)
- **When to use**: Minor rule violations, spam, temporary removal
- **Cannot kick**: Users with roles equal or higher than moderator

#### **Ban Members**
- **Who gets it**: Moderator and above
- **What it does**: Permanently remove users (prevents rejoining)
- **When to use**: Serious violations, repeated offenses, toxic behavior
- **Duration options**: Temporary (1-7 days) or permanent

#### **Manage Messages**
- **Who gets it**: Trial Moderator and above
- **What it does**: Delete any message, pin messages, manage reactions
- **Use cases**: Content moderation, cleaning chat, pinning announcements
- **Responsibility**: Document important deletions

#### **Mute Members**
- **Who gets it**: Trial Moderator and above (with timeout permission)
- **What it does**: Temporarily restrict user communication
- **Duration**: 60 seconds to 28 days
- **Use cases**: Cooling off periods, minor infractions

### Community Permissions

#### **Create Instant Invite**
- **Who gets it**: Verified Member and above
- **What it does**: Generate server invites
- **Settings**: Set expiration times, usage limits
- **Benefit**: Helps server growth through member referrals

#### **Change Nickname**
- **Who gets it**: Verified Member and above
- **What it does**: Allows users to change their display name
- **Limitations**: Cannot impersonate staff or use inappropriate names
- **Moderation**: Staff can override inappropriate nicknames

#### **Manage Nicknames**
- **Who gets it**: Moderator and above
- **What it does**: Change other users' nicknames
- **Use cases**: Enforce nickname policies, fix inappropriate names
- **Cannot change**: Nicknames of users with equal/higher roles

### Communication Permissions

#### **Send Messages**
- **Who gets it**: Verified Member and above
- **What it does**: Basic text communication
- **Channel specific**: Can be restricted per channel
- **Essential for**: All community participation

#### **Send Messages in Threads**
- **Who gets it**: Verified Member and above
- **What it does**: Participate in thread discussions
- **Use cases**: Organized discussions, topic-specific conversations

#### **Create Public/Private Threads**
- **Who gets it**: VIP/Premium and above
- **What it does**: Start new discussion threads
- **Benefit**: Organize conversations, reduce main channel clutter

#### **Embed Links**
- **Who gets it**: Verified Member and above
- **What it does**: Show link previews and embeds
- **Security**: Monitor for malicious links
- **Enhancement**: Makes shared content more engaging

#### **Attach Files**
- **Who gets it**: Verified Member and above
- **What it does**: Upload images, documents, media
- **File limits**: 8MB for regular users, 50MB for Nitro users
- **Moderation**: Monitor for inappropriate content

#### **Add Reactions**
- **Who gets it**: Verified Member and above
- **What it does**: React to messages with emojis
- **Community building**: Encourages engagement, feedback
- **Role assignment**: Used with reaction role systems

#### **Use External Emojis**
- **Who gets it**: VIP/Premium and above
- **What it does**: Use emojis from other servers
- **Requires**: Discord Nitro or server boost
- **Enhancement**: Richer expression options

#### **Use Slash Commands**
- **Who gets it**: Verified Member and above
- **What it does**: Interact with bots via slash commands
- **Essential for**: All bot functionality (Livery Labs, Dyno, etc.)

### Voice Permissions

#### **Connect**
- **Who gets it**: Verified Member and above
- **What it does**: Join voice channels
- **Channel specific**: Can be limited to certain voice channels

#### **Speak**
- **Who gets it**: Verified Member and above
- **What it does**: Transmit audio in voice channels
- **Push to talk**: Recommended for large channels

#### **Use Voice Activity**
- **Who gets it**: VIP/Premium and above
- **What it does**: Voice activation without push-to-talk
- **Quality of life**: More convenient for regular voice users

#### **Priority Speaker**
- **Who gets it**: Moderator and above
- **What it does**: Audio is louder and clearer during announcements
- **Use cases**: Important announcements, event hosting

#### **Mute Members**
- **Who gets it**: Moderator and above
- **What it does**: Server mute users in voice channels
- **Use cases**: Disruptive users, organized events

#### **Deafen Members**
- **Who gets it**: Moderator and above
- **What it does**: Prevent users from hearing voice chat
- **Rare usage**: Extreme cases, usually paired with mute

#### **Move Members**
- **Who gets it**: Moderator and above
- **What it does**: Move users between voice channels
- **Use cases**: Event organization, separating groups

---

## Channel-Specific Permissions

### Welcome/Rules Channels
```
@everyone (Unverified):
✅ View Channel
✅ Read Message History
❌ Send Messages
❌ Add Reactions

Verified Member and above:
✅ View Channel
✅ Read Message History
✅ Add Reactions (for verification/agreement)
❌ Send Messages (keep clean)
```

### General Chat Channels
```
@everyone (Unverified):
❌ View Channel

Verified Member and above:
✅ View Channel
✅ Send Messages
✅ Embed Links
✅ Attach Files
✅ Add Reactions
✅ Use External Emojis
✅ Use Slash Commands
✅ Read Message History
```

### Giveaway Channels
```
@everyone (Unverified):
❌ View Channel

Verified Member and above:
✅ View Channel
✅ Add Reactions (for giveaway entries)
✅ Use Slash Commands (if allowing user-created giveaways)
❌ Send Messages (keep channel clean)

VIP/Premium and above:
✅ All above permissions
✅ Send Messages (for discussion)

Moderator and above:
✅ All permissions
✅ Manage Messages
✅ Create giveaways
```

### Voice Channels
```
@everyone (Unverified):
❌ View Channel
❌ Connect

Verified Member and above:
✅ View Channel
✅ Connect
✅ Speak
✅ Use Voice Activity
✅ Stream (screen share)

VIP/Premium additions:
✅ Priority Speaker (for events)

Moderator additions:
✅ Mute Members
✅ Deafen Members
✅ Move Members
```

### Staff-Only Channels
```
@everyone to VIP/Premium:
❌ View Channel

Trial Moderator and above:
✅ View Channel
✅ Send Messages
✅ Read Message History
✅ Attach Files

Moderator and above:
✅ All above permissions
✅ Manage Messages (cleanup)

Head Moderator and above:
✅ All permissions
```

---

## Bot-Specific Permissions

### Livery Labs Bot Permissions
```
Required Server Permissions:
✅ View Channels
✅ Send Messages
✅ Embed Links
✅ Attach Files
✅ Read Message History
✅ Add Reactions
✅ Use External Emojis
✅ Manage Messages (for giveaway management)
✅ Manage Roles (for verification system)
✅ Connect (for music features)
✅ Speak (for music features)
✅ Use Voice Activity

Optional Enhancements:
✅ Manage Nicknames (for verification customization)
✅ Create Instant Invite (for community features)
```

**Role Position**: Place Livery Labs bot role above "Verified Member" role so it can assign verification

### Dyno Bot Permissions
```
Required Server Permissions:
✅ Administrator (for full moderation capabilities)

OR Specific Permissions:
✅ View Channels
✅ Send Messages
✅ Embed Links
✅ Read Message History
✅ Manage Messages
✅ Manage Roles
✅ Kick Members
✅ Ban Members
✅ Mute Members
✅ Manage Nicknames
✅ Connect
✅ Speak
✅ Move Members
✅ Manage Channels (for auto-moderation)
```

**Role Position**: Place Dyno bot role high in hierarchy, below admin roles but above all member roles

### Ticketing Bot Permissions
```
Required Server Permissions:
✅ View Channels
✅ Send Messages
✅ Embed Links
✅ Read Message History
✅ Manage Messages
✅ Manage Channels (create/delete ticket channels)
✅ Manage Roles (ticket access control)
✅ Add Reactions
```

**Role Position**: Place above member roles but below moderator roles

---

## Security Best Practices

### Role Hierarchy Security
1. **Keep admin roles minimal**: Only 1-2 people should have Administrator permission
2. **Separate bot roles**: Don't give all bots the same permissions
3. **Position matters**: Higher roles can manage lower roles
4. **Regular audits**: Review role permissions monthly

### Permission Auditing Checklist
- [ ] No unnecessary Administrator permissions
- [ ] Bot roles positioned correctly
- [ ] Channel permissions match intended access
- [ ] No permission conflicts or overlaps
- [ ] Regular review of staff permissions

### Common Security Mistakes
1. **Giving @everyone too many permissions**
   - Solution: Use verification system, limit default access

2. **Bot roles with Administrator**
   - Solution: Grant specific permissions only

3. **Moderators with Manage Roles on high-level roles**
   - Solution: Position moderator roles below important roles

4. **Unverified users having server access**
   - Solution: Implement verification system

---

## Troubleshooting Common Issues

### "Bot can't assign verification role"
**Problem**: Livery Labs bot can't give Verified role
**Solution**: Move bot role above Verified role in hierarchy

### "Users can't see channels after verification"
**Problem**: Verified role doesn't have proper channel access
**Solution**: Check channel permissions for Verified role

### "Moderators can't manage certain users"
**Problem**: Target user has role equal/higher than moderator
**Solution**: Ensure clear role hierarchy

### "Bot commands not working"
**Problem**: Bot lacks necessary permissions
**Solution**: Check bot permissions match required list above

### "Permission conflicts"
**Problem**: Channel permissions contradict role permissions
**Solution**: Channel permissions override role permissions - adjust accordingly

---

## Quick Setup Checklist

### Essential Roles to Create:
- [ ] Admin/Co-Owner role
- [ ] Head Moderator role  
- [ ] Moderator role
- [ ] Trial Moderator role
- [ ] VIP/Premium role
- [ ] Verified Member role

### Essential Permissions to Set:
- [ ] Verification system working (Livery Labs bot can assign roles)
- [ ] Unverified users limited to welcome/rules channels
- [ ] Verified users can access community channels
- [ ] Moderators can use moderation commands
- [ ] Bots have appropriate permissions

### Channel Setup:
- [ ] Welcome channel with verification message
- [ ] Rules channel visible to all
- [ ] General chat for verified members only
- [ ] Giveaway channel configured
- [ ] Staff channels for moderators
- [ ] Voice channels with proper permissions

---

*This guide ensures your server has proper security while maximizing community engagement with your Livery Labs bot and supporting bots.*