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