import React from "react";
import Svg, {
  Path,
} from "react-native-svg";

const TikTok = ({
  height = 24,
  width = 24,
  color = "#FFFFFF",
  strokeWidth = 2,
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
        d="M14 4v9.25a3.75 3.75 0 1 1-3-3.67"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 4c.45 2.2 1.75 3.5 4 3.75"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default TikTok;
