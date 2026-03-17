/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof colors
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    const value = colors[colorName];

    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object') {
      const themed = (value as Record<string, unknown>)[theme];
      if (typeof themed === 'string') {
        return themed;
      }

      const light = (value as Record<string, unknown>)['light'];
      if (typeof light === 'string') {
        return light;
      }
    }

    return '#000000';
  }
}
