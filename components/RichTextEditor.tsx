import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";

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

export interface RichTextEditorHandle {
  setContentHTML: (
    html: string
  ) => void;
  clearContent: () => void;
  focus: () => void;
}

interface RichTextEditorProps {
  onChange: (
    body: string
  ) => void;
  initialValue?: string;
}

const stripHtml = (
  value: string
) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  RichTextEditorProps
>(
  (
    {
      onChange,
      initialValue = "",
    },
    ref
  ) => {
    const [
      value,
      setValue,
    ] = useState(
      stripHtml(initialValue)
    );

    const [
      inputRef,
      setInputRef,
    ] =
      React.useState<TextInput | null>(
        null
      );

    useImperativeHandle(
      ref,
      () => ({
        setContentHTML: (
          html: string
        ) => {
          const text =
            stripHtml(html);

          setValue(text);
          onChange(
            text
              ? `<p>${text}</p>`
              : ""
          );
        },

        clearContent: () => {
          setValue("");
          onChange("");
        },

        focus: () => {
          inputRef?.focus();
        },
      }),
      [inputRef, onChange]
    );

    return (
      <View
        style={styles.container}
      >
        <TextInput
          ref={setInputRef}
          multiline
          textAlignVertical="top"
          value={value}
          placeholder="Ne düşünüyorsun? Bir şeyler paylaş..."
          placeholderTextColor="#94A3B8"
          onChangeText={(
            text
          ) => {
            setValue(text);

            const clean =
              text.trim();

            onChange(
              clean
                ? `<p>${clean}</p>`
                : ""
            );
          }}
          style={styles.input}
          maxLength={5000}
          autoCapitalize="sentences"
          autoCorrect
          selectionColor={
            theme.colors.primary
          }
        />
      </View>
    );
  }
);

RichTextEditor.displayName =
  "RichTextEditor";

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
