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

import ScreenWarpper from "@/components/ScreenWrapper";
import Button from "@/components/Button";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";

const Welcome = () => {
  const router =
    useRouter();

  return (
    <ScreenWarpper
      autoDismissKeyboard={false}
      bg={theme.colors.background}
    >
      <View
        style={styles.container}
      >
        <View
          style={styles.top}
        >
          <Text
            style={styles.brand}
          >
            NYSAPP
          </Text>

          <View
            style={styles.badge}
          >
            <Text
              style={styles.badgeText}
            >
              FUN • SOCIAL • DAILY
            </Text>
          </View>
        </View>

        <View
          style={styles.hero}
        >
          <View
            style={styles.heroCard}
          >
            <View
              style={styles.emojiRow}
            >
              <Text style={styles.emoji}>
                😎
              </Text>
              <Text style={styles.emoji}>
                🔥
              </Text>
              <Text style={styles.emoji}>
                😂
              </Text>
              <Text style={styles.emoji}>
                ✨
              </Text>
            </View>

            <Text
              style={styles.kicker}
            >
              CANIN NE İSTİYORSA
            </Text>

            <Text
              style={styles.title}
            >
              PAYLAŞ.
            </Text>

            <Text
              style={styles.titleAccent}
            >
              EĞLEN.
            </Text>

            <Text
              style={styles.subtitle}
            >
              Arkadaşlarınla takıl,
              {"\n"}
              güldüğün şeyleri paylaş,
              {"\n"}
              gündemi kaçırma.
            </Text>
          </View>
        </View>

        <View
          style={styles.footer}
        >
          <Button
            title="Kayıt ol"
            onPress={() =>
              router.push(
                "/signUp"
              )
            }
          />

          <Pressable
            style={styles.loginButton}
            onPress={() =>
              router.push(
                "/login"
              )
            }
          >
            <Text
              style={styles.loginText}
            >
              Zaten hesabın var mı?
            </Text>

            <Text
              style={styles.loginLink}
            >
              Giriş yap
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenWarpper>
  );
};

export default Welcome;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        theme.colors.background,
      paddingHorizontal:
        wp(5),
      paddingTop:
        hp(3),
      paddingBottom:
        hp(3),
    },

    top: {
      alignItems:
        "center",
    },

    brand: {
      color:
        theme.colors.primary,
      fontSize:
        hp(1.6),
      fontWeight:
        theme.fonts.extraBold,
      letterSpacing: 3,
    },

    badge: {
      marginTop:
        hp(1.2),
      paddingHorizontal:
        wp(3.2),
      minHeight: 28,
      borderRadius:
        14,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    badgeText: {
      color: "#94A3B8",
      fontSize:
        hp(1.05),
      fontWeight:
        theme.fonts.semibold,
      letterSpacing: 1,
    },

    hero: {
      flex: 1,
      justifyContent:
        "center",
    },

    heroCard: {
      width: "100%",
      paddingHorizontal:
        wp(6),
      paddingVertical:
        hp(5),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    emojiRow: {
      flexDirection:
        "row",
      gap: wp(3),
      marginBottom:
        hp(3),
    },

    emoji: {
      fontSize:
        hp(4),
    },

    kicker: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.3),
      fontWeight:
        theme.fonts.semibold,
      letterSpacing: 1.6,
      marginBottom:
        hp(1),
    },

    title: {
      color:
        theme.colors.text,
      fontSize:
        hp(5),
      lineHeight:
        hp(5.2),
      fontWeight:
        theme.fonts.extraBold,
    },

    titleAccent: {
      color:
        theme.colors.rose,
      fontSize:
        hp(5),
      lineHeight:
        hp(5.2),
      fontWeight:
        theme.fonts.extraBold,
    },

    subtitle: {
      marginTop:
        hp(2),
      color:
        "#94A3B8",
      fontSize:
        hp(1.7),
      lineHeight:
        hp(2.4),
    },

    footer: {
      gap:
        hp(1.2),
    },

    loginButton: {
      minHeight:
        50,
      borderRadius:
        theme.radius.lg,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    loginText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.5),
    },

    loginLink: {
      color:
        theme.colors.primary,
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts.semibold,
    },
  });
