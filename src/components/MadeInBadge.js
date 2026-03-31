import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const logo = require('../image/logo1.png');

export default function MadeInBadge() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>mad in</Text>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
    zIndex: 20,
  },

  text: {
    fontSize: 10,
    color: '#8EA3C7',
    fontWeight: '600',
  },

  logo: {
    width: 40,
    height: 40,
  },
});