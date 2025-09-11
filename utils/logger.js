const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.initializePaths();
        this.fileLoggingEnabled = this.initializeFileLogging();
    }

    initializePaths() {
        // Determine log directory based on environment
        const isContainer = process.env.NODE_ENV === 'production' || process.env.KOYEB_SERVICE_NAME;
        const defaultLogDir = isContainer ? '/tmp/logs' : './logs';
        
        this.logDir = process.env.LOG_DIR || defaultLogDir;
        this.logFile = path.join(this.logDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
    }

    initializeFileLogging() {
        try {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
            
            // Test write permissions
            const testFile = path.join(this.logDir, 'test-write.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            
            console.log(`[LOGGER] File logging enabled: ${this.logDir}`);
            return true;
        } catch (error) {
            console.warn(`[LOGGER] File logging disabled - using console only. Error: ${error.message}`);
            return false;
        }
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }

    writeToFile(formattedMessage) {
        if (!this.fileLoggingEnabled) {
            return; // Skip file writing if disabled
        }
        
        try {
            // Refresh log file path daily
            const currentDate = new Date().toISOString().split('T')[0];
            const expectedLogFile = path.join(this.logDir, `bot-${currentDate}.log`);
            
            if (this.logFile !== expectedLogFile) {
                this.logFile = expectedLogFile;
            }
            
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        } catch (error) {
            // Only log to console if file writing fails
            if (this.fileLoggingEnabled) {
                console.error('[LOGGER] Failed to write to log file, disabling file logging:', error.message);
                this.fileLoggingEnabled = false;
            }
        }
    }

    info(message, ...args) {
        const formattedMessage = this.formatMessage('info', message, ...args);
        console.log('\x1b[36m%s\x1b[0m', formattedMessage); // Cyan
        this.writeToFile(formattedMessage);
    }

    warn(message, ...args) {
        const formattedMessage = this.formatMessage('warn', message, ...args);
        console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // Yellow
        this.writeToFile(formattedMessage);
    }

    error(message, ...args) {
        const formattedMessage = this.formatMessage('error', message, ...args);
        console.error('\x1b[31m%s\x1b[0m', formattedMessage); // Red
        this.writeToFile(formattedMessage);
    }

    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            const formattedMessage = this.formatMessage('debug', message, ...args);
            console.log('\x1b[37m%s\x1b[0m', formattedMessage); // White
            this.writeToFile(formattedMessage);
        }
    }

    success(message, ...args) {
        const formattedMessage = this.formatMessage('success', message, ...args);
        console.log('\x1b[32m%s\x1b[0m', formattedMessage); // Green
        this.writeToFile(formattedMessage);
    }

    // Clean up old log files (keep last 7 days)
    cleanupLogs() {
        if (!this.fileLoggingEnabled) {
            return; // Skip cleanup if file logging is disabled
        }
        
        try {
            if (!fs.existsSync(this.logDir)) {
                return; // No log directory to clean
            }
            
            const files = fs.readdirSync(this.logDir);
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

            files.forEach(file => {
                if (file.startsWith('bot-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        
                        if (stats.mtime < sevenDaysAgo) {
                            fs.unlinkSync(filePath);
                            console.log(`[LOGGER] Cleaned up old log file: ${file}`);
                        }
                    } catch (fileError) {
                        console.warn(`[LOGGER] Could not process log file ${file}:`, fileError.message);
                    }
                }
            });
        } catch (error) {
            console.error('[LOGGER] Error cleaning up log files:', error.message);
        }
    }

    // Get current logging configuration
    getConfig() {
        return {
            logDir: this.logDir,
            logFile: this.logFile,
            fileLoggingEnabled: this.fileLoggingEnabled,
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

const logger = new Logger();

// Clean up logs on startup (only if file logging is enabled)
if (logger.fileLoggingEnabled) {
    try {
        logger.cleanupLogs();
    } catch (error) {
        console.warn('[LOGGER] Initial log cleanup failed:', error.message);
    }
}

// Schedule daily log cleanup (only if file logging is enabled)
if (logger.fileLoggingEnabled) {
    setInterval(() => {
        try {
            logger.cleanupLogs();
        } catch (error) {
            console.warn('[LOGGER] Scheduled log cleanup failed:', error.message);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
}

// Log initialization status
console.log('[LOGGER] Initialized with config:', logger.getConfig());

module.exports = logger;
