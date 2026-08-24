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
      .select(
        `*,
         user:user_id(
           id,
           name,
           image,
           username
         )`
      )
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      return {
        success: false,
        message: "Hikâyeler alınamadı.",
        data: null,
      };
    }

    const followingResult =
      await supabase
        .from("follows")
        .select(
          '"followingId"'
        )
        .eq(
          '"followerId"',
          userId
        );

    if (
      followingResult.error
    ) {
      return {
        success: true,
        message: "Hikâyeler alındı.",
        data:
          (data || []).filter(
            story =>
              story.user_id ===
              userId
          ),
      };
    }

    const followingIds =
      new Set(
        (
          followingResult.data ||
          []
        ).map(
          row =>
            row.followingId
        )
      );

    const visibleStories =
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
      message: "Hikâyeler alındı.",
      data:
        visibleStories,
    };
  } catch (error) {
    console.warn(
      "Story Service - getActiveStories:",
      error
    );

    return {
      success: false,
      message: "Hikâyeler alınamadı.",
      data: null,
    };
  }
};

export const createStory = async (
  userId: string,
  uri: string,
  mediaType:
    | "image"
    | "video"
): Promise<APIResponse> => {
  try {
    if (
      !userId ||
      !uri
    ) {
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
    } = await supabase
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

export const deleteStory = async (
  storyId: string
): Promise<APIResponse> => {
  try {
    const {
      error,
    } = await supabase
      .from("stories")
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
      data:
        storyId,
    };
  } catch (error) {
    console.warn(
      "Story Service - deleteStory:",
      error
    );

    return {
      success: false,
      message:
        "Hikâye silinemedi.",
      data: null,
    };
  }
};
