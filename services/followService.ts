import { supabase } from "@/lib/supabase";
import { APIResponse } from "./userService";

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  created_at: string;
}

export interface FollowUser {
  id: string;
  name: string;
  image: string | null;
  bio?: string | null;
  address?: string | null;
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    return {
      success: false,
      message: "Takip edilen sayısı alınamadı",
      data: 0,
    };
  }
};

export const getFollowers = async (
  userId: string
): Promise<APIResponse> => {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select(
        `
          id,
          followerId,
          followingId,
          created_at,
          user:followerId(
            id,
            name,
            image,
            bio,
            address
          )
        `
      )
      .eq("followingId", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    const users: FollowUser[] = (data || [])
      .map((item: any) => item.user)
      .filter(Boolean);

    return {
      success: true,
      message: "Takipçiler alındı",
      data: users,
    };
  } catch (error) {
    console.warn(
      "Follow Service - getFollowers error:",
      error
    );

    return {
      success: false,
      message: "Takipçiler alınamadı",
      data: null,
    };
  }
};

export const getFollowing = async (
  userId: string
): Promise<APIResponse> => {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select(
        `
          id,
          followerId,
          followingId,
          created_at,
          user:followingId(
            id,
            name,
            image,
            bio,
            address
          )
        `
      )
      .eq("followerId", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    const users: FollowUser[] = (data || [])
      .map((item: any) => item.user)
      .filter(Boolean);

    return {
      success: true,
      message: "Takip edilenler alındı",
      data: users,
    };
  } catch (error) {
    console.warn(
      "Follow Service - getFollowing error:",
      error
    );

    return {
      success: false,
      message: "Takip edilenler alınamadı",
      data: null,
    };
  }
};
