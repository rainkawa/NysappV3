import { supabase } from "@/lib/supabase";
import { APIResponse } from "./userService";

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  created_at: string;
}

export const isFollowing = async (
  followerId: string,
  followingId: string
): Promise<APIResponse> => {
  try {
    if (!followerId || !followingId) {
      return {
        success: false,
        message: "Geçersiz kullanıcı bilgisi",
        data: false,
      };
    }

    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("followerId", followerId)
      .eq("followingId", followingId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: error.message,
        data: false,
      };
    }

    return {
      success: true,
      message: "Takip durumu alındı",
      data: !!data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Takip durumu alınamadı",
      data: false,
    };
  }
};

export const followUser = async (
  followerId: string,
  followingId: string
): Promise<APIResponse> => {
  try {
    if (!followerId || !followingId) {
      return {
        success: false,
        message: "Geçersiz kullanıcı bilgisi",
        data: null,
      };
    }

    if (followerId === followingId) {
      return {
        success: false,
        message: "Kendinizi takip edemezsiniz",
        data: null,
      };
    }

    const { data, error } = await supabase
      .from("follows")
      .insert({
        followerId,
        followingId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: true,
          message: "Kullanıcı zaten takip ediliyor",
          data,
        };
      }

      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message: "Kullanıcı takip edildi",
      data: data as Follow,
    };
  } catch (error) {
    return {
      success: false,
      message: "Takip işlemi başarısız",
      data: null,
    };
  }
};

export const unfollowUser = async (
  followerId: string,
  followingId: string
): Promise<APIResponse> => {
  try {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("followerId", followerId)
      .eq("followingId", followingId);

    if (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message: "Takip bırakıldı",
      data: null,
    };
  } catch (error) {
    return {
      success: false,
      message: "Takip bırakma işlemi başarısız",
      data: null,
    };
  }
};

export const getFollowersCount = async (
  userId: string
): Promise<APIResponse> => {
  try {
    const { count, error } = await supabase
      .from("follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("followingId", userId);

    if (error) {
      return {
        success: false,
        message: error.message,
        data: 0,
      };
    }

    return {
      success: true,
      message: "Takipçi sayısı alındı",
      data: count || 0,
    };
  } catch (error) {
    return {
      success: false,
      message: "Takipçi sayısı alınamadı",
      data: 0,
    };
  }
};

export const getFollowingCount = async (
  userId: string
): Promise<APIResponse> => {
  try {
    const { count, error } = await supabase
      .from("follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("followerId", userId);

    if (error) {
      return {
        success: false,
        message: error.message,
        data: 0,
      };
    }

    return {
      success: true,
      message: "Takip edilen sayısı alındı",
      data: count || 0,
    };
  } catch (error) {
    return {
      success: false,
      message: "Takip edilen sayısı alınamadı",
      data: 0,
    };
  }
};
