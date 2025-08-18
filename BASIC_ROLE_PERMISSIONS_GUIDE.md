# Basic Role Permissions Guide

## Overview
This guide covers the essential permissions needed for different types of roles in your Discord server. Focus on giving roles only what they need - over-permissioning creates security risks.

## Core Permission Categories

### **🔧 Basic Server Access**
**Every member role needs:**
- View Channels
- Send Messages
- Read Message History
- Use External Emojis
- Add Reactions

### **🎵 Media & Voice Permissions**
**For users who use voice channels:**
- Connect (to join voice channels)
- Speak (to talk in voice)
- Use Voice Activity (for push-to-talk users)

**For music bot functionality:**
- Use Slash Commands (required for bot commands)

### **📝 Text Channel Enhancements**
**For active community members:**
- Embed Links (share previews of websites)
- Attach Files (share images, documents)
- Use External Stickers

### **⚡ Advanced User Permissions**
**For trusted members:**
- Create Public Threads
- Create Private Threads
- Send Messages in Threads
- Manage Messages (delete their own messages)

## Role-Specific Permission Sets

### **👥 @Member (Basic Role)**
```
✅ View Channels
✅ Send Messages  
✅ Read Message History
✅ Add Reactions
✅ Use External Emojis
✅ Use Slash Commands
✅ Connect (voice)
✅ Speak (voice)
✅ Use Voice Activity
```

### **🌟 @Active Member**
```
All @Member permissions +
✅ Embed Links
✅ Attach Files
✅ Use External Stickers
✅ Create Public Threads
```

### **🛡️ @Trusted Member**
```
All @Active Member permissions +
✅ Send Messages in Threads
✅ Create Private Threads
✅ Stream (screen share in voice)
```

### **👮 @Moderator**
```
All @Trusted Member permissions +
✅ Manage Messages (delete others' messages)
✅ Mute Members (timeout users)
✅ Move Members (between voice channels)
✅ View Audit Log
✅ Use External Emojis (override channel restrictions)
```

### **🎯 @Admin**
```
All @Moderator permissions +
✅ Kick Members
✅ Ban Members
✅ Manage Nicknames
✅ Manage Roles (below their role)
✅ Manage Channels
✅ Manage Webhooks
```

### **👑 @Owner**
```
✅ Administrator (full permissions)
```

## Bot-Specific Permissions

### **🤖 Livery Labs Bot**
```
✅ Send Messages
✅ Embed Links
✅ Attach Files
✅ Add Reactions
✅ Read Message History
✅ Use Slash Commands
✅ Connect (for music)
✅ Speak (for music)
✅ Manage Roles (for verification system)
```

### **🛡️ Dyno Bot (Moderation)**
```
✅ All Livery Labs permissions +
✅ Kick Members
✅ Ban Members
✅ Manage Messages
✅ Mute Members
✅ View Audit Log
✅ Manage Nicknames
```

### **🎫 Ticketing Bot**
```
✅ Send Messages
✅ Embed Links
✅ Manage Channels (create/delete ticket channels)
✅ Manage Roles (ticket access)
✅ Read Message History
```

## Permission Safety Tips

### **❌ Avoid These Dangerous Permissions**
- **Administrator** - Only for owner/co-owners
- **Manage Server** - Very dangerous, avoid giving out
- **Manage Roles** - Only for high-level staff
- **Mention Everyone** - Creates spam potential

### **⚠️ Use Carefully**
- **Manage Messages** - Only for moderators+
- **Kick/Ban Members** - Only for trusted staff
- **Manage Channels** - Only for admins+

### **✅ Safe for Most Users**
- View Channels, Send Messages, Add Reactions
- Embed Links, Attach Files (for active users)
- Voice permissions (Connect, Speak)

## Channel-Specific Overrides

### **📢 Announcement Channels**
```
@everyone: ❌ Send Messages
@Moderator+: ✅ Send Messages
Everyone: ✅ Add Reactions, Read History
```

### **🎵 Music Channels**
```
@everyone: ✅ All basic permissions
Bots: ✅ Manage Messages (for music queue cleanup)
```

### **👥 Staff Channels**
```
@everyone: ❌ View Channel
@Moderator+: ✅ All permissions
```

## Quick Setup Checklist

### **New Server Setup:**
1. ✅ Create @Member role with basic permissions
2. ✅ Remove dangerous permissions from @everyone
3. ✅ Set up bot roles with minimum needed permissions
4. ✅ Create staff roles with appropriate moderation powers
5. ✅ Test permissions with a secondary account

### **Bot Integration:**
1. ✅ Give Livery Labs bot role position above member roles
2. ✅ Enable "Manage Roles" for verification system
3. ✅ Enable "Embed Links" and "Attach Files" for embed command
4. ✅ Test all bot commands work properly

### **Security Check:**
1. ✅ No regular members have dangerous permissions
2. ✅ Bot permissions are minimal but functional
3. ✅ Staff roles follow principle of least privilege
4. ✅ Channel overrides protect sensitive areas

## Common Permission Issues

### **"Bot not working" = Missing Permissions**
- Check if bot has "Use Slash Commands"
- Verify "Send Messages" in target channels
- Ensure "Embed Links" for rich content

### **"Command not appearing" = Role Position**
- Bot role must be above member roles
- Check channel-specific permission overrides

### **"Access denied" = Hierarchy Issues**
- Users can't manage roles above their highest role
- Bots follow same hierarchy rules

---

**💡 Pro Tip:** Always test permissions with a secondary account to make sure everything works as expected before going live with your server!