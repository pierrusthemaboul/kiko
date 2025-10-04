export const colors = {
    // Couleurs primaires
    primary: '#1D5F9E',      // Bleu principal
    secondary: '#0A173D',    // Navy Blue profond
    accent: '#FFCC00',       // Or métallique
  
    // Couleurs sémantiques
    correctGreen: '#27ae60',   // Pour les bonnes réponses
    incorrectRed: '#e74c3c',   // Pour les mauvaises réponses
    warningYellow: '#f1c40f',  // Pour les alertes/avertissements
    timerNormal: '#4ECDC4',    // Pour le timer en état normal
  
    // Couleurs de texte
    text: '#2c3e50',           // Texte principal
    lightText: '#7f8c8d',      // Texte secondaire
    darkText: '#2c3e50',       // Texte foncé
    white: '#FFFFFF',          // Blanc pur
  
    // Couleurs de fond
    background: {
      dark: '#020817',         // Fond très sombre
      medium: '#050B1F',       // Fond sombre
      light: '#0A173D'         // Fond moins sombre
    },
  
    // Couleurs de transparence
    transparencies: {
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.3)',
      dark: 'rgba(0, 0, 0, 0.5)'
    },
  
    // Couleurs de cardBackground
    cardBackground: '#FFFFFF',   // Fond des cartes
  
    // Gradients (pour référence)
    gradients: {
      primary: ['#1D5F9E', '#0A173D'],     // Gradient principal
      secondary: ['#FFBF00', '#CC9900'],    // Gradient secondaire
      tertiary: ['#0A173D', '#1D5F9E']      // Gradient tertiaire
    }
  } as const;
  
  export default colors;

export const steampunkTheme = {
  mainBg: '#0B0A0A',
  cardPanel: '#141218',
  goldBorder: '#C8A04A',
  goldAccent: '#E0B457',
  goldGlow: '#8C6B2B',
  primaryText: '#E8D9A8',
  secondaryText: '#B7A88A',
  error: '#C04D3A',
  progressTrack: '#2A262F',
  inputSlot: '#1A1720',
  buttonGradientStart: '#1C1922',
  buttonGradientEnd: '#0F0E13',
  cardGradient: {
    start: '#1A171F',
    end: '#0F0E12',
  },
  goldGradient: {
    start: '#E0B457',
    end: '#8C6B2B',
  },
  pressedOverlay: 'rgba(224, 180, 87, 0.12)',
  glassBg: 'rgba(20, 18, 24, 0.6)',
  goldBorderTransparent: 'rgba(200, 160, 74, 0.25)',
  inputGlow: 'rgba(224, 180, 87, 0.25)',
};