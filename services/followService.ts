import { supabase } from "@/lib/supabase";
import { APIResponse } from "./userService";

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  created_at: string;
}

export interface FollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status:
    | "pending"
    | "accepted"
    | "rejected";
  created_at: string;
  responded_at?: string | null;
}

export interface FollowUser {
  id: string;
  name: string;
  image: string | null;
  bio?: string | null;
  address?: string | null;
  isPrivate?: boolean;
}

export type FollowRelationState =
  | "following"
  | "pending"
  | "none";

const failure = (
  message: string,
  data: any = null
): APIResponse => ({
  success: false,
  message,
  data,
});

const success = (
  message: string,
  data: any = null
): APIResponse => ({
  success: true,
  message,
  data,
});

/* =========================================================
   EXISTING FOLLOW STATE
   ========================================================= */

export const isFollowing = async (
  followerId: string,
  followingId: string
): Promise<APIResponse> => {
  try {
    if (
      !followerId ||
      !followingId
    ) {
      return failure(
        "Geçersiz kullanıcı bilgisi",
        false
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("follows")
      .select("id")
      .eq(
        "followerId",
        followerId
      )
      .eq(
        "followingId",
        followingId
      )
      .maybeSingle();

    if (error) {
      return failure(
        error.message,
        false
      );
    }

    return success(
      "Takip durumu alındı",
      !!data
    );
  } catch {
    return failure(
      "Takip durumu alınamadı",
      false
    );
  }
};

/* =========================================================
   PENDING FOLLOW REQUEST
   ========================================================= */

export const hasPendingFollowRequest =
  async (
    requesterId: string,
    targetId: string
  ): Promise<APIResponse> => {
    try {
      if (
        !requesterId ||
        !targetId
      ) {
        return failure(
          "Geçersiz kullanıcı bilgisi",
          false
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("follow_requests")
        .select("id")
        .eq(
          "requesterId",
          requesterId
        )
        .eq(
          "targetId",
          targetId
        )
        .eq(
          "status",
          "pending"
        )
        .maybeSingle();

      if (error) {
        return failure(
          error.message,
          false
        );
      }

      return success(
        "Takip isteği durumu alındı",
        !!data
      );
    } catch {
      return failure(
        "Takip isteği kontrol edilemedi",
        false
      );
    }
  };

/* =========================================================
   FOLLOW RELATION
   ========================================================= */

export const getFollowRelation =
  async (
    currentUserId: string,
    targetUserId: string
  ): Promise<APIResponse> => {
    try {
      if (
        !currentUserId ||
        !targetUserId
      ) {
        return failure(
          "Geçersiz kullanıcı bilgisi",
          "none"
        );
      }

      if (
        currentUserId ===
        targetUserId
      ) {
        return success(
          "Kendi profiliniz",
          "none"
        );
      }

      const followingResult =
        await isFollowing(
          currentUserId,
          targetUserId
        );

      if (
        followingResult.success &&
        followingResult.data
      ) {
        return success(
          "Kullanıcı takip ediliyor",
          "following"
        );
      }

      const pendingResult =
        await hasPendingFollowRequest(
          currentUserId,
          targetUserId
        );

      if (
        pendingResult.success &&
        pendingResult.data
      ) {
        return success(
          "Takip isteği bekliyor",
          "pending"
        );
      }

      return success(
        "Kullanıcı takip edilmiyor",
        "none"
      );
    } catch {
      return failure(
        "Takip ilişkisi alınamadı",
        "none"
      );
    }
  };

/* =========================================================
   FOLLOW USER
   ========================================================= */

export const followUser = async (
  followerId: string,
  followingId: string,
  isPrivate: boolean
): Promise<APIResponse> => {
  try {
    if (
      !followerId ||
      !followingId
    ) {
      return failure(
        "Geçersiz kullanıcı bilgisi"
      );
    }

    if (
      followerId === followingId
    ) {
      return failure(
        "Kendinizi takip edemezsiniz"
      );
    }

    /*
     * PRIVATE ACCOUNT
     * => follows oluşturma
     * => follow_requests oluştur
     */

    if (isPrivate) {
      const {
        data,
        error,
      } = await supabase
        .from("follow_requests")
        .insert({
          requesterId:
            followerId,
          targetId:
            followingId,
          status:
            "pending",
        })
        .select()
        .single();

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          return success(
            "Takip isteği zaten gönderildi",
            {
              requestPending:
                true,
            }
          );
        }

        return failure(
          error.message
        );
      }

      return success(
        "Takip isteği gönderildi",
        {
          ...data,
          requestPending:
            true,
        }
      );
    }

    /*
     * PUBLIC ACCOUNT
     * => direkt follows
     */

    const {
      data,
      error,
    } = await supabase
      .from("follows")
      .insert({
        followerId,
        followingId,
      })
      .select()
      .single();

    if (error) {
      if (
        error.code ===
        "23505"
      ) {
        return success(
          "Kullanıcı zaten takip ediliyor",
          {
            alreadyFollowing:
              true,
          }
        );
      }

      return failure(
        error.message
      );
    }

    return success(
      "Kullanıcı takip edildi",
      data
    );
  } catch {
    return failure(
      "Takip işlemi başarısız"
    );
  }
};

/* =========================================================
   UNFOLLOW
   ========================================================= */

export const unfollowUser = async (
  followerId: string,
  followingId: string
): Promise<APIResponse> => {
  try {
    if (
      !followerId ||
      !followingId
    ) {
      return failure(
        "Geçersiz kullanıcı bilgisi"
      );
    }

    const {
      error,
    } = await supabase
      .from("follows")
      .delete()
      .eq(
        "followerId",
        followerId
      )
      .eq(
        "followingId",
        followingId
      );

    if (error) {
      return failure(
        error.message
      );
    }

    return success(
      "Takip bırakıldı"
    );
  } catch {
    return failure(
      "Takip bırakma işlemi başarısız"
    );
  }
};

/* =========================================================
   CANCEL REQUEST
   ========================================================= */

export const cancelFollowRequest =
  async (
    requesterId: string,
    targetId: string
  ): Promise<APIResponse> => {
    try {
      const {
        error,
      } = await supabase
        .from(
          "follow_requests"
        )
        .delete()
        .eq(
          "requesterId",
          requesterId
        )
        .eq(
          "targetId",
          targetId
        )
        .eq(
          "status",
          "pending"
        );

      if (error) {
        return failure(
          error.message
        );
      }

      return success(
        "Takip isteği iptal edildi"
      );
    } catch {
      return failure(
        "Takip isteği iptal edilemedi"
      );
    }
  };

/* =========================================================
   ACCEPT / REJECT
   ========================================================= */

export const respondToFollowRequest =
  async (
    requestId: string,
    accept: boolean
  ): Promise<APIResponse> => {
    try {
      if (!requestId) {
        return failure(
          "Geçersiz takip isteği"
        );
      }

      const {
        data: request,
        error:
          requestError,
      } = await supabase
        .from(
          "follow_requests"
        )
        .select("*")
        .eq(
          "id",
          requestId
        )
        .eq(
          "status",
          "pending"
        )
        .single();

      if (
        requestError ||
        !request
      ) {
        return failure(
          "Takip isteği bulunamadı"
        );
      }

      /*
       * ACCEPT
       */

      if (accept) {
        const {
          error:
            followError,
        } = await supabase
          .from(
            "follows"
          )
          .insert({
            followerId:
              request.requesterId,
            followingId:
              request.targetId,
          });

        if (
          followError &&
          followError.code !==
            "23505"
        ) {
          return failure(
            followError.message
          );
        }
      }

      /*
       * UPDATE REQUEST
       */

      const {
        data,
        error,
      } = await supabase
        .from(
          "follow_requests"
        )
        .update({
          status: accept
            ? "accepted"
            : "rejected",
          responded_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          requestId
        )
        .eq(
          "status",
          "pending"
        )
        .select()
        .single();

      if (error) {
        return failure(
          error.message
        );
      }

      return success(
        accept
          ? "Takip isteği kabul edildi"
          : "Takip isteği reddedildi",
        data
      );
    } catch {
      return failure(
        "Takip isteği yanıtlanamadı"
      );
    }
  };

/* =========================================================
   SINGLE REQUEST
   ========================================================= */

export const getFollowRequest =
  async (
    requesterId: string,
    targetId: string
  ): Promise<APIResponse> => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "follow_requests"
        )
        .select("*")
        .eq(
          "requesterId",
          requesterId
        )
        .eq(
          "targetId",
          targetId
        )
        .eq(
          "status",
          "pending"
        )
        .maybeSingle();

      if (error) {
        return failure(
          error.message,
          null
        );
      }

      return success(
        "Takip isteği alındı",
        data
      );
    } catch {
      return failure(
        "Takip isteği alınamadı"
      );
    }
  };

/* =========================================================
   COUNTS
   ========================================================= */

export const getFollowersCount =
  async (
    userId: string
  ): Promise<APIResponse> => {
    try {
      const {
        count,
        error,
      } = await supabase
        .from("follows")
        .select("*", {
          count:
            "exact",
          head: true,
        })
        .eq(
          "followingId",
          userId
        );

      if (error) {
        return failure(
          error.message,
          0
        );
      }

      return success(
        "Takipçi sayısı alındı",
        count || 0
      );
    } catch {
      return failure(
        "Takipçi sayısı alınamadı",
        0
      );
    }
  };

export const getFollowingCount =
  async (
    userId: string
  ): Promise<APIResponse> => {
    try {
      const {
        count,
        error,
      } = await supabase
        .from("follows")
        .select("*", {
          count:
            "exact",
          head: true,
        })
        .eq(
          "followerId",
          userId
        );

      if (error) {
        return failure(
          error.message,
          0
        );
      }

      return success(
        "Takip edilen sayısı alındı",
        count || 0
      );
    } catch {
      return failure(
        "Takip edilen sayısı alınamadı",
        0
      );
    }
  };

/* =========================================================
   FOLLOWERS
   ========================================================= */

export const getFollowers =
  async (
    userId: string
  ): Promise<APIResponse> => {
    try {
      const {
        data,
        error,
      } = await supabase
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
              address,
              isPrivate
            )
          `
        )
        .eq(
          "followingId",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

      if (error) {
        return failure(
          error.message,
          null
        );
      }

      const users =
        (data || [])
          .map(
            (item: any) =>
              item.user
          )
          .filter(Boolean);

      return success(
        "Takipçiler alındı",
        users
      );
    } catch {
      return failure(
        "Takipçiler alınamadı",
        null
      );
    }
  };

/* =========================================================
   FOLLOWING
   ========================================================= */

export const getFollowing =
  async (
    userId: string
  ): Promise<APIResponse> => {
    try {
      const {
        data,
        error,
      } = await supabase
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
              address,
              isPrivate
            )
          `
        )
        .eq(
          "followerId",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

      if (error) {
        return failure(
          error.message,
          null
        );
      }

      const users =
        (data || [])
          .map(
            (item: any) =>
              item.user
          )
          .filter(Boolean);

      return success(
        "Takip edilenler alındı",
        users
      );
    } catch {
      return failure(
        "Takip edilenler alınamadı",
        null
      );
    }
  };
