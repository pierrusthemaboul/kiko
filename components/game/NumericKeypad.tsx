import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { steampunkTheme } from '../../constants/Colors';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const KEY_HEIGHT_RATIO = 1.02;
export const NUMERIC_KEYPAD_HEIGHT_RATIO = KEY_HEIGHT_RATIO;

type DigitLabel = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

interface NumericKeypadProps {
  disabled?: boolean;
  hasGuess: boolean;
  onDigit: (digit: DigitLabel) => void;
  onDelete: () => void;
  onSubmit: () => void;
  style?: StyleProp<ViewStyle>;
  keySize?: number;
  gap?: number;
  keyHeightRatio?: number; // Ratio hauteur/largeur des touches (par défaut KEY_HEIGHT_RATIO)
}

interface KeyConfig {
  type: 'digit' | 'delete' | 'submit';
  label: string;
}

const KEY_ROWS: KeyConfig[][] = [
  [
    { type: 'digit', label: '1' },
    { type: 'digit', label: '2' },
    { type: 'digit', label: '3' },
  ],
  [
    { type: 'digit', label: '4' },
    { type: 'digit', label: '5' },
    { type: 'digit', label: '6' },
  ],
  [
    { type: 'digit', label: '7' },
    { type: 'digit', label: '8' },
    { type: 'digit', label: '9' },
  ],
  [
    { type: 'delete', label: 'delete' },
    { type: 'digit', label: '0' },
    { type: 'submit', label: 'Valider' },
  ],
];

interface KeyButtonProps {
  config: KeyConfig;
  disabled: boolean;
  hasGuess: boolean;
  onDigit: (digit: DigitLabel) => void;
  onDelete: () => void;
  onSubmit: () => void;
  keyStyle: StyleProp<ViewStyle>;
  labelFontSize: number;
}

const KeyButton = memo<KeyButtonProps>(({ config, disabled, hasGuess, onDigit, onDelete, onSubmit, keyStyle, labelFontSize }) => {
  const handlePressIn = useCallback(() => {
    if (disabled) return;
    if (config.type === 'digit') {
      onDigit(config.label as DigitLabel);
    } else if (config.type === 'delete') {
      onDelete();
    } else if (!hasGuess) {
      return;
    } else {
      onSubmit();
    }
  }, [config.label, config.type, disabled, hasGuess, onDelete, onDigit, onSubmit]);

  const isSubmit = config.type === 'submit';
  const isDelete = config.type === 'delete';
  const gradientColors =
    config.type === 'submit'
      ? ['#E0B457', '#8C6B2B']
      : config.type === 'digit'
        ? ['#1C1922', '#0F0E13']
        : undefined;

  const buttonDisabled = disabled || (isSubmit && !hasGuess);

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      disabled={buttonDisabled}
      onPressIn={handlePressIn}
      style={({ pressed }) => [
        styles.keyBase,
        keyStyle,
        isSubmit && styles.submitKey,
        isDelete && styles.deleteKey,
        buttonDisabled && styles.keyDisabled,
        pressed && !buttonDisabled && styles.keyPressed,
      ]}
    >
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      <View style={styles.keyContent} pointerEvents="none">
        {isDelete ? (
          <Ionicons
            name="backspace-outline"
            size={Math.max(20, Math.round(labelFontSize * 1.1))}
            color={steampunkTheme.secondaryText}
          />
        ) : (
          <Text
            style={[
              styles.keyLabel,
              { fontSize: labelFontSize },
              isSubmit && styles.submitKeyLabel,
            ]}
          >
            {config.label}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

KeyButton.displayName = 'KeyButton';

const NumericKeypadComponent: React.FC<NumericKeypadProps> = ({
  disabled = false,
  hasGuess,
  onDigit,
  onDelete,
  onSubmit,
  style,
  keySize,
  gap = 8,
  keyHeightRatio,
}) => {
  const spacing = typeof gap === 'number' && gap >= 0 ? gap : 8;
  const verticalPadding = Math.max(1, Math.floor(spacing / 3));
  const effectiveHeightRatio = keyHeightRatio ?? KEY_HEIGHT_RATIO;
  const derivedKeyStyle =
    keySize && keySize > 0
      ? {
          width: keySize,
          height: Math.round(keySize * effectiveHeightRatio),
          flex: 0,
        }
      : styles.keyFlexible;
  const labelFontSize = keySize && keySize > 0 ? Math.max(14, Math.round(keySize * 0.42)) : 22;

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: 0,
          paddingVertical: verticalPadding,
          gap: spacing,
        },
        style,
      ]}
    >
      {KEY_ROWS.map((row, index) => (
        <View key={`row-${index}`} style={[styles.row, { gap: spacing }]}>
          {row.map((config) => (
            <KeyButton
              key={config.label}
              config={config}
              disabled={disabled}
              hasGuess={hasGuess}
              onDigit={onDigit}
              onDelete={onDelete}
              onSubmit={onSubmit}
              keyStyle={derivedKeyStyle}
              labelFontSize={labelFontSize}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

export const NumericKeypad = memo(NumericKeypadComponent);

NumericKeypad.displayName = 'NumericKeypad';

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  keyBase: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#1C1922',
  },
  keyContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyLabel: {
    color: '#E8D9A8',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
  },
  keyFlexible: {
    flex: 1,
    aspectRatio: 1 / KEY_HEIGHT_RATIO,
  },
  submitKey: {
    backgroundColor: '#E0B457',
  },
  submitKeyLabel: {
    color: '#0B0A0A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteKey: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.3)',
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyPressed: {
    transform: [{ scale: 0.97 }],
  },
});

export default NumericKeypad;
