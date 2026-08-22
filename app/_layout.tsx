import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/services/notificationService";
import { getUserData, updateUser } from "@/services/userService";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { AppState } from "react-native";

const _layout = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

const MainLayout = () => {
  const authContext = useAuth();
  const router = useRouter();
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      expoPushToken?.data &&
      authContext?.user?.userData &&
      authContext.user.authInfo
    ) {
      updateUser({
        ...authContext.user.userData,
        expoPushToken: expoPushToken.data,
      });
    }
  }, [expoPushToken, authContext?.user?.userData, authContext?.user?.authInfo]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      console.log("Auth - Checking existing session...");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.warn("Auth - getSession error:", error.message);
        authContext?.setAuth(null);
        router.replace("/welcome");
        return;
      }

      console.log(
        "Auth - Initial session:",
        session?.user?.id ?? "NO SESSION"
      );

      if (session?.user) {
        await handleSession(session);
      } else {
        authContext?.setAuth(null);
        router.replace("/welcome");
      }
    };

    const handleSession = async (session: Session) => {
      if (!mounted) return;

      console.log("Auth - Active session:", session.user.id);

      authContext?.setAuth(session.user);

      const result = await getUserData(session.user.id);

      if (!mounted) return;

      if (result.success && result.data) {
        authContext?.setUserData(result.data);
        console.log("Auth - User data loaded successfully");
      } else {
        console.warn(
          "Auth - Could not load user profile:",
          result.message
        );
      }

      router.replace("/home");
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(
        "Auth - State change:",
        event,
        "| user:",
        session?.user?.id ?? "undefined"
      );

      if (session?.user) {
        await handleSession(session);
      } else if (event === "SIGNED_OUT") {
        authContext?.setAuth(null);
        router.replace("/welcome");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authContext) {
    console.error("AuthContext is not found");
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signUp" />
      <Stack.Screen name="welcome" />
    </Stack>
  );
};

export default _layout;
