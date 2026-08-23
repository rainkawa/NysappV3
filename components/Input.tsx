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
        multiline &&
          styles.multilineContainer,
        containerStyle,
      ]}
    >
      {icon ? (
        <View
          style={
            styles.iconWrapper
          }
        >
          {icon}
        </View>
      ) : null}

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          multiline &&
            styles.multilineInput,
        ]}
        multiline={
          multiline
        }
        placeholderTextColor={
          theme.colors
            .textLight
        }
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
      flexDirection:
        "row",
      alignItems:
        "center",
      minHeight:
        hp(7.2),
      borderWidth:
        0.5,
      borderColor:
        theme.colors
          .gray,
      borderRadius:
        theme.radius.md,
      paddingHorizontal:
        14,
      gap: 10,
      backgroundColor:
        "white",
    },

    multilineContainer: {
      alignItems:
        "center",
      minHeight:
        hp(6.5),
      maxHeight:
        hp(12),
      paddingVertical: 8,
    },

    iconWrapper: {
      alignSelf:
        "center",
    },

    input: {
      flex: 1,
      color:
        theme.colors.text,
      fontSize:
        hp(1.7),
      paddingVertical: 0,
      margin: 0,
    },

    multilineInput: {
      minHeight:
        hp(5.5),
      maxHeight:
        hp(10),
      paddingTop: 0,
      paddingBottom: 0,
      textAlignVertical:
        "top",
    },
  });
