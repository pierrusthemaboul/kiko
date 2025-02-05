export const Colors = {
    light: {
      text: '#000000',
      background: '#FFFFFF',
      primary: '#1D5F9E',
      secondary: '#0A173D',
      tint: '#2f95dc',
      tabIconDefault: '#cccccc',
      tabIconSelected: '#2f95dc',
      border: '#cccccc',
    },
    dark: {
      text: '#FFFFFF',
      background: '#020817',
      primary: '#1D5F9E',
      secondary: '#0A173D',
      tint: '#ffffff',
      tabIconDefault: '#cccccc',
      tabIconSelected: '#ffffff',
      border: '#272729',
    },
  } as const;
  
  export type ColorTheme = typeof Colors.light & typeof Colors.dark;
  
  export default Colors;