import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from 'path';
import { fileURLToPath } from "url";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, '../../logs');

if(!fs.existsSync(logDir))
    fs.mkdirSync(logDir, { recursive: true });

const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });
const printfFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
    ? `${timestamp} [${level}] ${message} - ${stack}`
    : `${timestamp} [${level}] ${message}`;
});
const timestampAndJsonFormat = winston.format.combine(timestampFormat, winston.format.json());

const fileOptions = {
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
};
const handlerMaxFiles = '30d';

// info level log transport
const infoTransport = new DailyRotateFile({
    dirname: logDir,
    filename: 'info-%DATE%.log',
    level: 'info',
    format: timestampAndJsonFormat,
    ...fileOptions
});

// error level log transport
const errorTransport = new DailyRotateFile({
    dirname: logDir,
    filename: 'error-%DATE%.log',
    level: 'error',
    format: timestampAndJsonFormat,
    ...fileOptions
});

// console log transport
const consoleTransport = new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production'
    ? timestampAndJsonFormat
    : winston.format.combine(
        winston.format.colorize(),
        timestampFormat,
        printfFormat,
    )
});

// logger
const logger = winston.createLogger({
    transports: [consoleTransport, infoTransport, errorTransport],
});


// Error Handling. uncaughtException 발생 시 로그 기록
logger.exceptions.handle(
    new DailyRotateFile({
        dirname: logDir,
        filename: 'exceptions-%DATE%.log',
        ...fileOptions,
        maxFiles: handlerMaxFiles,
        format: timestampAndJsonFormat
    })
)

logger.rejections.handle(
    new DailyRotateFile({
        dirname: logDir,
        filename: 'rejections-%DATE%.log',
        ...fileOptions,
        maxFiles: handlerMaxFiles,
        format: timestampAndJsonFormat
    })
)

export default logger;