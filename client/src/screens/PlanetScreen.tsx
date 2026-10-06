import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Circle,
  LinearGradient,
  Line,
  Rect,
  vec,
  Blur,
  Paint,
  Oval,
} from '@shopify/react-native-skia';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { getPartnerships } from '../services/partnerships';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { moderateScale } from '../styles/scale';
import type { Partnership } from '../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PLANET_RADIUS = SCREEN_W * 0.22;
const PLANET_CX = SCREEN_W / 2;
const PLANET_CY = SCREEN_H * 0.52;
const ORBIT_RADIUS = PLANET_RADIUS + moderateScale(40);
const ORBIT_DOT_SIZE = moderateScale(20);
const SPIN_RADIUS = PLANET_RADIUS * 0.92;

// 45° orbit line endpoints
const COS45 = Math.cos(Math.PI / 4);
const SIN45 = Math.sin(Math.PI / 4);
const ORBIT_R_X = PLANET_CX + ORBIT_RADIUS * COS45;
const ORBIT_R_Y = PLANET_CY + ORBIT_RADIUS * SIN45;
const ORBIT_L_X = PLANET_CX - ORBIT_RADIUS * COS45;
const ORBIT_L_Y = PLANET_CY - ORBIT_RADIUS * SIN45;

type MainStackParamList = {
  Planet: { partnershipId: number };
};

const PLANET_COLORS: string[][] = [
  ['#7c4dff', '#b388ff', '#4a148c'],  // purple (soulmate)
  ['#ff6b6b', '#ffa07a', '#8b0000'],  // warm red
  ['#4fc3f7', '#81d4fa', '#01579b'],  // blue
  ['#81c784', '#a5d6a7', '#1b5e20'],  // green
  ['#ffb74d', '#ffcc80', '#e65100'],  // orange
  ['#f06292', '#f48fb1', '#880e4f'],  // pink
];

function getPlanetColors(partnershipId: number): string[] {
  return PLANET_COLORS[partnershipId % PLANET_COLORS.length];
}

export default function PlanetScreen() {
  const route = useRoute<RouteProp<MainStackParamList, 'Planet'>>();
  const { partnershipId } = route.params;
  const { user } = useAuth();
  const [partnership, setPartnership] = useState<Partnership | null>(null);

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(rotation.value / 360) * SPIN_RADIUS * 2 }],
  }));

  useEffect(() => {
    getPartnerships()
      .then((ps) => {
        const found = ps.find((p) => p.id === partnershipId);
        if (found) setPartnership(found);
      })
      .catch(() => {});
  }, [partnershipId]);

  const planetColors = getPlanetColors(partnershipId);
  const isSoulmate = partnership?.relation === 'soulmate';

  const [partnerA, partnerB] = (() => {
    if (!partnership || !user) return ['', ''];
    if (isSoulmate) return [user.first_name, user.first_name];
    const isInitiator = partnership.initiator.id === user.id;
    return isInitiator
      ? [user.first_name, partnership.partner.first_name]
      : [user.first_name, partnership.initiator.first_name];
  })();

  const daysInOrbit = (() => {
    let startDate: string | null = null;
    if (isSoulmate) {
      startDate = user?.birthday || user?.created_at || null;
    } else {
      startDate = partnership?.anniversary || partnership?.started_at || null;
    }
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  })();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statsColumn}>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="star-four-points" size={moderateScale(14)} color={colors.starGlow} />
            <Text style={styles.statValue}>{partnership?.stardust ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="star-shooting" size={moderateScale(14)} color={colors.starGlow} />
            <Text style={styles.statValue}>{partnership?.streak?.current_count ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="satellite-variant" size={moderateScale(14)} color={colors.starGlow} />
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>

        <View style={styles.titleCenter}>
          <Text style={styles.name}>{partnerA} & {partnerB}</Text>
          <Text style={styles.daysText}>{daysInOrbit} days in orbit</Text>
        </View>
      </View>

      {/* Planet Canvas */}
      <Canvas style={styles.canvas}>
        {/* Background */}
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H}>
          <LinearGradient
            start={vec(SCREEN_W / 2, 0)}
            end={vec(SCREEN_W / 2, SCREEN_H)}
            colors={[colors.skyPurple, colors.skyDark]}
          />
        </Rect>

        {/* Atmospheric glow */}
        <Circle cx={PLANET_CX} cy={PLANET_CY} r={PLANET_RADIUS + 30} opacity={0.15}>
          <Paint color={planetColors[1]}>
            <Blur blur={25} />
          </Paint>
        </Circle>
        <Circle cx={PLANET_CX} cy={PLANET_CY} r={PLANET_RADIUS + 15} opacity={0.2}>
          <Paint color={planetColors[1]}>
            <Blur blur={12} />
          </Paint>
        </Circle>

        {/* Orbit line — drawn BEFORE planet so planet body covers the center */}
        <Line
          p1={vec(ORBIT_L_X, ORBIT_L_Y)}
          p2={vec(ORBIT_R_X, ORBIT_R_Y)}
          strokeWidth={2}
          color="rgba(180, 160, 220, 0.5)"
        />

        {/* Planet body */}
        <Circle cx={PLANET_CX} cy={PLANET_CY} r={PLANET_RADIUS}>
          <LinearGradient
            start={vec(PLANET_CX - PLANET_RADIUS, PLANET_CY - PLANET_RADIUS)}
            end={vec(PLANET_CX + PLANET_RADIUS, PLANET_CY + PLANET_RADIUS)}
            colors={planetColors}
          />
        </Circle>

      </Canvas>

      {/* Circular mask for spinning surface */}
      <View style={styles.spinMask}>
        <Animated.View style={[styles.spinScroll, spinStyle]}>
          <Canvas style={styles.spinCanvas}>
            {/* Tile 1 */}
            <Oval
              x={SPIN_RADIUS * 0.2}
              y={SPIN_RADIUS * 0.35}
              width={SPIN_RADIUS * 1.6}
              height={SPIN_RADIUS * 0.16}
              opacity={0.25}
              color={planetColors[0]}
            />
            <Oval
              x={SPIN_RADIUS * 0.45}
              y={SPIN_RADIUS * 0.9}
              width={SPIN_RADIUS * 1.0}
              height={SPIN_RADIUS * 0.14}
              opacity={0.35}
              color={planetColors[2]}
            />
            <Oval
              x={SPIN_RADIUS * 0.3}
              y={SPIN_RADIUS * 1.45}
              width={SPIN_RADIUS * 1.3}
              height={SPIN_RADIUS * 0.14}
              opacity={0.5}
              color={planetColors[2]}
            />
            {/* Tile 2 (offset by SPIN_RADIUS*2 for seamless loop) */}
            <Oval
              x={SPIN_RADIUS * 2 + SPIN_RADIUS * 0.2}
              y={SPIN_RADIUS * 0.35}
              width={SPIN_RADIUS * 1.6}
              height={SPIN_RADIUS * 0.16}
              opacity={0.25}
              color={planetColors[0]}
            />
            <Oval
              x={SPIN_RADIUS * 2 + SPIN_RADIUS * 0.45}
              y={SPIN_RADIUS * 0.9}
              width={SPIN_RADIUS * 1.0}
              height={SPIN_RADIUS * 0.07}
              opacity={0.35}
              color={planetColors[2]}
            />
            <Oval
              x={SPIN_RADIUS * 2 + SPIN_RADIUS * 0.3}
              y={SPIN_RADIUS * 1.45}
              width={SPIN_RADIUS * 2}
              height={SPIN_RADIUS * 0.1}
              opacity={0.5}
              color={planetColors[2]}
            />
          </Canvas>
        </Animated.View>
      </View>

      {/* Partner dots at orbit endpoints */}
      <View style={[styles.orbitDot, styles.orbitDotA]} />
      <View style={[styles.orbitDot, styles.orbitDotB]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDark,
  },
  header: {
    position: 'absolute',
    top: SCREEN_H * 0.15,
    width: '100%',
    zIndex: 10,
  },
  statsColumn: {
    position: 'absolute',
    left: moderateScale(16),
    top: 0,
    gap: moderateScale(6),
    zIndex: 11,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  statValue: {
    color: colors.starGlow,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  titleCenter: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    color: colors.white,
    fontSize: moderateScale(22),
    fontWeight: '700',
  },
  daysText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: moderateScale(13),
    marginTop: moderateScale(2),
  },
  canvas: {
    flex: 1,
  },
  spinMask: {
    position: 'absolute',
    width: SPIN_RADIUS * 2,
    height: SPIN_RADIUS * 2,
    left: PLANET_CX - SPIN_RADIUS,
    top: PLANET_CY - SPIN_RADIUS,
    borderRadius: SPIN_RADIUS,
    overflow: 'hidden',
  },
  spinScroll: {
    width: SPIN_RADIUS * 4,
    height: SPIN_RADIUS * 2,
  },
  spinCanvas: {
    width: SPIN_RADIUS * 4,
    height: SPIN_RADIUS * 2,
  },
  orbitDot: {
    position: 'absolute',
    width: ORBIT_DOT_SIZE,
    height: ORBIT_DOT_SIZE,
    borderRadius: ORBIT_DOT_SIZE / 2,
  },
  orbitDotA: {
    backgroundColor: '#FFD700',
    left: ORBIT_R_X - ORBIT_DOT_SIZE / 2,
    top: ORBIT_R_Y - ORBIT_DOT_SIZE / 2,
  },
  orbitDotB: {
    backgroundColor: '#87CEEB',
    left: ORBIT_L_X - ORBIT_DOT_SIZE / 2,
    top: ORBIT_L_Y - ORBIT_DOT_SIZE / 2,
  },
});
