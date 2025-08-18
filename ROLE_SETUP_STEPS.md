# Discord Role Setup - Step by Step Guide
*Implementation steps for Livery Labs Discord server*

## Phase 1: Core Role Creation

### Step 1: Create Basic Roles (In Discord Server Settings)

Go to **Server Settings > Roles** and create these roles **in this exact order** (top to bottom):

1. **🔴 Owner** 
   - Color: #FF0000 (Red)
   - Position: Highest (below your name)
   - Permissions: Leave as default (you get all permissions automatically)

2. **🟡 Admin**
   - Color: #FF8C00 (Orange) 
   - Position: Below Owner
   - Permissions: Administrator ✅

3. **🟢 Moderator**
   - Color: #00FF00 (Green)
   - Position: Below Admin
   - Key Permissions:
     - Manage Messages ✅
     - Moderate Members ✅
     - Kick Members ✅
     - View Audit Log ✅
     - Send Messages ✅
     - Manage Nicknames ✅

4. **🔵 Helper**
   - Color: #0080FF (Blue)
   - Position: Below Moderator
   - Key Permissions:
     - Send Messages ✅
     - Manage Messages (for help channels only)
     - View Audit Log ✅
     - All default member permissions ✅

5. **✅ Verified**
   - Color: #87CEEB (Light Blue)
   - Position: Below Helper
   - Key Permissions:
     - Send Messages ✅
     - Embed Links ✅
     - Attach Files ✅
     - Add Reactions ✅
     - Use External Emojis ✅
     - Connect ✅ (voice)
     - Speak ✅ (voice)
     - Use Voice Activity ✅
     - Use Slash Commands ✅

6. **👤 Member** (for unverified users)
   - Color: #808080 (Gray)
   - Position: Above @everyone
   - Limited Permissions:
     - Read Message History ✅
     - Add Reactions ✅
     - Use Slash Commands ✅ (for verification only)

### Step 2: Configure @everyone Role

Edit the **@everyone** role:
- Remove most permissions
- Keep only: View Channels, Read Message History
- This ensures new members have minimal access until verified

## Phase 2: Bot Role Setup

### Step 3: Position Bot Roles Correctly

When you invite bots, position their roles like this:

1. **Owner** (you)
2. **Admin**
3. **Dyno** (when added) - Below Admin, above Moderator
4. **Moderator** 
5. **Helper**
6. **Livery Labs** - Below Helper
7. **Ticketing Bot** (when added) - Below Helper
8. **Verified**
9. **Member**
10. **@everyone**

## Phase 3: Channel Configuration

### Step 4: Create Essential Channels

**Text Channels:**
1. **#rules** - Rules and server info
2. **#announcements** - Important updates
3. **#verification** - Bot verification area  
4. **#general** - Main chat
5. **#music-requests** - Music bot commands
6. **#mod-chat** - Staff only

**Voice Channels:**
1. **🔊 General Voice** - Main voice chat
2. **🎵 Music Lounge** - Music listening
3. **🔒 Staff Voice** - Staff meetings

### Step 5: Set Channel Permissions

**#verification Channel:**
- @everyone: View Channel ✅, Use Slash Commands ✅
- @Member: View Channel ✅, Use Slash Commands ✅
- @Verified: View Channel ❌ (they don't need it anymore)
- Livery Labs: Send Messages ✅, Manage Messages ✅

**#general Channel:**
- @everyone: View Channel ✅, Read Message History ✅
- @Member: View Channel ✅, Read Message History ✅, Add Reactions ✅
- @Verified: Send Messages ✅, Embed Links ✅, Attach Files ✅
- @Moderator: Manage Messages ✅

**#announcements Channel:**
- @everyone: View Channel ✅, Read Message History ✅, Add Reactions ✅
- @Admin: Send Messages ✅, Manage Messages ✅
- All others: Send Messages ❌

**#music-requests Channel:**
- @everyone: View Channel ❌
- @Verified: Send Messages ✅, Use Slash Commands ✅
- Livery Labs: Send Messages ✅, Manage Messages ✅

**#mod-chat Channel:**
- @everyone: View Channel ❌
- @Helper and above: View Channel ✅, Send Messages ✅

## Phase 4: Verification System Setup

### Step 6: Configure Verification

Use your Livery Labs bot in the #verification channel:

```
/verification setup 
    title:"Welcome to Livery Labs" 
    message:"Click the button below to verify and unlock all server features!" 
    success_title:"🎉 Welcome!" 
    success_message:"You're now verified! Check out all our channels and start chatting!" 
    color:#87CEEB
    verified_role:@Verified
```

## Phase 5: Testing

### Step 7: Test the System

1. **Create a test account** (or ask a friend to join)
2. **Verify they can only see limited channels** as @Member
3. **Test the verification process** - they should click button and get @Verified role
4. **Confirm they now see all appropriate channels** as @Verified
5. **Test staff permissions** with different role levels

## Phase 6: Special Roles (Optional)

### Step 8: Add Community Roles Later

Once basic system works, add these special roles:

**🎵 DJ**
- Color: #8A2BE2 (Purple)
- Position: Same level as @Verified
- Extra permissions for music control

**🎮 Gamer** 
- Color: #FF4500 (Red-Orange)
- Position: Same level as @Verified  
- Access to gaming channels

**🎨 Creator**
- Color: #FF69B4 (Pink)
- Position: Same level as @Verified
- Enhanced file sharing permissions

## Quick Checklist

- [ ] Created core staff roles (Owner, Admin, Moderator, Helper)
- [ ] Created member roles (Verified, Member) 
- [ ] Configured @everyone with minimal permissions
- [ ] Set up essential channels
- [ ] Applied proper channel permissions
- [ ] Configured verification system
- [ ] Tested with new user account
- [ ] Positioned bot roles correctly
- [ ] Everything working smoothly

## Commands for Role Management

Once setup is complete, use these commands:

```
/roles add @user @Moderator        # Promote trusted user
/roles remove @user @Helper        # Demote if needed
/roles list                        # See all roles
```

This foundation will provide a secure, organized server ready for your community!