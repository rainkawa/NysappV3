import React, {
  useEffect,
  useState,
} from "react";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  supabase,
} from "@/lib/supabase";

import ScreenWarpper from "@/components/ScreenWrapper";
import BottomNav from "@/components/BottomNav";

const Yonetim = () => {
  const router = useRouter();
  const authContext = useAuth();

  const [authorized, setAuthorized] =
    useState(false);
  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      try {
        const userId =
          authContext?.user?.authInfo?.id;

        if (!userId) {
          if (mounted) {
            router.replace("/home");
          }
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .maybeSingle();

        if (
          error ||
          data?.username !== "admin"
        ) {
          if (mounted) {
            router.replace("/home");
          }
          return;
        }

        if (mounted) {
          setAuthorized(true);
        }
      } catch {
        if (mounted) {
          router.replace("/home");
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    void checkAdmin();

    return () => {
      mounted = false;
    };
  }, [
    authContext?.user?.authInfo?.id,
    router,
  ]);

  if (
    checking ||
    !authorized
  ) {
    return null;
  }

  return (
    <ScreenWarpper>
      <View
        style={styles.container}
      >
        <Text
          style={styles.title}
        >
          Yonetim Paneli
        </Text>
      </View>

      <BottomNav />
    </ScreenWarpper>
  );
};

export default Yonetim;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    title: {
      fontSize: 24,
      fontWeight: "700",
      color: "#000000",
    },
  });
