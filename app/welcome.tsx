import React from "react";

import {
  Image,
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

const Welcome =
  () => {
    const router =
      useRouter();

    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
        bg={
          theme.colors
            .background
        }
      >
        <View
          style={
            styles.container
          }
        >
          <View
            style={
              styles.brandBlock
            }
          >
            <Text
              style={
                styles.brand
              }
            >
              NYSAPP
            </Text>

            <View
              style={
                styles.brandLine
              }
            />
          </View>

          <View
            style={
              styles.hero
            }
          >
            <View
              style={
                styles.imageFrame
              }
            >
              <Image
                source={require(
                  "../assets/images/welcome.png"
                )}
                resizeMode="contain"
                style={
                  styles.welcomeImage
                }
              />
            </View>

            <Text
              style={
                styles.title
              }
            >
              Fikirlerini paylaş.
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Hikâyelerini, fotoğraflarını
              {"\n"}
              ve anlarını Nysapp'te
              paylaş.
            </Text>
          </View>

          <View
            style={
              styles.footer
            }
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
              style={
                styles.loginButton
              }
              onPress={() =>
                router.push(
                  "/login"
                )
              }
            >
              <Text
                style={
                  styles.loginText
                }
              >
                Zaten hesabın var mı?
              </Text>

              <Text
                style={
                  styles.loginLink
                }
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
        theme.colors
          .background,
      paddingHorizontal:
        wp(5),
      paddingTop:
        hp(3),
      paddingBottom:
        hp(3),
    },

    brandBlock: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: wp(2),
    },

    brand: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts
          .extraBold,
      letterSpacing:
        2.5,
    },

    brandLine: {
      width:
        wp(12),
      height: 2,
      borderRadius: 1,
      backgroundColor:
        theme.colors
          .primary,
      opacity: 0.7,
    },

    hero: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical:
        hp(2),
    },

    imageFrame: {
      width:
        wp(86),
      height:
        hp(30),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors
          .card,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
      overflow:
        "hidden",
      marginBottom:
        hp(3),
    },

    welcomeImage: {
      width: "100%",
      height: "100%",
    },

    title: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(3.4),
      lineHeight:
        hp(4.1),
      fontWeight:
        theme.fonts.bold,
      textAlign:
        "center",
    },

    subtitle: {
      marginTop:
        hp(1.2),
      color:
        theme.colors
          .textLight,
      fontSize:
        hp(1.6),
      lineHeight:
        hp(2.2),
      textAlign:
        "center",
    },

    footer: {
      gap:
        hp(1.2),
    },

    loginButton: {
      minHeight:
        hp(6),
      borderRadius:
        theme.radius.lg,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
      backgroundColor:
        theme.colors
          .card,
    },

    loginText: {
      color:
        theme.colors
          .textLight,
      fontSize:
        hp(1.5),
    },

    loginLink: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts
          .semibold,
    },
  });
