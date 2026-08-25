import React from "react";
import Svg, {
  Circle,
  Path,
} from "react-native-svg";

const WhatsApp = ({
  height = 24,
  width = 24,
  color = "#25D366",
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
      <Circle
        cx="12"
        cy="12"
        r="8.75"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M8.25 18.2 9.1 15.9a6.2 6.2 0 1 1 2.65 1.05l-2.7 1.25-.8 0Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M9.6 9.1c.2-.45.4-.45.7-.45h.35c.15 0 .3.05.4.3l.55 1.2c.1.2.05.35-.05.5l-.35.45c-.1.1-.1.25 0 .4.3.5.8.95 1.35 1.25.15.1.3.1.4 0l.45-.4c.15-.15.3-.15.5-.05l1.15.55c.2.1.25.25.2.45-.1.55-.6 1.05-1.2 1.2-.4.1-.95 0-1.7-.3-1.3-.55-2.3-1.5-3.1-2.65-.65-.95-.9-1.65-.8-2.45.05-.4.2-.75.4-.95Z"
        fill={color}
      />
    </Svg>
  );
};

export default WhatsApp;
