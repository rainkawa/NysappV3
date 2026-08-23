import { theme } from "@/constants/theme";
import { hp } from "@/helpers/common";
import React from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInput,
  TextInputProps,
} from "react-native";

interface InputProps
  extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  inputRef?: React.Ref<TextInput>;
}

const Input: React.FC<
  InputProps
> = ({
  containerStyle,
  icon,
  inputRef,
  multiline,
  ...props
}) => {
  return (
    <View
      style={[
        styles.container,
        multiline &&
          styles.multilineContainer,
        containerStyle,
      ]}
    >
      {icon && icon}

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          multiline &&
            styles.multilineInput,
        ]}
        placeholderTextColor={
          theme.colors.textLight
        }
        multiline={multiline}
        {...props}
      />
    </View>
  );
};

export default Input;

const styles =
  StyleSheet.create({
    container: {
      flexDirection:
        "row",
      minHeight: hp(7.2),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 0.4,
      borderColor:
        theme.colors.text,
      borderRadius:
        theme.radius.sm,
      paddingHorizontal: 18,
      gap: 12,
    },

    multilineContainer: {
      alignItems:
        "flex-start",
      minHeight: 120,
      paddingVertical: 14,
    },

    input: {
      flex: 1,
      color:
        theme.colors.text,
      fontSize: hp(1.7),
      paddingVertical: 0,
    },

    multilineInput: {
      minHeight: 90,
      textAlignVertical:
        "top",
      paddingTop: 0,
      paddingBottom: 0,
    },
  });
