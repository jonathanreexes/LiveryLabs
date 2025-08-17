const config = require('../config.json');
const logger = require('./logger');

class RateLimiter {
    constructor() {
        this.userCooldowns = new Map();
        this.commandLimits = config.rateLimits || { commands: 5, timeWindow: 10000 };
        
        // Clean up old entries every minute
        setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    /**
     * Check if user is rate limited
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @returns {boolean} Whether user is rate limited
     */
    checkRateLimit(userId, commandName = 'general') {
        const now = Date.now();
        const key = `${userId}-${commandName}`;
        
        if (!this.userCooldowns.has(key)) {
            this.userCooldowns.set(key, {
                count: 1,
                resetTime: now + this.commandLimits.timeWindow,
                firstUse: now
            });
            return false;
        }

        const userData = this.userCooldowns.get(key);
        
        // Reset if time window has passed
        if (now >= userData.resetTime) {
            userData.count = 1;
            userData.resetTime = now + this.commandLimits.timeWindow;
            userData.firstUse = now;
            return false;
        }

        // Check if user has exceeded limit
        if (userData.count >= this.commandLimits.commands) {
            logger.warn(`Rate limit exceeded by user ${userId} for command ${commandName}`);
            return true;
        }

        // Increment usage count
        userData.count++;
        return false;
    }

    /**
     * Get time until rate limit resets
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @returns {number} Time in milliseconds until reset
     */
    getTimeUntilReset(userId, commandName = 'general') {
        const key = `${userId}-${commandName}`;
        const userData = this.userCooldowns.get(key);
        
        if (!userData) return 0;
        
        const now = Date.now();
        return Math.max(0, userData.resetTime - now);
    }

    /**
     * Get remaining uses for a user
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @returns {number} Remaining uses
     */
    getRemainingUses(userId, commandName = 'general') {
        const key = `${userId}-${commandName}`;
        const userData = this.userCooldowns.get(key);
        
        if (!userData) return this.commandLimits.commands;
        
        const now = Date.now();
        
        // Reset if time window has passed
        if (now >= userData.resetTime) {
            return this.commandLimits.commands;
        }
        
        return Math.max(0, this.commandLimits.commands - userData.count);
    }

    /**
     * Reset rate limit for a user
     * @param {string} userId - User ID
     * @param {string} commandName - Command name (optional)
     */
    resetUser(userId, commandName = null) {
        if (commandName) {
            const key = `${userId}-${commandName}`;
            this.userCooldowns.delete(key);
        } else {
            // Reset all commands for user
            const keysToDelete = [];
            for (const [key] of this.userCooldowns) {
                if (key.startsWith(`${userId}-`)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.userCooldowns.delete(key));
        }
    }

    /**
     * Add custom rate limit for specific command
     * @param {string} commandName - Command name
     * @param {number} maxUses - Maximum uses
     * @param {number} timeWindow - Time window in milliseconds
     */
    setCustomLimit(commandName, maxUses, timeWindow) {
        // This would be implemented if we want per-command limits
        // For now, we use global limits
        logger.info(`Custom rate limit set for ${commandName}: ${maxUses} uses per ${timeWindow}ms`);
    }

    /**
     * Check if user is globally rate limited (across all commands)
     * @param {string} userId - User ID
     * @returns {boolean} Whether user is globally rate limited
     */
    checkGlobalRateLimit(userId) {
        const now = Date.now();
        const userKeys = [];
        
        // Find all keys for this user
        for (const [key] of this.userCooldowns) {
            if (key.startsWith(`${userId}-`)) {
                userKeys.push(key);
            }
        }
        
        // Count total commands used in the current time window
        let totalCommands = 0;
        const globalWindow = 30000; // 30 seconds
        
        userKeys.forEach(key => {
            const userData = this.userCooldowns.get(key);
            if (userData && (now - userData.firstUse) <= globalWindow) {
                totalCommands += userData.count;
            }
        });
        
        // Global limit: 20 commands per 30 seconds
        const globalLimit = 20;
        
        if (totalCommands >= globalLimit) {
            logger.warn(`Global rate limit exceeded by user ${userId}: ${totalCommands} commands`);
            return true;
        }
        
        return false;
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, userData] of this.userCooldowns) {
            if (now >= userData.resetTime) {
                this.userCooldowns.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
        }
    }

    /**
     * Get current stats
     * @returns {object} Rate limiter statistics
     */
    getStats() {
        const now = Date.now();
        let activeUsers = new Set();
        let totalEntries = 0;
        let expiredEntries = 0;
        
        for (const [key, userData] of this.userCooldowns) {
            totalEntries++;
            const userId = key.split('-')[0];
            activeUsers.add(userId);
            
            if (now >= userData.resetTime) {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries,
            activeUsers: activeUsers.size,
            expiredEntries,
            memoryUsage: this.userCooldowns.size
        };
    }
}

module.exports = new RateLimiter();
