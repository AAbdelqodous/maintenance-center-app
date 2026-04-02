import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export function AppText({ style, ...props }: TextProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  return <Text style={[isRTL ? styles.rtl : styles.ltr, style]} {...props} />;
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl', fontFamily: undefined },
  ltr: { textAlign: 'left', writingDirection: 'ltr', fontFamily: undefined },
});
