import React, {
  useRef,
  useState,
} from "react";

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import ScreenWarpper from "@/components/ScreenWrapper";
import BackButton from "@/components/BackButton";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Icon from "@/assets/icons";

import {
  hp,
  wp,
} from "@/helpers/common";

import {
  theme,
} from "@/constants/theme";

import {
  supabase,
} from "@/lib/supabase";

const normalizeUsername =
  (
    value: string
  ) =>
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9._]/g,
        ""
      );

const Login =
  () => {
    const router =
      useRouter();

    const identifierRef =
      useRef("");

    const passwordRef =
      useRef("");

    const [
      loading,
      setLoading,
    ] =
      useState(false);

    const [
      showPassword,
      setShowPassword,
    ] =
      useState(false);

    const [
      focusedField,
      setFocusedField,
    ] =
      useState<
        "identifier" |
        "password" |
        null
      >(null);

    const onSubmit =
      async () => {
        const identifier =
          identifierRef.current
            .trim()
            .toLowerCase();

        const password =
          passwordRef.current
            .trim();

        if (
          !identifier ||
          !password
        ) {
          Alert.alert(
            "Giriş",
            "Kullanıcı adı/e-posta ve şifre zorunludur."
          );
          return;
        }

        setLoading(true);

        try {
          let email =
            identifier;

          if (
            !identifier.includes(
              "@"
            )
          ) {
            const {
              data,
              error,
            } =
              await supabase.rpc(
                "find_email_by_username",
                {
                  p_username:
                    normalizeUsername(
                      identifier
                    ),
                }
              );

            if (error) {
              Alert.alert(
                "Giriş",
                error.message
              );
              return;
            }

            if (!data) {
              Alert.alert(
                "Giriş",
                "Kullanıcı bulunamadı."
              );
              return;
            }

            email =
              String(data)
                .trim()
                .toLowerCase();
          }

          const {
            error,
          } =
            await supabase.auth
              .signInWithPassword(
                {
                  email,
                  password,
                }
              );

          if (error) {
            Alert.alert(
              "Giriş",
              error.message
            );
            return;
          }

          router.replace(
            "/home"
          );
        } catch (
          error
        ) {
          console.warn(
            "Login error:",
            error
          );

          Alert.alert(
            "Giriş",
            "Giriş sırasında bir hata oluştu."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    return (
      <ScreenWarpper
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
          <BackButton
            onPress={() =>
              router.back()
            }
          />

          <View
            style={
              styles.content
            }
          >
            <View
              style={
                styles.heading
              }
            >
              <Text
                style={
                  styles.brand
                }
              >
                NYSAPP
              </Text>

              <Text
                style={
                  styles.title
                }
              >
                Tekrar hoş geldin
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Hesabına giriş yap ve
                kaldığın yerden devam
                et.
              </Text>
            </View>

            <View
              style={
                styles.form
              }
            >
              <View
                style={[
                  styles.inputShell,
                  focusedField ===
                    "identifier" &&
                    styles.inputShellFocused,
                ]}
              >
                <Icon
                  name="user"
                  size={23}
                  strokeWidth={1.7}
                  color={
                    focusedField ===
                    "identifier"
                      ? theme.colors
                          .primary
                      : "#64748B"
                  }
                />

                <Input
                  placeholder="Kullanıcı adı veya e-posta"
                  onFocus={() =>
                    setFocusedField(
                      "identifier"
                    )
                  }
                  onBlur={() =>
                    setFocusedField(
                      null
                    )
                  }
                  onChangeText={(
                    value
                  ) => {
                    identifierRef.current =
                      value;
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={
                    styles.inputInner
                  }
                />
              </View>

              <View
                style={[
                  styles.inputShell,
                  focusedField ===
                    "password" &&
                    styles.inputShellFocused,
                ]}
              >
                <Icon
                  name="lock"
                  size={23}
                  strokeWidth={1.7}
                  color={
                    focusedField ===
                    "password"
                      ? theme.colors
                          .primary
                      : "#64748B"
                  }
                />

                <Input
                  placeholder="Şifre"
                  onFocus={() =>
                    setFocusedField(
                      "password"
                    )
                  }
                  onBlur={() =>
                    setFocusedField(
                      null
                    )
                  }
                  onChangeText={(
                    value
                  ) => {
                    passwordRef.current =
                      value;
                  }}
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={
                    styles.inputInner
                  }
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(
                      previous =>
                        !previous
                    )
                  }
                  hitSlop={10}
                  style={
                    styles.passwordToggle
                  }
                >
                  <Text
                    style={[
                      styles.passwordToggleText,
                      showPassword &&
                        styles.passwordToggleActive,
                    ]}
                  >
                    {showPassword
                      ? "Gizle"
                      : "Göster"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={
                  styles.forgot
                }
              >
                <Text
                  style={
                    styles.forgotText
                  }
                >
                  Şifremi unuttum
                </Text>
              </Pressable>

              <Button
                title="Giriş yap"
                loading={
                  loading
                }
                onPress={
                  onSubmit
                }
              />

              <View
                style={
                  styles.footer
                }
              >
                <Text
                  style={
                    styles.footerText
                  }
                >
                  Hesabın yok mu?
                </Text>

                <Pressable
                  onPress={() =>
                    router.push(
                      "/signUp"
                    )
                  }
                >
                  <Text
                    style={
                      styles.footerLink
                    }
                  >
                    Kayıt ol
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScreenWarpper>
    );
  };

export default Login;

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

    content: {
      flex: 1,
    },

    heading: {
      marginTop:
        hp(5),
      marginBottom:
        hp(3),
    },

    brand: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts
          .extraBold,
      letterSpacing: 2,
      marginBottom:
        hp(1),
    },

    title: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(3.25),
      lineHeight:
        hp(3.9),
      fontWeight:
        theme.fonts
          .bold,
    },

    subtitle: {
      marginTop:
        hp(0.8),
      color:
        "#94A3B8",
      fontSize:
        hp(1.55),
      lineHeight:
        hp(2.1),
      maxWidth:
        wp(86),
    },

    form: {
      gap:
        hp(1.2),
    },

    inputShell: {
      minHeight:
        50,
      borderWidth: 1,
      borderColor:
        "#334155",
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors
          .card,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3.5),
      gap: wp(2.5),
    },

    inputShellFocused: {
      borderColor:
        theme.colors
          .primary,
    },

    inputInner: {
      flex: 1,
      minHeight: 48,
      borderWidth: 0,
      borderRadius: 0,
      paddingHorizontal: 0,
      backgroundColor:
        "transparent",
    },

    passwordToggle: {
      minWidth: 48,
      minHeight: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    passwordToggleText: {
      color:
        "#64748B",
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts
          .semibold,
    },

    passwordToggleActive: {
      color:
        theme.colors
          .primary,
    },

    forgot: {
      minHeight:
        44,
      alignItems:
        "flex-end",
      justifyContent:
        "center",
    },

    forgotText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.4),
    },

    footer: {
      minHeight:
        48,
      flexDirection:
        "row",
      justifyContent:
        "center",
      alignItems:
        "center",
      gap: 6,
    },

    footerText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.5),
    },

    footerLink: {
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
