import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
} from "react-native";
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

const login = () => {
  const router = useRouter();
  const mailRef = useRef("");
  const passwordRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async () => {
    if (!mailRef.current || !passwordRef.current) {
      Alert.alert("Login", "Please fill all the fields");
      return;
    }

    const email = mailRef.current.trim();
    const password = passwordRef.current.trim();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Login", error.message);
      setLoading(false);
      return;
    }

    console.log(`User ${email} logged in successfully`);
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
          <Text style={styles.welcomeText}>Chào Bạn,</Text>
          <Text style={styles.welcomeText}>Đã Trở Lại 🤗</Text>
        </View>

        <View style={styles.form}>
          <Text style={{ fontSize: hp(1.5), color: theme.colors.text }}>
            Đăng nhập để tiếp tục
          </Text>

          <Input
            icon={<Icon name="mail" size={26} strokeWidth={1.6} />}
            placeholder="Email"
            onChangeText={(text) => (mailRef.current = text)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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

          <Text style={styles.forgotPassword}>Quên Mật Khẩu?</Text>

          <Button title="Đăng nhập" loading={loading} onPress={onSubmit} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <Pressable onPress={() => router.push("/signUp")}>
              <Text
                style={[
                  styles.footerText,
                  {
                    color: theme.colors.primaryDark,
                    fontWeight: theme.fonts.semibold,
                  },
                ]}
              >
                Đăng ký
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenWarpper>
  );
};

export default login;

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
  forgotPassword: {
    textAlign: "right",
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
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
