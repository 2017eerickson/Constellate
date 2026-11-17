import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  children: React.ReactNode;
};

export default function LandingBackground({ children }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#1a1030', '#2a1545']}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={require('../../assets/backgrounds/stars.png')}
        style={[StyleSheet.absoluteFill, styles.stars]}
        resizeMode="cover"
      />
      <Image
        source={require('../../assets/backgrounds/sun.png')}
        style={styles.sunLayer}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/backgrounds/planets.png')}
        style={styles.planetsLayer}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/backgrounds/mountains-1.png')}
        style={styles.mountains}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  stars: {
    width: '100%',
    height: '100%',
  },
  sunLayer: {
    position: 'absolute',
    top: '0%',
    left: 0,
    right: 0,
    width: '110%',
    height: '36%',
  },
  planetsLayer: {
    position: 'absolute',
    bottom: '0%',
    left: '20%',
    width: '110%',
    height: '25%',
  },
  mountains: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '50%',
  },
});
