import { theme } from "@/constants/theme";
import { hp } from "@/helpers/common";
import React from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";

interface ButtonProps {
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  title?: string;
  onPress?: () => void;
  loading?: boolean;
  hasShadow?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  buttonStyle,
  textStyle,
  title = "",
  onPress = () => {},
  loading = false,
  hasShadow = true,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        hasShadow && styles.shadow,
        pressed &&
          !loading &&
          styles.pressed,
        loading &&
          styles.loadingButton,
        buttonStyle,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={theme.colors.text}
        />
      ) : (
        <Text
          style={[
            styles.text,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

export default Button;

const styles =
  StyleSheet.create({
    button: {
      minHeight: 50,
      paddingHorizontal: 18,
      backgroundColor:
        theme.colors.primary,
      justifyContent:
        "center",
      alignItems:
        "center",
      borderRadius:
        theme.radius.xl,
      borderWidth: 1,
      borderColor:
        theme.colors.primaryLight,
    },

    shadow: {
      shadowColor:
        theme.colors.dark,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity:
        0.22,
      shadowRadius: 8,
      elevation: 4,
    },

    pressed: {
      backgroundColor:
        theme.colors.primaryDark,
      transform: [
        {
          scale: 0.985,
        },
      ],
    },

    loadingButton: {
      backgroundColor:
        theme.colors.card,
      borderColor:
        theme.colors.gray,
    },

    text: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
    },
  });
