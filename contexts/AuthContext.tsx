import {
  User as SessionUser,
} from "@supabase/supabase-js";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

export interface SupaUser {
  id?: string;

  /* Profilde biyografinin üstünde görünen isim */
  displayName?: string;

  /* @kullaniciadi / profil kullanıcı adı */
  name?: string;

  email?: string;
  image?: string | null;
  bio?: string | null;
  address?: string | null;
  phoneNumber?: string;
  createdAt?: string;
  expoPushToken?: string | null;

  /*
   * true  = gizli hesap
   * false = herkese açık
   */
  isPrivate?: boolean;

  /*
   * true = profil kurulumunu tamamladı
   * false = yeni kullanıcı
   */
  profile_completed?: boolean;
}

export interface User {
  authInfo?: SessionUser;
  userData?: SupaUser;
}

interface AuthContextType {
  user: User | null;

  setAuth: (
    authUser:
      | SessionUser
      | null
  ) => void;

  setUserData: (
    data: SupaUser
  ) => void;

  clearAuth: () => void;
}

const AuthContext =
  createContext<
    AuthContextType | null
  >(null);

export const AuthProvider = ({
  children,
}: {
  children:
    React.ReactNode;
}) => {
  const [user, setUser] =
    useState<User | null>(
      null
    );

  const setAuth = (
    authUser:
      | SessionUser
      | null
  ) => {
    if (!authUser) {
      console.log(
        "Auth Context - Removing user"
      );

      setUser(null);
      return;
    }

    console.log(
      "Auth Context - Updating user session data:",
      authUser.id
    );

    setUser((prev) => ({
      authInfo: authUser,
      userData:
        prev?.userData,
    }));
  };

  const setUserData = (
    newUserData: SupaUser
  ) => {
    console.log(
      "Auth Context - Updating user supabase data"
    );

    setUser((prev) => {
      if (!prev) {
        console.warn(
          "Auth Context - Cannot set user data before auth user exists"
        );

        return prev;
      }

      return {
        ...prev,

        userData: {
          ...(prev.userData ??
            {}),
          ...newUserData,
        },
      };
    });
  };

  const clearAuth = () => {
    console.log(
      "Auth Context - Clearing auth state"
    );

    setUser(null);
  };

  const value =
    useMemo(
      () => ({
        user,
        setAuth,
        setUserData,
        clearAuth,
      }),
      [user]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth =
  () =>
    useContext(
      AuthContext
    );
