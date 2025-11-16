import { Platform } from "react-native";

export type ShadowOptions = {
  color?: string;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
  webFallback?: string;
};

const DEFAULT_COLOR = "#0D1B5E";

export const platformShadow = ({
  color = DEFAULT_COLOR,
  offsetX = 0,
  offsetY = 8,
  opacity = 0.08,
  radius = 18,
  elevation = 6,
  webFallback,
}: ShadowOptions = {}) => {
  if (Platform.OS === "web") {
    const boxShadow =
      webFallback ??
      `0px ${offsetY}px ${Math.round(
        radius * 1.3
      )}px rgba(13, 27, 94, ${opacity})`;
    return {
      boxShadow,
    };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
};
