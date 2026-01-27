import Reactotron from 'reactotron-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

let host = '127.0.0.1'; // Forcer 127.0.0.1 pour Windows + ADB Reverse
if (__DEV__) {
    // Si on n'est pas sur Android, on peut essayer de deviner l'IP
    if (Platform.OS !== 'android') {
        const scriptURL = NativeModules.SourceCode?.scriptURL;
        if (scriptURL) {
            host = scriptURL.split('://')[1].split(':')[0];
        }
    }

    Reactotron.setAsyncStorageHandler!(AsyncStorage)
        .configure({
            name: 'Kiko Mobile App',
            host: host,
            port: 9090
        })
        .useReactNative()
        .connect();

    Reactotron.clear!();
    (console as any).tron = Reactotron;

    console.log(`[Reactotron] Connecting to host: ${host}`);

    const registerAllCommands = () => {
        // Commandes personnalisées pour le debug
        Reactotron.onCustomCommand({
            command: 'display_my_stats',
            handler: async () => {
                try {
                    const { supabase } = require('./lib/supabase/supabaseClients');
                    const { todayWindow } = require('./utils/time');
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return Reactotron.log!('❌ Pas d\'utilisateur connecté');

                    const { data: profile } = await (supabase.from('profiles').select('*').eq('id', user.id).single() as any);
                    const window = todayWindow();
                    const { count: runsToday } = await supabase
                        .from('runs')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .gte('created_at', window.startISO)
                        .lt('created_at', window.endISO);

                    Reactotron.display({
                        name: '📊 MY STATS (DEBUG)',
                        preview: `Plays: ${runsToday}/${profile?.parties_per_day ?? 3}`,
                        value: {
                            profile,
                            runsToday,
                            window,
                            isLocalTime: new Date().toLocaleString()
                        },
                        important: true
                    });
                } catch (err) {
                    Reactotron.error!('Erreur stats', err);
                }
            },
            title: 'Afficher mes Stats',
            description: 'Affiche infos profil et runs du jour.',
        });

        Reactotron.onCustomCommand({
            command: 'simulate_limited_plays',
            handler: () => {
                AsyncStorage.setItem('@debug_simulated_plays', 'true');
                console.log('Mode "Parties Limitées" activé via Reactotron. Redémarrez l\'app.');
                Reactotron.log!('Mode "Parties Limitées" activé');
            },
            title: 'Simuler Parties Limitées',
            description: 'Force l\'app à ignorer le statut Admin pour tester les pubs.',
        });

        Reactotron.onCustomCommand({
            command: 'add_5_plays',
            handler: async () => {
                try {
                    const { supabase } = require('./lib/supabase/supabaseClients');
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return console.log('❌ Pas d\'utilisateur');

                    const { data: profile } = await (supabase.from('profiles').select('parties_per_day').eq('id', user.id).single() as any);
                    const current = profile?.parties_per_day ?? 3;
                    const { error } = await (supabase.from('profiles') as any).update({
                        parties_per_day: current + 5,
                        updated_at: new Date().toISOString()
                    }).eq('id', user.id);

                    if (error) {
                        console.log('❌ Erreur:', error);
                        Reactotron.error!('Erreur add_5_plays', error);
                    } else {
                        console.log(`✅ +5 parties ajoutées (Total: ${current + 5}). Redémarrez ou rafraîchissez.`);
                        Reactotron.log!(`✅ +5 parties ajoutées (Total: ${current + 5})`);
                    }
                } catch (err) {
                    Reactotron.error!('Exception in add_5_plays', err);
                }
            },
            title: 'Ajouter 5 Parties',
            description: 'Incrémente parties_per_day de 5 dans la DB.',
        });

        Reactotron.onCustomCommand({
            command: 'set_admin_true',
            handler: async () => {
                try {
                    const { supabase } = require('./lib/supabase/supabaseClients');
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return console.log('❌ Pas d\'utilisateur');

                    const { error } = await (supabase.from('profiles') as any).update({ is_admin: true }).eq('id', user.id);
                    if (error) Reactotron.error!('Erreur set_admin', error);
                    else Reactotron.log!('✅ Vous êtes maintenant ADMIN (Parties illimitées)');
                } catch (err) {
                    Reactotron.error!('Exception in set_admin', err);
                }
            },
            title: 'Devenir Admin',
            description: 'Définit is_admin = true dans votre profil.',
        });

        Reactotron.onCustomCommand({
            command: 'reset_today_runs',
            handler: async () => {
                try {
                    const { supabase } = require('./lib/supabase/supabaseClients');
                    const { todayWindow } = require('./utils/time');
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return console.log('❌ Pas d\'utilisateur');

                    const window = todayWindow();
                    const { error } = await supabase.from('runs')
                        .delete()
                        .eq('user_id', user.id)
                        .gte('created_at', window.startISO)
                        .lt('created_at', window.endISO);

                    if (error) {
                        console.log('❌ Erreur:', error);
                        Reactotron.error!('Erreur reset_today_runs', error);
                    } else {
                        console.log('✅ Parties du jour réinitialisées. Redémarrez ou rafraîchissez.');
                        Reactotron.log!('✅ Parties du jour réinitialisées');
                    }
                } catch (err) {
                    Reactotron.error!('Exception in reset_today_runs', err);
                }
            },
            title: 'Reset Runs du Jour',
            description: 'Supprime vos parties enregistrées aujourd\'hui.',
        });

        Reactotron.onCustomCommand({
            command: 'reset_debug',
            handler: () => {
                AsyncStorage.removeItem('@debug_simulated_plays');
                console.log('Mode Debug réinitialisé.');
                Reactotron.log!('Mode Debug réinitialisé.');
            },
            title: 'Reset Debug',
            description: 'Supprime tous les flags de simulation debug.',
        });
    };

    // Enregistrement initial
    registerAllCommands();

    // Réenregistrement après délai pour plus de fiabilité
    setTimeout(() => {
        console.log('[Reactotron] Réenregistrement des commandes (timeout 1s)...');
        registerAllCommands();
    }, 1000);

    setTimeout(() => {
        console.log('[Reactotron] Réenregistrement des commandes (timeout 3s)...');
        registerAllCommands();
    }, 3000);

    // Optionnel: Vérifier la connexion
    setTimeout(() => {
        try {
            const isConnected = (Reactotron as any)?.connected;
            console.log(`[Reactotron] État de connexion: ${isConnected ? '✅ Connecté' : '⚠️  En attente'}`);
        } catch (e) {
            console.log('[Reactotron] Impossible de vérifier l\'état de connexion');
        }
    }, 5000);
}

/**
 * Log an event to Reactotron for easy debugging in the "Timeline" tab.
 */
export const logToReactotron = (name: string, params?: any) => {
    if (__DEV__) {
        Reactotron.display({
            name: 'ANALYTICS',
            preview: name,
            value: { name, params, timestamp: new Date().toISOString() },
            important: true,
        });
    }
};

/**
 * Register a custom command in Reactotron.
 */
export const registerDebugCommand = (command: { command: string; handler: () => void; description?: string }) => {
    if (__DEV__) {
        Reactotron.onCustomCommand({
            command: command.command,
            handler: command.handler,
            title: command.command,
            description: command.description,
        });
    }
};

export default Reactotron;
