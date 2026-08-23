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

const Input: React.FC<InputProps> = ({
  containerStyle,
  icon,
  inputRef,
  multiline = false,
  ...props
}) => {
  return (
    <View
      style={[
        styles.container,
        multiline && styles.multilineContainer,
        containerStyle,
      ]}
    >
      {icon ? (
        <View style={styles.iconWrapper}>
          {icon}
        </View>
      ) : null}

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
        placeholderTextColor={
          theme.colors.textLight
        }
        multiline={multiline}
        textAlignVertical={
          multiline
            ? "top"
            : "center"
        }
        {...props}
      />
    </View>
  );
};

export default Input;

const styles =
  StyleSheet.create({
    container: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      minHeight: hp(7.2),
      borderWidth: 0.4,
      borderColor: theme.colors.text,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 18,
      gap: 12,
      backgroundColor: "white",
    },

    multilineContainer: {
      alignItems: "flex-start",
      minHeight: hp(8),
      paddingVertical: 14,
    },

    iconWrapper: {
      paddingTop: 1,
    },

    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: hp(1.7),
      paddingVertical: 0,
      margin: 0,
    },

    multilineInput: {
      minHeight: hp(8),
      maxHeight: hp(15),
      paddingTop: 0,
      paddingBottom: 0,
      margin: 0,
    },
  });
