import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { scale } from '../utils/responsive';

export default function ScreenLogo({ size = 'small' }: { size?: 'large' | 'small' }) {
  return (
    <Image
      source={require('../assets/lab-to-go.png')}
      style={size === 'large' ? styles.large : styles.small}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  large: {
    width: '100%',
    height: scale(160),
    alignSelf: 'stretch',
    marginBottom: scale(8),
  },
  small: {
    width: '100%',
    height: scale(80),
    alignSelf: 'stretch',
    marginBottom: scale(4),
  },
});
