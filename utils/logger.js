const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = './logs';
        this.logFile = path.join(this.logDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
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
        try {
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
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
        try {
            const files = fs.readdirSync(this.logDir);
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

            files.forEach(file => {
                if (file.startsWith('bot-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtime < sevenDaysAgo) {
                        fs.unlinkSync(filePath);
                        this.info(`Cleaned up old log file: ${file}`);
                    }
                }
            });
        } catch (error) {
            this.error('Error cleaning up log files:', error);
        }
    }
}

const logger = new Logger();

// Clean up logs on startup
logger.cleanupLogs();

// Schedule daily log cleanup
setInterval(() => {
    logger.cleanupLogs();
}, 24 * 60 * 60 * 1000); // 24 hours

module.exports = logger;
