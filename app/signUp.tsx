import React, { useRef, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import Icon from "@/assets/icons";
import { StyleSheet } from "react-native";
import BackButton from "@/components/BackButton";
import { useRouter } from "expo-router";
import { hp, wp } from "@/helpers/common";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";

const signUp = () => {
  const router = useRouter();
  const mailRef = useRef("");
  const passwordRef = useRef("");
  const nameRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async () => {
    if (!mailRef.current || !passwordRef.current || !nameRef.current) {
      Alert.alert("Sign Up", "Please fill all the fields");
      return;
    }

    const name = nameRef.current.trim();
    const email = mailRef.current.trim();
    const password = passwordRef.current.trim();

    setLoading(true);

    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    console.log("Sign up completed", {
      hasSession: !!session,
      hasError: !!error,
    });

    if (error) {
      Alert.alert("Sign Up", error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/home");
  };

  return (
    <ScreenWarpper bg="white">
      <View style={styles.container}>
        <BackButton
          onPress={() => {
            router.back();
          }}
        />

        <View>
          <Text style={styles.welcomeText}>Hãy</Text>
          <Text style={styles.welcomeText}>Bắt Đầu Nào!</Text>
        </View>

        <View style={styles.form}>
          <Text style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Vui lòng điền đầy đủ các thông tin
          </Text>

          <Input
            icon={<Icon name="user" size={26} strokeWidth={1.6} />}
            placeholder="Họ tên"
            onChangeText={(text) => (nameRef.current = text)}
          />

          <Input
            icon={<Icon name="mail" size={26} strokeWidth={1.6} />}
            placeholder="Email"
            onChangeText={(text) => (mailRef.current = text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordRow}>
            <Input
              containerStyle={styles.passwordInput}
              icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
              placeholder="Mật khẩu"
              onChangeText={(text) => (passwordRef.current = text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={styles.passwordToggle}
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={10}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? "Gizle" : "Göster"}
              </Text>
            </Pressable>
          </View>

          <Button title="Đăng ký" loading={loading} onPress={onSubmit} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản!</Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text
                style={[
                  styles.footerText,
                  {
                    color: theme.colors.primaryDark,
                    fontWeight: theme.fonts.semibold,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 45,
    paddingHorizontal: wp(5),
  },
  welcomeText: {
    fontSize: hp(4),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  form: {
    gap: 25,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 80,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  passwordToggleText: {
    color: theme.colors.primaryDark,
    fontWeight: theme.fonts.semibold,
    fontSize: hp(1.5),
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  footerText: {
    textAlign: "center",
    color: theme.colors.text,
    fontSize: hp(1.6),
  },
});
