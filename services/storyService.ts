import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/services/imageService";
import { APIResponse } from "@/services/userService";

export interface Story {
  id: string;
  user_id: string;
  media_path: string;
  media_type: "image" | "video";
  created_at: string;
  expires_at: string;
  user?: {
    id: string;
    name: string;
    image: string | null;
    username?: string | null;
  };
}

export const getActiveStories = async (
  userId: string
): Promise<APIResponse> => {
  try {
    const { data, error } = await supabase
      .from("stories")
      .select(`
        *,
        user:user_id(
          id,
          name,
          image,
          username
        )
      `)
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      return {
        success: false,
        message:
          "Hikâyeler alınamadı.",
        data: null,
      };
    }

    const {
      data: followingRows,
      error: followingError,
    } =
      await supabase
        .from("follows")
        .select(
          '"followingId"'
        )
        .eq(
          '"followerId"',
          userId
        );

    if (followingError) {
      return {
        success: true,
        message:
          "Hikâyeler alındı.",
        data: (data || []).filter(
          story =>
            story.user_id ===
            userId
        ),
      };
    }

    const followingIds =
      new Set(
        (
          followingRows || []
        ).map(
          row =>
            row.followingId
        )
      );

    const visible =
      (data || []).filter(
        story =>
          story.user_id ===
            userId ||
          followingIds.has(
            story.user_id
          )
      );

    return {
      success: true,
      message:
        "Hikâyeler alındı.",
      data: visible,
    };
  } catch (error) {
    console.warn(
      "Story Service - getActiveStories:",
      error
    );

    return {
      success: false,
      message:
        "Hikâyeler alınamadı.",
      data: null,
    };
  }
};

export const getStoryFeed = async (
  userId: string
): Promise<APIResponse> => {
  const result =
    await getActiveStories(
      userId
    );

  if (!result.success) {
    return result;
  }

  const stories =
    (result.data ||
      []) as Story[];

  const groups =
    new Map<
      string,
      Story[]
    >();

  for (const story of stories) {
    const list =
      groups.get(
        story.user_id
      ) || [];

    list.push(
      story
    );

    groups.set(
      story.user_id,
      list
    );
  }

  const orderedGroups =
    Array.from(
      groups.values()
    ).sort((a, b) => {
      if (
        a[0]?.user_id ===
        userId
      ) {
        return -1;
      }

      if (
        b[0]?.user_id ===
        userId
      ) {
        return 1;
      }

      return (
        new Date(
          a[0]?.created_at ||
            0
        ).getTime() -
        new Date(
          b[0]?.created_at ||
            0
        ).getTime()
      );
    });

  return {
    success: true,
    message:
      "Hikâye akışı hazır.",
    data:
      orderedGroups.flat(),
  };
};

export const createStory = async (
  userId: string,
  uri: string,
  mediaType:
    | "image"
    | "video"
): Promise<APIResponse> => {
  try {
    if (!userId || !uri) {
      return {
        success: false,
        message:
          "Hikâye medyası bulunamadı.",
        data: null,
      };
    }

    const upload =
      await uploadFile(
        userId,
        "stories",
        uri,
        mediaType ===
          "image"
      );

    if (
      !upload.success ||
      !upload.data
    ) {
      return {
        success: false,
        message:
          upload.message ||
          "Hikâye yüklenemedi.",
        data: null,
      };
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("stories")
        .insert({
          user_id:
            userId,
          media_path:
            upload.data,
          media_type:
            mediaType,
        })
        .select()
        .single();

    if (error) {
      return {
        success: false,
        message:
          "Hikâye kaydedilemedi.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Hikâye paylaşıldı.",
      data,
    };
  } catch (error) {
    console.warn(
      "Story Service - createStory:",
      error
    );

    return {
      success: false,
      message:
        "Hikâye oluşturulamadı.",
      data: null,
    };
  }
};

export const markStoryViewed =
  async (
    storyId: string,
    userId: string
  ): Promise<APIResponse> => {
    const {
      error,
    } =
      await supabase
        .from(
          "story_views"
        )
        .upsert(
          {
            story_id:
              storyId,
            user_id:
              userId,
          },
          {
            onConflict:
              "story_id,user_id",
          }
        );

    if (error) {
      return {
        success: false,
        message:
          "Hikâye görüntüleme kaydedilemedi.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Görüntüleme kaydedildi.",
      data: true,
    };
  };

export const toggleStoryLike =
  async (
    storyId: string,
    userId: string
  ): Promise<APIResponse> => {
    const {
      data: existing,
    } =
      await supabase
        .from(
          "story_likes"
        )
        .select(
          "story_id"
        )
        .eq(
          "story_id",
          storyId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (existing) {
      const {
        error,
      } =
        await supabase
          .from(
            "story_likes"
          )
          .delete()
          .eq(
            "story_id",
            storyId
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        return {
          success: false,
          message:
            "Beğeni kaldırılamadı.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Beğeni kaldırıldı.",
        data: false,
      };
    }

    const {
      error,
    } =
      await supabase
        .from(
          "story_likes"
        )
        .insert({
          story_id:
            storyId,
          user_id:
            userId,
        });

    if (error) {
      return {
        success: false,
        message:
          "Hikâye beğenilemedi.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Hikâye beğenildi.",
      data: true,
    };
  };

export const addStoryComment =
  async (
    storyId: string,
    userId: string,
    body: string
  ): Promise<APIResponse> => {
    const text =
      body.trim();

    if (!text) {
      return {
        success: false,
        message:
          "Yorum boş olamaz.",
        data: null,
      };
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "story_comments"
        )
        .insert({
          story_id:
            storyId,
          user_id:
            userId,
          body: text,
        })
        .select(
          `
          *,
          user:user_id(
            id,
            name,
            image,
            username
          )
          `
        )
        .single();

    if (error) {
      return {
        success: false,
        message:
          "Yorum gönderilemedi.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Yorum gönderildi.",
      data,
    };
  };

export const getStoryInteractions =
  async (
    storyId: string
  ): Promise<APIResponse> => {
    const [
      views,
      likes,
      comments,
    ] =
      await Promise.all([
        supabase
          .from(
            "story_views"
          )
          .select(
            `
            *,
            user:user_id(
              id,
              name,
              image,
              username
            )
            `
          )
          .eq(
            "story_id",
            storyId
          )
          .order(
            "viewed_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "story_likes"
          )
          .select(
            `
            *,
            user:user_id(
              id,
              name,
              image,
              username
            )
            `
          )
          .eq(
            "story_id",
            storyId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "story_comments"
          )
          .select(
            `
            *,
            user:user_id(
              id,
              name,
              image,
              username
            )
            `
          )
          .eq(
            "story_id",
            storyId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),
      ]);

    if (
      views.error ||
      likes.error ||
      comments.error
    ) {
      return {
        success: false,
        message:
          "Hikâye etkileşimleri alınamadı.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Hikâye etkileşimleri alındı.",
      data: {
        views:
          views.data ||
          [],
        likes:
          likes.data ||
          [],
        comments:
          comments.data ||
          [],
      },
    };
  };

export const deleteStory =
  async (
    storyId: string
  ): Promise<APIResponse> => {
    const {
      error,
    } =
      await supabase
        .from(
          "stories"
        )
        .delete()
        .eq(
          "id",
          storyId
        );

    if (error) {
      return {
        success: false,
        message:
          "Hikâye silinemedi.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Hikâye silindi.",
      data: storyId,
    };
  };

export const highlightStory =
  async (
    storyId: string,
    userId: string
  ): Promise<APIResponse> => {
    const {
      data: existing,
    } =
      await supabase
        .from(
          "story_highlights"
        )
        .select(
          "id"
        )
        .eq(
          "story_id",
          storyId
        )
        .maybeSingle();

    if (existing) {
      return {
        success: true,
        message:
          "Hikâye zaten öne çıkarılmış.",
        data: existing,
      };
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "story_highlights"
        )
        .insert({
          story_id:
            storyId,
          user_id:
            userId,
        })
        .select()
        .single();

    if (error) {
      return {
        success: false,
        message:
          "Hikâye öne çıkarılamadı.",
        data: null,
      };
    }

    return {
      success: true,
      message:
        "Hikâye öne çıkarıldı.",
      data,
    };
  };
