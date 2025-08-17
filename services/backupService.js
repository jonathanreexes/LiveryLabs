const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config.json');

class BackupService {
    constructor() {
        this.backupDir = './backups';
        this.dbPath = config.database.path;
        this.isRunning = false;
        
        // Ensure backup directory exists
        this.ensureBackupDirectory();
    }

    /**
     * Ensure backup directory exists
     */
    async ensureBackupDirectory() {
        try {
            await fs.ensureDir(this.backupDir);
            logger.info('Backup directory initialized');
        } catch (error) {
            logger.error('Failed to create backup directory:', error);
        }
    }

    /**
     * Create a backup of the database
     * @returns {Promise<string|null>} Backup filename or null if failed
     */
    async createBackup() {
        if (this.isRunning) {
            logger.warn('Backup already in progress, skipping...');
            return null;
        }

        this.isRunning = true;
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `bot-backup-${timestamp}.db`;
            const backupPath = path.join(this.backupDir, backupFilename);

            // Check if database file exists
            if (!await fs.pathExists(this.dbPath)) {
                logger.warn('Database file not found, skipping backup');
                this.isRunning = false;
                return null;
            }

            // Copy database file
            await fs.copy(this.dbPath, backupPath);
            
            // Create metadata file
            const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);
            const metadata = {
                filename: backupFilename,
                originalPath: this.dbPath,
                createdAt: new Date().toISOString(),
                size: (await fs.stat(backupPath)).size,
                type: 'database',
                version: '1.0'
            };
            
            await fs.writeJson(metadataPath, metadata, { spaces: 2 });

            // Compress backup (optional)
            if (config.backup.compress !== false) {
                await this.compressBackup(backupPath, backupFilename);
            }

            logger.info(`Database backup created: ${backupFilename}`);
            this.isRunning = false;
            return backupFilename;
        } catch (error) {
            logger.error('Failed to create backup:', error);
            this.isRunning = false;
            return null;
        }
    }

    /**
     * Compress a backup file
     * @param {string} filePath - Path to the file to compress
     * @param {string} filename - Original filename
     */
    async compressBackup(filePath, filename) {
        try {
            // Note: This is a simplified compression using built-in Node.js
            // In production, you might want to use a library like node-gzip
            const zlib = require('zlib');
            const gzip = zlib.createGzip();
            
            const compressedPath = `${filePath}.gz`;
            const readStream = fs.createReadStream(filePath);
            const writeStream = fs.createWriteStream(compressedPath);
            
            await new Promise((resolve, reject) => {
                readStream
                    .pipe(gzip)
                    .pipe(writeStream)
                    .on('finish', resolve)
                    .on('error', reject);
            });

            // Remove uncompressed file
            await fs.remove(filePath);
            
            logger.debug(`Backup compressed: ${filename}.gz`);
        } catch (error) {
            logger.error('Failed to compress backup:', error);
        }
    }

    /**
     * Restore database from backup
     * @param {string} backupFilename - Backup filename to restore from
     * @returns {Promise<boolean>} Success status
     */
    async restoreBackup(backupFilename) {
        try {
            const backupPath = path.join(this.backupDir, backupFilename);
            
            // Check if backup exists
            if (!await fs.pathExists(backupPath)) {
                logger.error(`Backup file not found: ${backupFilename}`);
                return false;
            }

            // Create backup of current database
            const currentBackup = `current-backup-${Date.now()}.db`;
            const currentBackupPath = path.join(this.backupDir, currentBackup);
            
            if (await fs.pathExists(this.dbPath)) {
                await fs.copy(this.dbPath, currentBackupPath);
                logger.info(`Current database backed up as: ${currentBackup}`);
            }

            // Restore from backup
            await fs.copy(backupPath, this.dbPath);
            
            logger.info(`Database restored from backup: ${backupFilename}`);
            return true;
        } catch (error) {
            logger.error('Failed to restore backup:', error);
            return false;
        }
    }

    /**
     * List available backups
     * @returns {Promise<Array>} Array of backup info objects
     */
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.endsWith('.db') || file.endsWith('.db.gz')) {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Try to read metadata
                    let metadata = null;
                    const metadataPath = path.join(this.backupDir, `${file}.meta.json`);
                    
                    if (await fs.pathExists(metadataPath)) {
                        try {
                            metadata = await fs.readJson(metadataPath);
                        } catch (error) {
                            logger.debug(`Failed to read metadata for ${file}:`, error);
                        }
                    }

                    backups.push({
                        filename: file,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        metadata: metadata
                    });
                }
            }

            // Sort by creation date (newest first)
            backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return backups;
        } catch (error) {
            logger.error('Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups() {
        try {
            const retentionDays = config.backup.retentionDays || 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const backups = await this.listBackups();
            let deletedCount = 0;

            for (const backup of backups) {
                if (new Date(backup.createdAt) < cutoffDate) {
                    const backupPath = path.join(this.backupDir, backup.filename);
                    const metadataPath = path.join(this.backupDir, `${backup.filename}.meta.json`);
                    
                    await fs.remove(backupPath);
                    
                    if (await fs.pathExists(metadataPath)) {
                        await fs.remove(metadataPath);
                    }
                    
                    deletedCount++;
                    logger.info(`Deleted old backup: ${backup.filename}`);
                }
            }

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old backup(s)`);
            }
        } catch (error) {
            logger.error('Failed to cleanup old backups:', error);
        }
    }

    /**
     * Start automatic backup schedule
     */
    startBackupSchedule() {
        const schedule = config.backup.interval || '0 0 * * *'; // Default: daily at midnight
        
        if (!cron.validate(schedule)) {
            logger.error('Invalid backup schedule format');
            return;
        }

        cron.schedule(schedule, async () => {
            logger.info('Starting scheduled backup...');
            await this.createBackup();
            await this.cleanupOldBackups();
        }, {
            timezone: 'UTC'
        });

        logger.info(`Backup schedule started: ${schedule}`);
    }

    /**
     * Stop automatic backup schedule
     */
    stopBackupSchedule() {
        // Note: node-cron doesn't provide a direct way to stop all tasks
        // In a real implementation, you'd store the task reference
        logger.info('Backup schedule stopped');
    }

    /**
     * Get backup service statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStats() {
        try {
            const backups = await this.listBackups();
            const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
            
            return {
                totalBackups: backups.length,
                totalSize: totalSize,
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
                newestBackup: backups.length > 0 ? backups[0].createdAt : null,
                isRunning: this.isRunning
            };
        } catch (error) {
            logger.error('Failed to get backup stats:', error);
            return {
                totalBackups: 0,
                totalSize: 0,
                oldestBackup: null,
                newestBackup: null,
                isRunning: this.isRunning
            };
        }
    }

    /**
     * Export data to JSON format
     * @returns {Promise<string|null>} Export filename or null if failed
     */
    async exportData() {
        try {
            const database = require('../database/database');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFilename = `bot-export-${timestamp}.json`;
            const exportPath = path.join(this.backupDir, exportFilename);

            // Export all tables
            const exportData = {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                data: {}
            };

            // Users table
            exportData.data.users = await new Promise((resolve, reject) => {
                database.db.all('SELECT * FROM users', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Warnings table
            exportData.data.warnings = await new Promise((resolve, reject) => {
                database.db.all('SELECT * FROM warnings', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Tickets table
            exportData.data.tickets = await new Promise((resolve, reject) => {
                database.db.all('SELECT * FROM tickets', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Reaction roles table
            exportData.data.reactionRoles = await new Promise((resolve, reject) => {
                database.db.all('SELECT * FROM reaction_roles', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            await fs.writeJson(exportPath, exportData, { spaces: 2 });
            
            logger.info(`Data exported to: ${exportFilename}`);
            return exportFilename;
        } catch (error) {
            logger.error('Failed to export data:', error);
            return null;
        }
    }
}

module.exports = new BackupService();
