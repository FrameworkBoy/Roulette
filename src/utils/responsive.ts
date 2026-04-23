import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const BASE_WIDTH = 390;
const PORTRAIT_RATIO = 16 / 9;
const MAX_SCALE_WIDTH = 1080;

// Scale by whichever dimension is the bottleneck:
// - width vs. base phone width
// - height vs. expected portrait height for that base width
// - hard cap at totem width (1080px)
const scaleRatio = Math.min(
  width / BASE_WIDTH,
  height / (BASE_WIDTH * PORTRAIT_RATIO),
  MAX_SCALE_WIDTH / BASE_WIDTH,
);

export const W = Math.min(width, MAX_SCALE_WIDTH);
export const H = height;

export const scale = (size: number) => Math.round(size * scaleRatio);
export const vw = (pct: number) => (W * pct) / 100;
export const vh = (pct: number) => (H * pct) / 100;

export const CONTENT_MAX_WIDTH = W * 0.85;
export const MODAL_MAX_WIDTH = W * 0.8;
