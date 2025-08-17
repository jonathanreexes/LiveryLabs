const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const dbPath = config.database.path;
            const dbDir = path.dirname(dbPath);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    logger.error('Error opening database:', err);
                    reject(err);
                } else {
                    logger.info('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    logger.error('Error creating tables:', err);
                    reject(err);
                } else {
                    logger.info('Database tables created successfully');
                    resolve();
                }
            });
        });
    }

    // User management
    async getUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createUser(userId, guildId, username) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO users (user_id, guild_id, username, balance, warnings, last_daily) VALUES (?, ?, ?, 0, 0, 0)',
                [userId, guildId, username],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserBalance(userId, guildId, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET balance = balance + ? WHERE user_id = ? AND guild_id = ?',
                [amount, userId, guildId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Warnings system
    async addWarning(userId, guildId, reason, moderatorId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO warnings (user_id, guild_id, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?)',
                [userId, guildId, reason, moderatorId, Date.now()],
                function(err) {
                    if (err) reject(err);
                    else {
                        // Update warning count
                        this.db.run(
                            'UPDATE users SET warnings = warnings + 1 WHERE user_id = ? AND guild_id = ?',
                            [userId, guildId]
                        );
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    // Tickets system
    async createTicket(userId, guildId, channelId, reason) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tickets (user_id, guild_id, channel_id, reason, status, created_at) VALUES (?, ?, ?, ?, "open", ?)',
                [userId, guildId, channelId, reason, Date.now()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async closeTicket(ticketId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE tickets SET status = "closed", closed_at = ? WHERE id = ?',
                [Date.now(), ticketId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Reaction roles
    async addReactionRole(guildId, messageId, emoji, roleId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO reaction_roles (guild_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?)',
                [guildId, messageId, emoji, roleId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getReactionRole(guildId, messageId, emoji) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?',
                [guildId, messageId, emoji],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('Error closing database:', err);
                } else {
                    logger.info('Database connection closed');
                }
            });
        }
    }
}

module.exports = new Database();
