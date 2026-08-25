import React from "react";
import Svg, {
  Circle,
  Path,
} from "react-native-svg";

const Reddit = ({
  height = 24,
  width = 24,
  color = "#FF4500",
  strokeWidth = 1.7,
  fill = "none",
}: any) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={fill}
    >
      <Path
        d="M17.9 11.35c.18-.34.28-.73.28-1.14 0-1.35-1.1-2.45-2.45-2.45-.7 0-1.34.3-1.79.78A8 8 0 0 0 12 8.2a8.3 8.3 0 0 0-1.95.34L9.35 5.9l2.1-.45a1.55 1.55 0 1 0-.12-.87l-2.1.45a.8.8 0 0 0-.6.96l.82 3.15A7.75 7.75 0 0 0 8.05 10c-.46-.42-1.08-.68-1.75-.68-1.35 0-2.45 1.1-2.45 2.45 0 .41.1.8.28 1.14A4.4 4.4 0 0 0 4 14.95c0 2.8 3.58 5.07 8 5.07s8-2.27 8-5.07a4.4 4.4 0 0 0-2.1-3.6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle
        cx="8.7"
        cy="13.2"
        r=".8"
        fill={color}
      />
      <Circle
        cx="15.3"
        cy="13.2"
        r=".8"
        fill={color}
      />
      <Path
        d="M9.4 16.05c1.65 1.1 3.55 1.1 5.2 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle
        cx="17.55"
        cy="5.1"
        r="1.25"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

export default Reddit;
