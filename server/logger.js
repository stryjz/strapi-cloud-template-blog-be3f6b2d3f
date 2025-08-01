import fs from 'fs';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Log level names for display
const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
  4: 'TRACE'
};

// Colors for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  TRACE: '\x1b[90m', // Gray
  RESET: '\x1b[0m'   // Reset
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || process.env.LOG_LEVEL || 'INFO';
    this.levelNum = LOG_LEVELS[this.level.toUpperCase()] || LOG_LEVELS.INFO;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logDir = options.logDir || './logs';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    
    // Create log directory if file logging is enabled
    if (this.enableFile) {
      this.ensureLogDirectory();
    }
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName(level) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    
    let formattedMessage = `[${timestamp}] [${levelName}] ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        formattedMessage += ` ${JSON.stringify(data)}`;
      } else {
        formattedMessage += ` ${data}`;
      }
    }
    
    return formattedMessage;
  }

  writeToFile(level, message, data) {
    if (!this.enableFile) return;

    try {
      const logFile = this.getLogFileName(level);
      const formattedMessage = this.formatMessage(level, message, data) + '\n';
      
      // Check file size and rotate if necessary
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(logFile);
        }
      }
      
      fs.appendFileSync(logFile, formattedMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  rotateLogFile(logFile) {
    try {
      for (let i = this.maxFiles - 1; i >= 0; i--) {
        const oldFile = `${logFile}.${i}`;
        const newFile = `${logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      if (fs.existsSync(logFile)) {
        fs.renameSync(logFile, `${logFile}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  log(level, message, data = null) {
    if (level > this.levelNum) return;

    const formattedMessage = this.formatMessage(level, message, data);
    const levelName = LOG_LEVEL_NAMES[level];
    const color = COLORS[levelName] || COLORS.RESET;

    // Console output
    if (this.enableConsole) {
      console.log(`${color}${formattedMessage}${COLORS.RESET}`);
    }

    // File output
    this.writeToFile(level, message, data);
  }

  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  trace(message, data = null) {
    this.log(LOG_LEVELS.TRACE, message, data);
  }

  // Request logging helper
  logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
      
      this.log(level, `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        tenantId: req.user?.tenant_id
      });
    });
    
    next();
  }

  // Database query logging helper
  logQuery(query, params = [], duration = null) {
    this.debug('Database query executed', {
      query: query.trim(),
      params: params.length > 0 ? params : undefined,
      duration: duration ? `${duration}ms` : undefined
    });
  }

  // Error logging helper
  logError(error, context = {}) {
    this.error('Application error occurred', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }
}

// Create default logger instance
const logger = new Logger({
  level: process.env.LOG_LEVEL || 'INFO',
  enableConsole: true,
  enableFile: process.env.LOG_TO_FILE === 'true',
  logDir: process.env.LOG_DIR || './logs'
});

// Export both the class and the default instance
export { Logger, logger as default }; 