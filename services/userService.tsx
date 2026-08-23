import { SupaUser } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

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
      } = await supabase
        .from("users")
        .select("*")
        .eq(
          "id",
          userId
        )
        .single();

      if (error) {
        console.warn(
          `Error fetching user data for ${userId}`,
          error.message
        );

        return {
          success: false,
          message:
            "Error fetching user data",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "User data retrieved successfully",
        data:
          data as SupaUser,
      };
    } catch (error) {
      console.warn(
        `Error fetching user data for ${userId}`,
        error
      );

      return {
        success: false,
        message:
          "Error fetching user data",
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

      const {
        error,
      } = await supabase
        .from("users")
        .update({
          name:
            user.name,
          image:
            user.image,
          bio:
            user.bio,
          address:
            user.address,
          phoneNumber:
            user.phoneNumber,
          expoPushToken:
            user.expoPushToken,

          /*
           * Yeni profil gizlilik ayarı
           */
          isPrivate:
            user.isPrivate ??
            false,
        })
        .eq(
          "id",
          user.id
        );

      if (error) {
        console.warn(
          `Error updating user data for ${user.id}`,
          error.message
        );

        return {
          success: false,
          message:
            "Error updating user data",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "User data updating successfully",
        data: user,
      };
    } catch (error) {
      console.warn(
        `Error updating user data for ${user.id}`,
        error
      );

      return {
        success: false,
        message:
          "Error updating user data",
        data: null,
      };
    }
  };
