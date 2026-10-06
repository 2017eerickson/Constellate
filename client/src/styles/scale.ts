import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base design dimensions (iPhone 14 / standard design reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Scale based on screen width (use for most things: fontSize, padding, margin, borderRadius)
export function scale(size: number): number {
  return Math.round((width / BASE_WIDTH) * size);
}

// Scale based on screen height (use for vertical spacing that should scale with taller/shorter screens)
export function verticalScale(size: number): number {
  return Math.round((height / BASE_HEIGHT) * size);
}

// Moderate scale — scales less aggressively (good for font sizes so they don't get huge on tablets)
// factor defaults to 0.5 — halfway between no scaling and full scaling
export function moderateScale(size: number, factor: number = 0.5): number {
  return Math.round(size + (scale(size) - size) * factor);
}
