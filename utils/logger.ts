import { Platform, NativeModules } from 'react-native';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogCategory = 'Ads' | 'GameLogic' | 'Quests' | 'Navigation' | 'System' | 'Plays';

// Récupération de l'IP du serveur pour l'OBSERVER (comme Reactotron)
let agentHost = 'localhost';
if (__DEV__) {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    agentHost = scriptURL.split('://')[1].split(':')[0];
  }
}

/**
 * Logger structured for easier debugging.
 * In development, it prints to console and sends to OBSERVER agent.
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

  async broadcastToAgent(logData: any) {
    if (!__DEV__) return;
    try {
      await fetch(`http://${agentHost}:9091/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (e) {
      // Échec silencieux si l'agent n'est pas lancé
    }
  }

  log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const logEntry = {
      level,
      category,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    const { prefix, message: formattedMsg, data: loggedData } = this.formatMessage(level, category, message, data);

    // Store in memory
    this.logs.unshift(logEntry);
    if (this.logs.length > this.MAX_LOGS) this.logs.pop();

    // Console output
    console.log(`${prefix} ${formattedMsg}`, loggedData || '');

    // Broadcast to OBSERVER Agent
    if (__DEV__) {
      this.broadcastToAgent(logEntry);
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
