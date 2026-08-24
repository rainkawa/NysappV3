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

const SignUp =
  () => {
    const router =
      useRouter();

    const usernameRef =
      useRef("");

    const emailRef =
      useRef("");

    const passwordRef =
      useRef("");

    const [
      username,
      setUsername,
    ] =
      useState("");

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
        "username" |
        "email" |
        "password" |
        null
      >(null);

    const onSubmit =
      async () => {
        const usernameValue =
          normalizeUsername(
            usernameRef.current
          );

        const email =
          emailRef.current
            .trim()
            .toLowerCase();

        const password =
          passwordRef.current
            .trim();

        if (
          !usernameValue ||
          !email ||
          !password
        ) {
          Alert.alert(
            "Kayıt",
            "Kullanıcı adı, e-posta ve şifre zorunludur."
          );
          return;
        }

        if (
          usernameValue.length <
          3
        ) {
          Alert.alert(
            "Kayıt",
            "Kullanıcı adı en az 3 karakter olmalıdır."
          );
          return;
        }

        setLoading(true);

        try {
          const {
            data: existing,
            error:
              lookupError,
          } =
            await supabase
              .from("users")
              .select("id")
              .eq(
                "username",
                usernameValue
              )
              .maybeSingle();

          if (
            lookupError &&
            lookupError.code !==
              "PGRST116"
          ) {
            Alert.alert(
              "Kayıt",
              lookupError.message
            );
            return;
          }

          if (existing) {
            Alert.alert(
              "Kayıt",
              "Bu kullanıcı adı zaten kullanılıyor."
            );
            return;
          }

          const {
            data,
            error,
          } =
            await supabase.auth
              .signUp({
                email,
                password,
                options: {
                  data: {
                    name:
                      usernameValue,
                    username:
                      usernameValue,
                  },
                },
              });

          if (error) {
            Alert.alert(
              "Kayıt",
              error.message
            );
            return;
          }

          if (
            data.session
          ) {
            router.replace(
              "/home"
            );
            return;
          }

          Alert.alert(
            "Kayıt",
            "Kayıt başarılı. Gerekliyse e-posta adresinizi doğrulayın.",
            [
              {
                text:
                  "Giriş yap",
                onPress: () =>
                  router.replace(
                    "/login"
                  ),
              },
            ]
          );
        } catch (
          error
        ) {
          console.warn(
            "SignUp error:",
            error
          );

          Alert.alert(
            "Kayıt",
            "Kayıt sırasında bir hata oluştu."
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
                Hesabını oluştur
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Kullanıcı adını oluştur,
                e-postanı ekle ve
                Nysapp'e katıl.
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
                    "username" &&
                    styles.inputShellFocused,
                ]}
              >
                <Icon
                  name="user"
                  size={23}
                  strokeWidth={1.7}
                  color={
                    focusedField ===
                    "username"
                      ? theme.colors
                          .primary
                      : "#64748B"
                  }
                />

                <Input
                  placeholder="Kullanıcı adı"
                  value={
                    username
                  }
                  onFocus={() =>
                    setFocusedField(
                      "username"
                    )
                  }
                  onBlur={() =>
                    setFocusedField(
                      null
                    )
                  }
                  autoCapitalize="none"
                  autoCorrect={
                    false
                  }
                  onChangeText={(
                    text
                  ) => {
                    const clean =
                      normalizeUsername(
                        text
                      );

                    setUsername(
                      clean
                    );

                    usernameRef.current =
                      clean;
                  }}
                  containerStyle={
                    styles.inputInner
                  }
                />
              </View>

              <Text
                style={
                  styles.helper
                }
              >
                Küçük harf, boşluksuz:
                a-z, 0-9, . ve _
              </Text>

              <View
                style={[
                  styles.inputShell,
                  focusedField ===
                    "email" &&
                    styles.inputShellFocused,
                ]}
              >
                <Icon
                  name="mail"
                  size={23}
                  strokeWidth={1.7}
                  color={
                    focusedField ===
                    "email"
                      ? theme.colors
                          .primary
                      : "#64748B"
                  }
                />

                <Input
                  placeholder="E-posta"
                  onFocus={() =>
                    setFocusedField(
                      "email"
                    )
                  }
                  onBlur={() =>
                    setFocusedField(
                      null
                    )
                  }
                  onChangeText={(
                    text
                  ) => {
                    emailRef.current =
                      text;
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={
                    false
                  }
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
                    text
                  ) => {
                    passwordRef.current =
                      text;
                  }}
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={
                    false
                  }
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

              <Button
                title="Kayıt ol"
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
                  Zaten hesabın var mı?
                </Text>

                <Pressable
                  onPress={() =>
                    router.push(
                      "/login"
                    )
                  }
                >
                  <Text
                    style={
                      styles.footerLink
                    }
                  >
                    Giriş yap
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScreenWarpper>
    );
  };

export default SignUp;

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
        wp(88),
    },

    form: {
      gap:
        hp(1.1),
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

    helper: {
      marginTop:
        -hp(0.5),
      marginLeft:
        wp(1),
      color:
        "#94A3B8",
      fontSize:
        hp(1.25),
      lineHeight:
        hp(1.7),
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
