import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Line, LinearGradient, Rect, vec, Blur } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPartnerships } from '../services/partnerships';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { moderateScale } from '../styles/scale';
import type { Partnership } from '../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CENTER = vec(SCREEN_W / 2, SCREEN_H / 2 - 40);
const STAR_RADIUS = 8;
const SOULMATE_RADIUS = 12;
const GLOW_RADIUS = 28;
const SOULMATE_GLOW_RADIUS = 36;
const ORBIT_RADIUS_MIN = SCREEN_W * 0.22;
const ORBIT_RADIUS_MAX = SCREEN_W * 0.38;
const TAP_HIT_RADIUS = 30;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

type MainStackParamList = {
  Tabs: undefined;
  Connect: undefined;
  PartnerDetail: { partnershipId: number };
  Planet: { partnershipId: number };
};

interface StarData {
  partnership: Partnership;
  x: number;
  y: number;
  isSoulmate: boolean;
  label: string;
  relation: string;
}

function layoutStars(
  partnerships: Partnership[],
  userId: number,
): StarData[] {
  const soulmate = partnerships.find((p) => p.relation === 'soulmate');
  const others = partnerships.filter(
    (p) => p.relation !== 'soulmate' && p.status === 'active',
  );

  const stars: StarData[] = [];

  if (soulmate) {
    stars.push({
      partnership: soulmate,
      x: CENTER.x,
      y: CENTER.y,
      isSoulmate: true,
      label: 'You',
      relation: 'soulmate',
    });
  }

  const count = others.length;
  others.forEach((p, i) => {
    const angle = (2 * Math.PI * i) / Math.max(count, 1) + Math.PI / 6;
    const radius = ORBIT_RADIUS_MIN + Math.random() * (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN);
    const partnerUser = p.initiator.id === userId ? p.partner : p.initiator;
    stars.push({
      partnership: p,
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
      isSoulmate: false,
      label: partnerUser.first_name || 'Partner',
      relation: p.relation || 'partner',
    });
  });

  return stars;
}

export default function ConstellationScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const starsRef = useRef<StarData[]>([]);

  // Zoom state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    getPartnerships()
      .then(setPartnerships)
      .catch(() => {});
  }, []);

  const stars = useMemo(() => {
    if (!user || partnerships.length === 0) return [];
    const laid = layoutStars(partnerships, user.id);
    starsRef.current = laid;
    return laid;
  }, [partnerships, user]);

  const handleTap = useCallback(
    (tapX: number, tapY: number) => {
      const current = starsRef.current;
      for (const star of current) {
        const dx = tapX - star.x;
        const dy = tapY - star.y;
        if (Math.sqrt(dx * dx + dy * dy) < TAP_HIT_RADIUS) {
          if (selectedStar && selectedStar.partnership.id === star.partnership.id) {
            navigation.navigate('Planet', { partnershipId: star.partnership.id });
          } else {
            setSelectedStar(star);
          }
          return;
        }
      }
      setSelectedStar(null);
    },
    [selectedStar, navigation],
  );

  const clampTranslation = () => {
    'worklet';
    const maxOffsetX = (SCREEN_W * (scale.value - 1)) / 2;
    const maxOffsetY = (SCREEN_H * (scale.value - 1)) / 2;

    if (translateX.value > maxOffsetX) {
      translateX.value = withSpring(maxOffsetX);
    } else if (translateX.value < -maxOffsetX) {
      translateX.value = withSpring(-maxOffsetX);
    }

    if (translateY.value > maxOffsetY) {
      translateY.value = withSpring(maxOffsetY);
    } else if (translateY.value < -maxOffsetY) {
      translateY.value = withSpring(-maxOffsetY);
    }

    if (scale.value <= 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  };

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const s = scale.value;
    const tx = translateX.value;
    const ty = translateY.value;
    const contentX = (e.x - SCREEN_W / 2) / s + SCREEN_W / 2 - tx / s;
    const contentY = (e.y - SCREEN_H / 2) / s + SCREEN_H / 2 - ty / s;
    runOnJS(handleTap)(contentX, contentY);
  });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      runOnJS(setSelectedStar)(null);
    })
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE * 0.8), MAX_SCALE * 1.1);
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE);
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE);
      }
      savedScale.value = scale.value;
      clampTranslation();
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      clampTranslation();
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, pinchGesture, panGesture);

  const animatedZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.zoomContainer, animatedZoomStyle]}>
        <Canvas style={styles.canvas}>
          {/* Background gradient */}
          <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H}>
            <LinearGradient
              start={vec(SCREEN_W / 2, 0)}
              end={vec(SCREEN_W / 2, SCREEN_H)}
              colors={[colors.skyPurple, colors.skyDark]}
            />
          </Rect>

          {/* Lines from each partner star to center soulmate */}
          {stars
            .filter((s) => !s.isSoulmate)
            .map((star) => (
              <React.Fragment key={`line-${star.partnership.id}`}>
                {/* Outer glow line */}
                <Line
                  p1={vec(CENTER.x, CENTER.y)}
                  p2={vec(star.x, star.y)}
                  color={colors.lineGlow}
                  strokeWidth={6}
                />
                {/* Inner line */}
                <Line
                  p1={vec(CENTER.x, CENTER.y)}
                  p2={vec(star.x, star.y)}
                  color={colors.lineMuted}
                  strokeWidth={1.5}
                />
              </React.Fragment>
            ))}

          {/* Stars */}
          {stars.map((star) => (
            <React.Fragment key={`star-${star.partnership.id}`}>
              {/* Glow */}
              <Circle
                cx={star.x}
                cy={star.y}
                r={star.isSoulmate ? SOULMATE_GLOW_RADIUS : GLOW_RADIUS}
                color={star.isSoulmate ? colors.soulmateGlow : colors.starGlow}
                opacity={0.3}
              >
                <Blur blur={star.isSoulmate ? 18 : 12} />
              </Circle>
              {/* Core */}
              <Circle
                cx={star.x}
                cy={star.y}
                r={star.isSoulmate ? SOULMATE_RADIUS : STAR_RADIUS}
                color={star.isSoulmate ? colors.soulmateGlow : colors.starCore}
              />
            </React.Fragment>
          ))}
        </Canvas>

      {/* Tooltip overlay */}
      {selectedStar && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.tooltip,
            {
              left: selectedStar.x - 60,
              top: selectedStar.y - 70,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipName}>{selectedStar.label}</Text>
          <Text style={styles.tooltipRelation}>{selectedStar.relation}</Text>
        </Animated.View>
      )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDark,
  },
  zoomContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.tooltipBg,
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    minWidth: 120,
  },
  tooltipName: {
    color: colors.white,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  tooltipRelation: {
    color: colors.starGlow,
    fontSize: moderateScale(12),
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
