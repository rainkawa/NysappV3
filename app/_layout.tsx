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
} from "react-native";

const _layout = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

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

  const sessionUserIdRef =
    useRef<string | null>(
      null
    );

  const initializingRef =
    useRef(false);

  /*
   * -------------------------------------------------------
   * Mounted
   * -------------------------------------------------------
   */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  /*
   * -------------------------------------------------------
   * Supabase auto refresh
   * -------------------------------------------------------
   */

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (state) => {
          if (
            state ===
            "active"
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
   * -------------------------------------------------------
   * Push token
   *
   * ÖNEMLİ:
   * Auth initialization ile birbirine girmemesi için
   * yalnızca mevcut userData gerçekten varsa update et.
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (
      !expoPushToken?.data ||
      !authContext?.user?.userData ||
      !authContext?.user?.authInfo
    ) {
      return;
    }

    const currentToken =
      authContext.user
        .userData
        .expoPushToken;

    if (
      currentToken ===
      expoPushToken.data
    ) {
      return;
    }

    void updateUser({
      ...authContext.user
        .userData,
      expoPushToken:
        expoPushToken.data,
    });
  }, [
    expoPushToken?.data,
    authContext?.user
      ?.userData
      ?.expoPushToken,
    authContext?.user
      ?.authInfo
      ?.id,
  ]);

  /*
   * -------------------------------------------------------
   * Session handling
   * -------------------------------------------------------
   */

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

      /*
       * Aynı kullanıcı session'ını
       * ikinci kez işlemiyoruz.
       */
      if (
        sessionUserIdRef.current ===
        userId &&
        authContext?.user
          ?.userData
      ) {
        router.replace(
          "/home"
        );
        return;
      }

      if (
        initializingRef.current
      ) {
        return;
      }

      initializingRef.current =
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
          result.success &&
          result.data
        ) {
          authContext?.setUserData(
            result.data
          );

          sessionUserIdRef.current =
            userId;

          console.log(
            "Auth - User data loaded successfully"
          );

          router.replace(
            "/home"
          );

          return;
        }

        /*
         * Kullanıcı Auth'ta var ama
         * users tablosunda yoksa burada
         * sessizce home'a geçme.
         */
        console.warn(
          "Auth - Could not load user profile:",
          result.message
        );

        authContext?.setAuth(
          null
        );

        sessionUserIdRef.current =
          null;

        router.replace(
          "/welcome"
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
          authContext?.setAuth(
            null
          );

          sessionUserIdRef.current =
            null;

          router.replace(
            "/welcome"
          );
        }
      } finally {
        initializingRef.current =
          false;
      }
    };

  /*
   * -------------------------------------------------------
   * Initial session + auth listener
   * -------------------------------------------------------
   */

  useEffect(() => {
    let localMounted =
      true;

    const initializeSession =
      async () => {
        console.log(
          "Auth - Checking existing session..."
        );

        try {
          const {
            data: {
              session,
            },
            error,
          } =
            await supabase.auth.getSession();

          if (
            !localMounted ||
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
            session?.user?.id ??
              "NO SESSION"
          );

          if (
            session?.user
          ) {
            await handleSession(
              session
            );
          } else {
            authContext?.setAuth(
              null
            );

            sessionUserIdRef.current =
              null;

            router.replace(
              "/welcome"
            );
          }
        } catch (
          error
        ) {
          console.warn(
            "Auth - initializeSession error:",
            error
          );

          if (
            localMounted &&
            mountedRef.current
          ) {
            authContext?.setAuth(
              null
            );

            sessionUserIdRef.current =
              null;

            router.replace(
              "/welcome"
            );
          }
        }
      };

    void initializeSession();

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
            !localMounted ||
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
            sessionUserIdRef.current =
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
      localMounted =
        false;

      subscription.unsubscribe();
    };
  }, []);

  if (
    !authContext
  ) {
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
    </Stack>
  );
};

export default _layout;
