import { SupaUser } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

export const getUserData = async (
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
    } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.warn(
        `Error fetching user data for ${userId}`,
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
      data: data as SupaUser,
    };
  } catch (error) {
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

export const updateUser = async (
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

    const normalizedName =
      (user.name || "")
        .trim()
        .toLowerCase();

    if (!normalizedName) {
      return {
        success: false,
        message:
          "Kullanıcı adı zorunludur.",
        data: null,
      };
    }

    const {
      error,
    } = await supabase
      .from("users")
      .update({
        name: normalizedName,
        image:
          user.image || null,
        bio:
          user.bio || "",
        address: null,
        phoneNumber: "",
        expoPushToken:
          user.expoPushToken ||
          null,
        isPrivate:
          !!user.isPrivate,
      })
      .eq("id", user.id);

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

      console.warn(
        `Error updating user data for ${user.id}`,
        error.message
      );

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
        name: normalizedName,
        address: null,
        phoneNumber: "",
        isPrivate:
          !!user.isPrivate,
      },
    };
  } catch (error) {
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
