import React from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import Icon from "@/assets/icons";
import Header from "@/components/Header";
import ScreenWarpper from "@/components/ScreenWrapper";
import BottomNav from "@/components/BottomNav";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";

const StoryShare =
  () => {
    const router =
      useRouter();

    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={
            styles.container
          }
        >
          <Header
            title="Hikaye paylaş"
          />

          <View
            style={
              styles.content
            }
          >
            <View
              style={
                styles.preview
              }
            >
              <Icon
                name="image"
                size={hp(5)}
                color={
                  theme.colors
                    .textLight
                }
              />

              <Text
                style={
                  styles.previewTitle
                }
              >
                Hikaye önizleme
              </Text>

              <Text
                style={
                  styles.previewText
                }
              >
                Bu sayfa şimdilik
                demo amaçlıdır.
                Gerçek fotoğraf/video
                seçimi sonraki aşamada
                eklenecek.
              </Text>
            </View>

            <Pressable
              style={
                styles.demoButton
              }
              onPress={() => {
                /*
                 * Demo:
                 * gerçek upload yok.
                 */
              }}
            >
              <Icon
                name="plus"
                size={hp(2.7)}
                color="white"
              />

              <Text
                style={
                  styles.demoButtonText
                }
              >
                Demo hikaye oluştur
              </Text>
            </Pressable>
          </View>
        </View>

        <BottomNav />
      </ScreenWarpper>
    );
  };

export default StoryShare;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal:
        wp(4),
    },

    content: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingBottom:
        hp(7),
    },

    preview: {
      width:
        wp(82),
      minHeight:
        hp(30),
      borderRadius:
        theme.radius
          .xl,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
      backgroundColor:
        theme.colors
          .lightGray,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(8),
    },

    previewTitle: {
      marginTop:
        hp(2),
      fontSize:
        hp(2.2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors
          .text,
    },

    previewText: {
      marginTop:
        hp(1),
      textAlign:
        "center",
      fontSize:
        hp(1.6),
      lineHeight:
        hp(2.3),
      color:
        theme.colors
          .textLight,
    },

    demoButton: {
      marginTop:
        hp(2.5),
      minHeight:
        hp(6),
      paddingHorizontal:
        wp(7),
      borderRadius:
        theme.radius
          .lg,
      backgroundColor:
        theme.colors
          .primary,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    demoButtonText: {
      color:
        "white",
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts
          .semibold,
    },
  });
