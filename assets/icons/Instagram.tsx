import React from "react";
import Svg, {
  Path,
} from "react-native-svg";

const Instagram = ({
  height = 24,
  width = 24,
  color = "#E1306C",
  strokeWidth = 1.8,
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
        d="M7.5 2.75h9A4.75 4.75 0 0 1 21.25 7.5v9a4.75 4.75 0 0 1-4.75 4.75h-9A4.75 4.75 0 0 1 2.75 16.5v-9A4.75 4.75 0 0 1 7.5 2.75Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M12 16.25A4.25 4.25 0 1 0 12 7.75a4.25 4.25 0 0 0 0 8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M17.5 6.5h.01"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default Instagram;
