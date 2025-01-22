const winston = require('winston');
const path = require('path');

// Define log levels and colors
const logLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'white',
    },
};

// Create the logger
const logger = winston.createLogger({
    levels: logLevels.levels,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'dev-container' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.printf(
                    ({ timestamp, level, message, service, ...metadata }) => {
                        let msg = `${timestamp} [${service}] ${level}: ${message}`;
                        if (Object.keys(metadata).length > 0) {
                            msg += '\n' + JSON.stringify(metadata, null, 2);
                        }
                        return msg;
                    }
                )
            ),
        }),
        // Write all logs to a file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.printf(
                    ({ timestamp, level, message, service, ...metadata }) => {
                        let msg = `${timestamp} [${service}] ${level}: ${message}`;
                        if (metadata.stack) msg += `\n${metadata.stack}`;
                        return msg;
                    }
                )
            ),
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.printf(
                    ({ timestamp, level, message, service, ...metadata }) => {
                        let msg = `${timestamp} [${service}] ${level}: ${message}`;
                        if (Object.keys(metadata).length > 0) {
                            msg += '\n' + JSON.stringify(metadata, null, 2);
                        }
                        return msg;
                    }
                )
            ),
        }),
    ],
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: (message) => logger.http(message.trim()),
};

// Helper functions for common logging patterns
logger.logRequest = (req, extra = {}) => {
    logger.http(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        params: req.params,
        query: req.query,
        body: req.body,
        ...extra,
    });
};

logger.logResponse = (req, res, extra = {}) => {
    logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
        ip: req.ip,
        responseTime: res.get('X-Response-Time'),
        ...extra,
    });
};

logger.logError = (error, req = null) => {
    const logData = {
        stack: error.stack,
        ...error,
    };

    if (req) {
        logData.method = req.method;
        logData.url = req.originalUrl;
        logData.ip = req.ip;
        logData.userAgent = req.get('user-agent');
    }

    logger.error(error.message, logData);
};

// Add colors to Winston
winston.addColors(logLevels.colors);

module.exports = logger;
