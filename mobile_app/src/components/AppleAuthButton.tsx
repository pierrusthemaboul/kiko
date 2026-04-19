import React from 'react';
import { StyleSheet, ViewStyle, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AppleAuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  buttonType?: AppleAuthentication.AppleAuthenticationButtonType;
  buttonStyle?: AppleAuthentication.AppleAuthenticationButtonStyle;
}

export function AppleAuthButton({
  onPress,
  disabled = false,
  style,
  buttonType = AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
  buttonStyle = AppleAuthentication.AppleAuthenticationButtonStyle.BLACK,
}: AppleAuthButtonProps) {
  // Only render on iOS - Apple Sign In is not available on Android
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={buttonType}
      buttonStyle={buttonStyle}
      cornerRadius={8}
      style={[styles.button, style, disabled && styles.disabled]}
      onPress={disabled ? undefined : onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
  },
  disabled: {
    opacity: 0.6,
  },
});
