import {
  SupaUser,
} from "@/contexts/AuthContext";

import {
  supabase,
} from "@/lib/supabase";

export interface APIResponse<
  T = any
> {
  success: boolean;
  message: string;
  data: T | null;
}

const normalizeUsername =
  (value: string) =>
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9._]/g,
        ""
      );

export const getUserData =
  async (
    userId: string
  ): Promise<APIResponse> => {
    try {
      if (!userId) {
        return {
          success: false,
          message:
            "Geçersiz kullanıcı ID",
          data: null,
        };
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("users")
          .select("*")
          .eq(
            "id",
            userId
          )
          .single();

      if (error) {
        console.warn(
          "getUserData:",
          error.message
        );

        return {
          success: false,
          message:
            "Kullanıcı bilgileri alınamadı.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Kullanıcı bilgileri alındı.",
        data:
          data as SupaUser,
      };
    } catch (
      error
    ) {
      console.warn(
        "getUserData error:",
        error
      );

      return {
        success: false,
        message:
          "Kullanıcı bilgileri alınamadı.",
        data: null,
      };
    }
  };

export const updateUser =
  async (
    user: SupaUser
  ): Promise<APIResponse> => {
    try {
      if (!user.id) {
        return {
          success: false,
          message:
            "Geçersiz kullanıcı ID",
          data: null,
        };
      }

      const username =
        normalizeUsername(
          user.name || ""
        );

      if (
        !username ||
        username.length < 3
      ) {
        return {
          success: false,
          message:
            "Kullanıcı adı en az 3 karakter olmalıdır.",
          data: null,
        };
      }

      const {
        data:
          duplicate,
        error:
          duplicateError,
      } =
        await supabase
          .from("users")
          .select("id")
          .eq(
            "username",
            username
          )
          .neq(
            "id",
            user.id
          )
          .maybeSingle();

      if (
        duplicateError &&
        duplicateError.code !==
          "PGRST116"
      ) {
        return {
          success: false,
          message:
            duplicateError.message,
          data: null,
        };
      }

      if (duplicate) {
        return {
          success: false,
          message:
            "Bu kullanıcı adı zaten kullanılıyor.",
          data: null,
        };
      }

      const {
        error,
      } =
        await supabase
          .from("users")
          .update({
            username,
            name:
              username,
            image:
              user.image ||
              null,
            bio:
              user.bio ||
              "",
            address:
              null,
            phoneNumber:
              "",
            expoPushToken:
              user.expoPushToken ||
              null,
            isPrivate:
              !!user.isPrivate,
          })
          .eq(
            "id",
            user.id
          );

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          return {
            success: false,
            message:
              "Bu kullanıcı adı zaten kullanılıyor.",
            data: null,
          };
        }

        return {
          success: false,
          message:
            error.message ||
            "Profil güncellenemedi.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Profil güncellendi.",
        data: {
          ...user,
          name:
            username,
          email:
            user.email ||
            "",
          username,
          address:
            null,
          phoneNumber:
            "",
          isPrivate:
            !!user.isPrivate,
        },
      };
    } catch (
      error
    ) {
      console.warn(
        "updateUser error:",
        error
      );

      return {
        success: false,
        message:
          "Profil güncellenemedi.",
        data: null,
      };
    }
  };
