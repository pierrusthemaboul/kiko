import { supabase } from './supabase/supabaseClients';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Logger } from '@/utils/logger';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface RemoteLogEntry {
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
    userId?: string;
    sessionId?: string;
}

class RemoteLoggerService {
    private sessionId: string;
    private appVersion: string;
    private platform: string;

    constructor() {
        this.sessionId = Math.random().toString(36).substring(7);
        this.appVersion = Constants.expoConfig?.version ?? 'unknown';
        this.platform = Platform.OS;
    }

    async log(entry: RemoteLogEntry) {
        // On log quand même en local pour l'OBSERVER
        const logMethod = entry.level === 'error' || entry.level === 'critical' ? 'error' :
            entry.level === 'warn' ? 'warn' : 'info';

        Logger[logMethod](entry.category as any, entry.message, entry.data);

        // Envoi à Supabase (Les Sentinelles)
        try {
            let finalUserId = entry.userId;
            if (!finalUserId) {
                const { data: authData } = await supabase.auth.getUser();
                finalUserId = authData?.user?.id;
            }

            const { error } = await (supabase.from('remote_debug_logs') as any).insert({
                level: entry.level,
                category: entry.category,
                message: entry.message,
                data: entry.data,
                user_id: finalUserId,
                session_id: entry.sessionId || this.sessionId,
                app_version: this.appVersion,
                platform: this.platform
            });

            if (error) {
                console.warn('[RemoteLogger] Failed to send log to Supabase:', error.message);
            }
        } catch (err) {
            console.warn('[RemoteLogger] Critical failure sending log:', err);
        }
    }

    async info(category: string, message: string, data?: any, userId?: string) {
        return this.log({ level: 'info', category, message, data, userId });
    }

    async warn(category: string, message: string, data?: any, userId?: string) {
        return this.log({ level: 'warn', category, message, data, userId });
    }

    async error(category: string, message: string, data?: any, userId?: string) {
        return this.log({ level: 'error', category, message, data, userId });
    }
}

export const RemoteLogger = new RemoteLoggerService();
