// /home/pierre/sword/kiko/ReactotronConfig.web.ts
// Mock for Reactotron on Web to prevent crashes

export const logToReactotron = (name: string, params?: any) => {
  // No-op on Web
};

export const registerDebugCommand = (command: any) => {
  // No-op on Web
};

const Reactotron = {
  configure: () => Reactotron,
  useReactNative: () => Reactotron,
  connect: () => Reactotron,
  clear: () => Reactotron,
  log: () => {},
  display: () => {},
  error: () => {},
  onCustomCommand: () => {},
};

export default Reactotron;
