import {
  AuthProvider,
  useAuth,
} from "@/contexts/AuthContext";

import {
  supabase,
} from "@/lib/supabase";

import {
  usePushNotifications,
} from "@/services/notificationService";

import {
  getUserData,
  updateUser,
} from "@/services/userService";

import {
  Session,
} from "@supabase/supabase-js";

import {
  Stack,
  useRouter,
} from "expo-router";

import React, {
  useEffect,
  useRef,
} from "react";

import {
  AppState,
  BackHandler,
} from "react-native";

import * as MediaLibrary from "expo-media-library";

const _layout = () => (
  <AuthProvider>
    <MainLayout />
  </AuthProvider>
);

const MainLayout = () => {
  const authContext =
    useAuth();

  const router =
    useRouter();

  const {
    expoPushToken,
  } =
    usePushNotifications();

  const mountedRef =
    useRef(true);

  const handledUserIdRef =
    useRef<string | null>(
      null
    );

  const handlingSessionRef =
    useRef(false);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const requestStartupPermissions =
      async () => {
        try {
          const media =
            await MediaLibrary.getPermissionsAsync(
              true
            );

          if (
            mounted &&
            media.status !==
              "granted"
          ) {
            await MediaLibrary.requestPermissionsAsync(
              true
            );
          }

        } catch (error) {
          console.warn(
            "Startup permissions:",
            error
          );
        }
      };

    void requestStartupPermissions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (state) => {
          if (
            state === "active"
          ) {
            supabase.auth.startAutoRefresh();
          } else {
            supabase.auth.stopAutoRefresh();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);

  /*
   * Android cihaz geri tuşu:
   *
   * Uygulamadaki herhangi bir alt sayfadaysak
   * bir önceki navigation ekranına dön.
   *
   * router.replace("/") gibi bir fallback
   * KULLANMIYORUZ. Böylece kullanıcı yanlışlıkla
   * ana sayfaya ışınlanmaz.
   */
  useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (
            router.canGoBack()
          ) {
            router.back();

            return true;
          }

          return false;
        }
      );

    return () => {
      subscription.remove();
    };
  }, [
    router,
  ]);

  useEffect(() => {
    const token =
      expoPushToken?.data;

    const user =
      authContext?.user?.userData;

    if (
      !token ||
      !user?.id
    ) {
      return;
    }

    if (
      user.expoPushToken ===
      token
    ) {
      return;
    }

    void updateUser({
      ...user,
      expoPushToken:
        token,
    });
  }, [
    expoPushToken?.data,
    authContext?.user
      ?.userData
      ?.id,
    authContext?.user
      ?.userData
      ?.expoPushToken,
  ]);

  const handleSession =
    async (
      session: Session
    ) => {
      if (
        !mountedRef.current
      ) {
        return;
      }

      const userId =
        session.user.id;

      if (
        handlingSessionRef.current
      ) {
        return;
      }

      if (
        handledUserIdRef.current ===
        userId &&
        authContext?.user
          ?.userData
      ) {
        return;
      }

      handlingSessionRef.current =
        true;

      try {
        console.log(
          "Auth - Active session:",
          userId
        );

        authContext?.setAuth(
          session.user
        );

        const result =
          await getUserData(
            userId
          );

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (
          !result.success ||
          !result.data
        ) {
          console.warn(
            "Auth - Could not load user profile:",
            result.message
          );

          handledUserIdRef.current =
            null;

          authContext?.setAuth(
            null
          );

          router.replace(
            "/welcome"
          );

          return;
        }

        authContext?.setUserData(
          result.data
        );

        handledUserIdRef.current =
          userId;

        console.log(
          "Auth - User data loaded successfully"
        );

        router.replace(
          "/home"
        );
      } catch (
        error
      ) {
        console.warn(
          "Auth - Session initialization error:",
          error
        );

        if (
          mountedRef.current
        ) {
          handledUserIdRef.current =
            null;

          authContext?.setAuth(
            null
          );

          router.replace(
            "/welcome"
          );
        }
      } finally {
        handlingSessionRef.current =
          false;
      }
    };

  useEffect(() => {
    let mounted = true;

    const initialize =
      async () => {
        console.log(
          "Auth - Checking existing session..."
        );

        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (
            !mounted ||
            !mountedRef.current
          ) {
            return;
          }

          if (error) {
            console.warn(
              "Auth - getSession error:",
              error.message
            );

            authContext?.setAuth(
              null
            );

            router.replace(
              "/welcome"
            );

            return;
          }

          console.log(
            "Auth - Initial session:",
            data.session
              ?.user?.id ??
              "NO SESSION"
          );

          if (
            data.session?.user
          ) {
            await handleSession(
              data.session
            );
          } else {
            authContext?.setAuth(
              null
            );

            handledUserIdRef.current =
              null;

            router.replace(
              "/welcome"
            );
          }
        } catch (
          error
        ) {
          console.warn(
            "Auth - initialize error:",
            error
          );

          if (
            mounted &&
            mountedRef.current
          ) {
            authContext?.setAuth(
              null
            );

            handledUserIdRef.current =
              null;

            router.replace(
              "/welcome"
            );
          }
        }
      };

    void initialize();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          if (
            !mounted ||
            !mountedRef.current
          ) {
            return;
          }

          console.log(
            "Auth - State change:",
            event,
            "| user:",
            session?.user?.id ??
              "undefined"
          );

          if (
            event ===
            "SIGNED_OUT"
          ) {
            handledUserIdRef.current =
              null;

            authContext?.setAuth(
              null
            );

            router.replace(
              "/welcome"
            );

            return;
          }

          if (
            session?.user
          ) {
            void handleSession(
              session
            );
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authContext) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown:
          false,
      }}
    >
      <Stack.Screen
        name="index"
      />
      <Stack.Screen
        name="login"
      />
      <Stack.Screen
        name="signUp"
      />
      <Stack.Screen
        name="welcome"
      />
      <Stack.Screen
        name="profileSetup"
      />
    </Stack>
  );
};

export default _layout;
