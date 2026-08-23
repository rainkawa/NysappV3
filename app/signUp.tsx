import React, {
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  Pressable,
  Alert,
} from "react-native";

import ScreenWarpper from "@/components/ScreenWrapper";
import {
  theme,
} from "@/constants/theme";

import Icon from "@/assets/icons";
import {
  StyleSheet,
} from "react-native";

import BackButton from "@/components/BackButton";
import {
  useRouter,
} from "expo-router";

import {
  hp,
  wp,
} from "@/helpers/common";

import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  supabase,
} from "@/lib/supabase";

const normalizeUsername =
  (value: string) =>
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9._]/g,
        ""
      );

const signUp = () => {
  const router =
    useRouter();

  const usernameRef =
    useRef("");

  const emailRef =
    useRef("");

  const passwordRef =
    useRef("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    username,
    setUsername,
  ] = useState("");

  const onSubmit =
    async () => {
      const cleanUsername =
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
        !cleanUsername ||
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
        cleanUsername.length <
        3
      ) {
        Alert.alert(
          "Kayıt",
          "Kullanıcı adı en az 3 karakter olmalıdır."
        );
        return;
      }

      if (
        !/^[a-z0-9._]+$/.test(
          cleanUsername
        )
      ) {
        Alert.alert(
          "Kayıt",
          "Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir."
        );
        return;
      }

      setLoading(true);

      try {
        const {
          data:
            usernameExists,
          error:
            usernameError,
        } =
          await supabase
            .from("users")
            .select("id")
            .eq(
              "username",
              cleanUsername
            )
            .maybeSingle();

        if (
          usernameError &&
          usernameError.code !==
            "PGRST116"
        ) {
          Alert.alert(
            "Kayıt",
            usernameError.message
          );
          return;
        }

        if (
          usernameExists
        ) {
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
          await supabase.auth.signUp(
            {
              email,
              password,
              options: {
                data: {
                  name:
                    cleanUsername,
                  username:
                    cleanUsername,
                },
              },
            }
          );

        if (error) {
          Alert.alert(
            "Kayıt",
            error.message
          );
          return;
        }

        /*
         * Session varsa AuthContext
         * users kaydını oluşturacaktır.
         */
        if (
          data.session
        ) {
          router.replace(
            "/home"
          );
        } else {
          Alert.alert(
            "Kayıt",
            "Kayıt başarılı. E-posta doğrulaması gerekiyorsa e-postanızı doğruladıktan sonra giriş yapabilirsiniz.",
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
        }
      } catch (
        error
      ) {
        console.warn(
          "Sign up error:",
          error
        );

        Alert.alert(
          "Kayıt",
          "Kayıt sırasında bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <ScreenWarpper bg="white">
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

        <View>
          <Text
            style={
              styles.welcomeText
            }
          >
            Hãy
          </Text>

          <Text
            style={
              styles.welcomeText
            }
          >
            Bắt Đầu Nào!
          </Text>
        </View>

        <View
          style={
            styles.form
          }
        >
          <Text
            style={
              styles.description
            }
          >
            Vui lòng điền đầy đủ các
            thông tin
          </Text>

          <Input
            icon={
              <Icon
                name="user"
                size={26}
                strokeWidth={1.6}
              />
            }
            placeholder="kullanici_adi"
            value={username}
            autoCapitalize="none"
            autoCorrect={false}
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
          />

          <Text
            style={
              styles.helperText
            }
          >
            Küçük harf, boşluksuz:
            a-z, 0-9, . ve _
          </Text>

          <Input
            icon={
              <Icon
                name="mail"
                size={26}
                strokeWidth={1.6}
              />
            }
            placeholder="Email"
            onChangeText={(
              text
            ) => {
              emailRef.current =
                text;
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View
            style={
              styles.passwordRow
            }
          >
            <Input
              containerStyle={
                styles.passwordInput
              }
              icon={
                <Icon
                  name="lock"
                  size={26}
                  strokeWidth={1.6}
                />
              }
              placeholder="Mật khẩu"
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
              autoCorrect={false}
            />

            <Pressable
              style={
                styles.passwordToggle
              }
              onPress={() =>
                setShowPassword(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              hitSlop={10}
            >
              <Text
                style={
                  styles.passwordToggleText
                }
              >
                {showPassword
                  ? "Gizle"
                  : "Göster"}
              </Text>
            </Pressable>
          </View>

          <Button
            title="Đăng ký"
            loading={loading}
            onPress={onSubmit}
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
              Đã có tài khoản!
            </Text>

            <Pressable
              onPress={() =>
                router.push(
                  "/login"
                )
              }
            >
              <Text
                style={[
                  styles.footerText,
                  {
                    color:
                      theme.colors
                        .primaryDark,
                    fontWeight:
                      theme.fonts
                        .semibold,
                  },
                ]}
              >
                Đăng nhập
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenWarpper>
  );
};

export default signUp;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      gap: 38,
      paddingHorizontal:
        wp(5),
    },

    welcomeText: {
      fontSize: hp(4),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    description: {
      fontSize:
        hp(1.5),
      color:
        theme.colors.text,
    },

    form: {
      gap: 18,
    },

    helperText: {
      marginTop: -10,
      fontSize:
        hp(1.25),
      color:
        theme.colors
          .textLight,
    },

    passwordRow: {
      position:
        "relative",
      justifyContent:
        "center",
    },

    passwordInput: {
      paddingRight: 80,
    },

    passwordToggle: {
      position:
        "absolute",
      right: 16,
      top: 0,
      bottom: 0,
      justifyContent:
        "center",
    },

    passwordToggleText: {
      color:
        theme.colors
          .primaryDark,
      fontWeight:
        theme.fonts
          .semibold,
      fontSize:
        hp(1.5),
    },

    footer: {
      flexDirection:
        "row",
      justifyContent:
        "center",
      alignItems:
        "center",
      gap: 5,
    },

    footerText: {
      textAlign:
        "center",
      color:
        theme.colors.text,
      fontSize:
        hp(1.6),
    },
  });
