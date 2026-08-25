import React from "react";
import Svg, {
  Path,
} from "react-native-svg";

const X = ({
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
        d="M4.5 4.5 19.5 19.5M19.5 4.5l-15 15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default X;
