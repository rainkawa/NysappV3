import React from "react";

import {
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  hp,
  wp,
} from "@/helpers/common";

import {
  theme,
} from "@/constants/theme";

interface RichTextEditorProps {
  editorRef: React.RefObject<any>;
  onChange: (
    body: string
  ) => void;
  initialValue?: string;
}

const RichTextEditor:
  React.FC<
    RichTextEditorProps
  > = ({
    editorRef,
    onChange,
    initialValue = "",
  }) => {
    return (
      <View
        style={
          styles.container
        }
      >
        <TextInput
          ref={
            editorRef
          }
          multiline
          textAlignVertical="top"
          defaultValue={
            initialValue
          }
          placeholder="Ne düşünüyorsun? Bir şeyler paylaş..."
          placeholderTextColor="#94A3B8"
          onChangeText={(
            text
          ) => {
            const value =
              text.trim();

            onChange(
              value
                ? `<p>${value}</p>`
                : ""
            );
          }}
          style={
            styles.input
          }
          maxLength={5000}
          autoCapitalize="sentences"
          autoCorrect
          selectionColor={
            theme.colors
              .primary
          }
        />
      </View>
    );
  };

export default RichTextEditor;

const styles =
  StyleSheet.create({
    container: {
      minHeight:
        hp(18),
      width: "100%",
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    input: {
      minHeight:
        hp(18),
      width: "100%",
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(2),
      color:
        theme.colors.text,
      fontSize:
        hp(1.75),
      lineHeight:
        hp(2.5),
    },
  });
