import { Platform } from 'react-native';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogCategory = 'Ads' | 'GameLogic' | 'Quests' | 'Navigation' | 'System' | 'Plays';

/**
 * Logger structured for easier debugging.
 * In development, it prints to console with colors/formatting.
 * In production, it could send to Sentry/Crashlytics (to be configured).
 */
class LoggerService {
  private static instance: LoggerService;
  private logs: any[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() { }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private formatMessage(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
    return { prefix, message, data };
  }

  log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const { prefix, message: formattedMsg, data: loggedData } = this.formatMessage(level, category, message, data);

    // Store in memory for specialized "Debug Screen"
    this.logs.unshift({ level, category, message, data, timestamp: new Date().toISOString() });
    if (this.logs.length > this.MAX_LOGS) this.logs.pop();

    // Console output
    if (__DEV__) {
      // Colors not supported in all React Native debugging environments, so we stick to prefixes
      console.log(`${prefix} ${formattedMsg}`, loggedData || '');
    } else {
      console.log(`${prefix} ${formattedMsg}`, loggedData || '');
    }
  }

  info(category: LogCategory, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: LogCategory, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  debug(category: LogCategory, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

export const Logger = LoggerService.getInstance();
