
import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#0B0A0A',
  card: '#141218',
  goldBorder: '#C8A04A',
  goldAccent: '#E0B457',
  goldGlow: '#8C6B2B',
  textPrimary: '#E8D9A8',
  textSecondary: '#B7A88A',
  error: '#C04D3A',
  progressTrack: '#2A262F',
  inputSlot: '#1A1720',
  buttonGradientStart: '#1C1922',
  buttonGradientEnd: '#0F0E13',
  black: '#000000',
};

export const STYLES = StyleSheet.create({
  // --- Main Container ---
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
  },
  // --- HUD ---
  hudContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  hudCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.25)',
    shadowColor: COLORS.goldBorder,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  hudLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hudValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  hudSubValue: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.progressTrack,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  // --- Event Display ---
  eventCard: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 12,
    backgroundColor: COLORS.card,
  },
  eventImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  eventOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  titleBadge: {
    margin: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.25)',
    overflow: 'hidden', 
  },
  titleBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // --- Input ---
  inputContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  inputSlots: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.inputSlot,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.25)',
    shadowColor: COLORS.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  inputSlot: {
    width: 50,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1720',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.1)',
  },
  inputSlotText: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '600',
  },
  inputSlotActive: {
    borderColor: COLORS.goldAccent,
    shadowColor: COLORS.goldAccent,
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  // --- Numpad ---
  keypadContainer: {
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  key: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  keyInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  keyLabel: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '500',
  },
  actionKey: {
    backgroundColor: COLORS.goldAccent,
  },
  actionKeyText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deleteKey: {
    backgroundColor: 'transparent',
  },
  deleteIcon: {
    color: COLORS.textSecondary,
    fontSize: 28,
  },
  // --- Timer ---
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.25)',
    marginBottom: 12,
  },
  timerTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.progressTrack,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
  },
  timerValue: {
    marginLeft: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    backgroundColor: COLORS.inputSlot,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  // --- General ---
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 8,
  },
});
