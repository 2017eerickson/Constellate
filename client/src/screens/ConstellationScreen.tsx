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
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
const ZOOM_THRESHOLD = 2.5;
const DOUBLE_TAP_ZOOM = 5;

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
  const targetX = useSharedValue(SCREEN_W / 2);
  const targetY = useSharedValue(SCREEN_H / 2);
  const glowOverlay = useSharedValue(0);
  // Shared values for pinch gesture (worklet-safe, replaces selectedStarRef)
  const selectedStarX = useSharedValue(0);
  const selectedStarY = useSharedValue(0);
  const selectedPartnershipId = useSharedValue(0);

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

  const navigateToPlanet = useCallback(
    (partnershipId: number) => {
      navigation.navigate('Planet', { partnershipId });
    },
    [navigation],
  );

  // Reset zoom/overlay only when this screen regains focus (user navigates back)
  useFocusEffect(
    useCallback(() => {
      scale.value = 1;
      targetX.value = SCREEN_W / 2;
      targetY.value = SCREEN_H / 2;
      glowOverlay.value = 0;
      selectedStarX.value = 0;
      selectedStarY.value = 0;
      selectedPartnershipId.value = 0;
      setSelectedStar(null);
    }, [scale, targetX, targetY, glowOverlay, selectedStarX, selectedStarY, selectedPartnershipId]),
  );

  const handleTap = useCallback(
    (tapX: number, tapY: number) => {
      const current = starsRef.current;
      for (const star of current) {
        const dx = tapX - star.x;
        const dy = tapY - star.y;
        if (Math.sqrt(dx * dx + dy * dy) < TAP_HIT_RADIUS) {
          setSelectedStar(star);
          selectedStarX.value = star.x;
          selectedStarY.value = star.y;
          selectedPartnershipId.value = star.partnership.id;
          return;
        }
      }
      setSelectedStar(null);
      selectedPartnershipId.value = 0;
    },
    [selectedStarX, selectedStarY, selectedPartnershipId],
  );

  const handleDoubleTap = useCallback(
    (tapX: number, tapY: number) => {
      const current = starsRef.current;
      for (const star of current) {
        const dx = tapX - star.x;
        const dy = tapY - star.y;
        if (Math.sqrt(dx * dx + dy * dy) < TAP_HIT_RADIUS) {
          // Hide tooltip immediately so it doesn't show during zoom
          setSelectedStar(null);
          selectedStarX.value = star.x;
          selectedStarY.value = star.y;
          selectedPartnershipId.value = star.partnership.id;
          // Set focal point and start zoom immediately
          targetX.value = star.x;
          targetY.value = star.y;
          const duration = 700;
          scale.value = withTiming(DOUBLE_TAP_ZOOM, { duration, easing: Easing.out(Easing.cubic) });
          // Glow overlay fills screen in second half of zoom
          setTimeout(() => {
            glowOverlay.value = withTiming(1, { duration: duration * 0.4, easing: Easing.in(Easing.quad) });
          }, duration * 0.5);
          // Navigate after fully white
          setTimeout(() => navigateToPlanet(star.partnership.id), duration + 100);
          return;
        }
      }
    },
    [navigateToPlanet, scale, targetX, targetY, glowOverlay, selectedStarX, selectedStarY, selectedPartnershipId],
  );

  const tapGesture = Gesture.Tap().onEnd((e) => {
    runOnJS(handleTap)(e.x, e.y);
  });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      runOnJS(handleDoubleTap)(e.x, e.y);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      if (selectedPartnershipId.value > 0) {
        targetX.value = selectedStarX.value;
        targetY.value = selectedStarY.value;
      }
    })
    .onUpdate((e) => {
      if (selectedPartnershipId.value === 0) return;
      scale.value = Math.max(savedScale.value * e.scale, 1);
    })
    .onEnd(() => {
      if (selectedPartnershipId.value === 0) return;
      if (scale.value >= ZOOM_THRESHOLD) {
        runOnJS(navigateToPlanet)(selectedPartnershipId.value);
      } else {
        scale.value = withSpring(1);
        targetX.value = SCREEN_W / 2;
        targetY.value = SCREEN_H / 2;
      }
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, tapGesture);
  const composedGesture = Gesture.Simultaneous(tapGestures, pinchGesture);

  const animatedZoomStyle = useAnimatedStyle(() => {
    // Compensate for scale pushing the star away from center
    const tx = (SCREEN_W / 2 - targetX.value) * scale.value;
    const ty = (SCREEN_H / 2 - targetY.value) * scale.value;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: scale.value },
      ],
    };
  });

  const glowOverlayStyle = useAnimatedStyle(() => ({
    opacity: glowOverlay.value,
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

      {/* Glow overlay — white wash that covers the screen like the star's light consuming everything */}
      <Animated.View style={[styles.glowOverlay, glowOverlayStyle]} pointerEvents="none" />
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
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
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
