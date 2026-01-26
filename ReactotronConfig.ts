import Reactotron from 'reactotron-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

let host = 'localhost';
if (__DEV__) {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
        host = scriptURL.split('://')[1].split(':')[0];
    }

    Reactotron.setAsyncStorageHandler!(AsyncStorage)
        .configure({
            name: 'Kiko Mobile App',
            host: host,
        })
        .useReactNative()
        .connect();

    Reactotron.clear!();
    (console as any).tron = Reactotron;
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
