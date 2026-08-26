import * as ImagePicker from "expo-image-picker";
import { APIResponse } from "./userService";
import { uploadFile } from "./imageService";
import { supabase } from "@/lib/supabase";

const SERVICE_NAME = "Post Serivce";

export interface Post {
  id?: string;
  userId: string;
  file: ImagePicker.ImagePickerAsset | string;
  body: string;
}

export interface PostViewer {
  user: {
    id: string;
    name: string;
    image: string;
    expoPushToken: string;
  };
  postLikes: {
    id: string;
    userId: string;
  }[];
  comments: {
    id: string;
    postId: string;
    text: string;
    user: {
      id: string;
      name: string;
      image: string;
    };
    created_at: string;
  }[];
  body: string;
  created_at: string;
  file: string;
  id: string;
  userId: string;
  isLikeOwner: boolean;
}

export const createOrUpdatePost = async (post: Post): Promise<APIResponse> => {
  const taskName = "creating or updating post";
  try {
    let postData = { ...post };
    // 🔄️ Uploading file
    if (typeof postData.file !== "string") {
      let isImage = postData.file.type == "image";
      let folderName = isImage ? "postImages" : "postVideos";
      let fileResult = await uploadFile(
        postData.userId,
        folderName,
        postData.file.uri,
        isImage
      );
      if (fileResult.success) {
        postData.file = fileResult.data;
      } else {
        return fileResult;
      }
    }

    // 🔄️ Uploading post
    const { data, error } = await supabase
      .from("posts")
      .upsert(postData)
      .select()
      .single();

    // ❌ Error
    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} of ${postData.userId} | ${error.message}`
      );
      return {
        success: false,
        message: `Error while ${taskName}`,
        data: null,
      };
    }

    // ✅ Success
    return {
      success: true,
      message: `${taskName} successfully`,
      data: data as PostViewer,
    };
  } catch (error) {
    // ❌ Error
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} of ${post.userId} | ${error}`
    );
    return {
      success: false,
      message: `${taskName} successfully`,
      data: null,
    };
  }
};

export const numPostsReturn = 5;

export const getPosts = async (
  page: number,
  userId: string
): Promise<APIResponse> => {
  const taskName = "getting posts";

  try {
    const from =
      (page - 1) *
      numPostsReturn;

    const to =
      page *
      numPostsReturn -
      1;

    const {
      data,
      error,
    } =
      await supabase
        .from("posts")
        .select(
          `
          id,
          userId,
          file,
          body,
          created_at,
          postLikes(
            id,
            userId,
            created_at
          )
        `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .range(
          from,
          to
        );

    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );

      return {
        success: false,
        message:
          `Error while ${taskName}`,
        data: null,
      };
    }

    const rawPosts = Array.isArray(data)
      ? data
      : [];

    const postUserIds = [
      ...new Set(
        rawPosts
          .map((post: any) => post?.userId)
          .filter(Boolean)
      ),
    ];

    let userMap = new Map<string, any>();

    if (postUserIds.length) {
      const {
        data: users,
      } = await supabase
        .from("users")
        .select(
          "id, name, image, expoPushToken"
        )
        .in("id", postUserIds);

      userMap = new Map(
        (users || []).map((item: any) => [
          item.id,
          item,
        ])
      );
    }

    const formattedData =
      rawPosts.map(
        (post: any) => ({
          ...post,
          user:
            userMap.get(post.userId) || {
              id: post.userId,
              name: "Kullanıcı",
              image: "",
              expoPushToken: "",
            },
          comments: [],
          postLikes:
            Array.isArray(
              post.postLikes
            )
              ? post.postLikes
              : [],
          isLikeOwner:
            Array.isArray(
              post.postLikes
            ) &&
            post.postLikes.some(
              (like: any) =>
                like?.userId ===
                userId
            ),
        })
      );

    return {
      success: true,
      message:
        `${taskName} successfully`,
      data:
        formattedData,
    };
  } catch (error) {
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} | ${error}`
    );

    return {
      success: false,
      message:
        `Error while ${taskName}`,
      data: null,
    };
  }
};

export const getYourPosts = async (
  page: number,
  userId: string
): Promise<APIResponse> => {
  const taskName = "getting posts";

  try {
    const from =
      (page - 1) *
      numPostsReturn;

    const to =
      page *
      numPostsReturn -
      1;

    const {
      data,
      error,
    } =
      await supabase
        .from("posts")
        .select(
          `
          id,
          userId,
          file,
          body,
          created_at,
          postLikes(
            id,
            userId,
            created_at
          )
        `
        )
        .eq(
          "userId",
          userId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .range(
          from,
          to
        );

    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );

      return {
        success: false,
        message:
          `Error while ${taskName}`,
        data: null,
      };
    }

    const rawPosts = Array.isArray(data)
      ? data
      : [];

    const postUserIds = [
      ...new Set(
        rawPosts
          .map((post: any) => post?.userId)
          .filter(Boolean)
      ),
    ];

    let userMap = new Map<string, any>();

    if (postUserIds.length) {
      const {
        data: users,
      } = await supabase
        .from("users")
        .select(
          "id, name, image, expoPushToken"
        )
        .in("id", postUserIds);

      userMap = new Map(
        (users || []).map((item: any) => [
          item.id,
          item,
        ])
      );
    }

    const formattedData =
      rawPosts.map(
        (post: any) => ({
          ...post,
          user:
            userMap.get(post.userId) || {
              id: post.userId,
              name: "Kullanıcı",
              image: "",
              expoPushToken: "",
            },
          comments: [],
          postLikes:
            Array.isArray(
              post.postLikes
            )
              ? post.postLikes
              : [],
          isLikeOwner:
            Array.isArray(
              post.postLikes
            ) &&
            post.postLikes.some(
              (like: any) =>
                like?.userId ===
                userId
            ),
        })
      );

    return {
      success: true,
      message:
        `${taskName} successfully`,
      data:
        formattedData,
    };
  } catch (error) {
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} | ${error}`
    );

    return {
      success: false,
      message:
        `Error while ${taskName}`,
      data: null,
    };
  }
};

export const removePost = async (postId: string): Promise<APIResponse> => {
  const taskName = "removing post";
  try {
    // 🔄️ Getting posts
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      // ❌ Error
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );
      return {
        success: false,
        message: `Error while ${taskName}`,
        data: null,
      };
    }

    // ✅ Success
    console.log(`${SERVICE_NAME} - ${taskName}`);
    return {
      success: true,
      message: `${taskName} successfully`,
      data: null,
    };
  } catch (error) {
    // ❌ Error
    console.warn(`${SERVICE_NAME} - Error while ${taskName} | ${error}`);
    return {
      success: false,
      message: `Error while ${taskName}`,
      data: null,
    };
  }
};

export interface PostLikeBody {
  postId: string;
  userId: string;
}

export interface PostLike {
  id: string;
  created_at: string;
  postId: string;
  userId: string;
}

export const createPostLike = async (
  postLike: PostLikeBody
): Promise<APIResponse> => {
  const taskName = "creating postLike";

  try {
    const { data, error } =
      await supabase.rpc(
        "create_post_like",
        {
          p_post_id:
            postLike.postId,
        }
      );

    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );

      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message:
        `${taskName} successfully`,
      data:
        data as PostLike,
    };
  } catch (error) {
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} | ${error}`
    );

    return {
      success: false,
      message:
        `Error while ${taskName}`,
      data: null,
    };
  }
};

export const removePostLike = async (
  postLike: PostLikeBody
): Promise<APIResponse> => {
  const taskName = "removing postLike";

  try {
    const { error } =
      await supabase.rpc(
        "remove_post_like",
        {
          p_post_id:
            postLike.postId,
        }
      );

    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );

      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message:
        `${taskName} successfully`,
      data: null,
    };
  } catch (error) {
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} | ${error}`
    );

    return {
      success: false,
      message:
        `Error while ${taskName}`,
      data: null,
    };
  }
};

export const getPostDetails = async (
  postId: string,
  userId: string
): Promise<APIResponse> => {
  const taskName = "getting postDetails";
  try {
    // 🔄️ Getting posts
    const { data, error } =
      await supabase.rpc(
        "get_post_details",
        {
          p_post_id:
            postId,
          p_user_id:
            userId,
        }
      );

    if (error) {
      // ❌ Error
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );
      return {
        success: false,
        message: `Error while ${taskName}`,
        data: null,
      };
    }

    const checkIsLikeOwner = (
      postViewer: PostViewer,
      currentUserId?: string
    ) =>
      !!postViewer?.postLikes?.some(
        (like) =>
          like?.userId ===
          currentUserId
      );

    const formattedData: PostViewer | null =
      data &&
      typeof data === "object"
        ? {
            ...(data as PostViewer),
            postLikes:
              Array.isArray(
                (data as any)
                  .postLikes
              )
                ? (data as any)
                    .postLikes
                : [],
            comments:
              Array.isArray(
                (data as any)
                  .comments
              )
                ? (data as any)
                    .comments
                : [],
            isLikeOwner:
              checkIsLikeOwner(
                data as PostViewer,
                userId
              ),
          }
        : null;

    // ✅ Success
    console.log(`${SERVICE_NAME} - ${taskName} of post ${postId}`);
    return {
      success: true,
      message: `${taskName} successfully`,
      data: formattedData,
    };
  } catch (error) {
    // ❌ Error
    console.warn(`${SERVICE_NAME} - Error while ${taskName} | ${error}`);
    return {
      success: false,
      message: `Error while ${taskName}`,
      data: null,
    };
  }
};

export interface CommentPostBody {
  userId: string;
  postId: string;
  text: string;
}

export const createCommentPost = async (
  commentBody: CommentPostBody
): Promise<APIResponse> => {
  const taskName = "creating comment";
  try {
    // 🔄️ Getting posts
    const { data, error } = await supabase
      .from("comments")
      .insert(commentBody)
      .select("*, user: users(id, name, image)")
      .single();

    if (error) {
      // ❌ Error
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );
      return {
        success: false,
        message: `Error while ${taskName}`,
        data: null,
      };
    }

    // ✅ Success
    console.log(`${SERVICE_NAME} - ${taskName} of user ${commentBody.userId}`);
    return {
      success: true,
      message: `${taskName} successfully`,
      data: data as Comment,
    };
  } catch (error) {
    // ❌ Error
    console.warn(`${SERVICE_NAME} - Error while ${taskName} | ${error}`);
    return {
      success: false,
      message: `Error while ${taskName}`,
      data: null,
    };
  }
};

export interface Comment {
  id: string;
  postId: string;
  text: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
  created_at: string;
}

export const removeCommentPost = async (
  commentId: string
): Promise<APIResponse> => {
  const taskName = "removing comment";
  try {
    // 🔄️ Getting posts
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      // ❌ Error
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );
      return {
        success: false,
        message: `Error while ${taskName}`,
        data: null,
      };
    }

    // ✅ Success
    console.log(`${SERVICE_NAME} - ${taskName} ${commentId}`);
    return {
      success: true,
      message: `${taskName} successfully`,
      data: null,
    };
  } catch (error) {
    // ❌ Error
    console.warn(`${SERVICE_NAME} - Error while ${taskName} | ${error}`);
    return {
      success: false,
      message: `Error while ${taskName}`,
      data: null,
    };
  }
};

/**
 * Home feed:
 * Takip edilen kullanıcıların gönderilerini kronolojik olarak getirir.
 * Supabase tarafındaki get_home_feed RPC'sini kullanır.
 */
export const getHomeFeed = async (
  page: number,
  userId: string
): Promise<APIResponse> => {
  const taskName = "getting home feed";

  try {
    const limit = numPostsReturn;
    const offset = Math.max(0, (page - 1) * limit);

    const { data, error } = await supabase.rpc(
      "get_home_feed",
      {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );

      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    const rawPosts = Array.isArray(data) ? data : [];

    if (!rawPosts.length) {
      return {
        success: true,
        message: `${taskName} successfully`,
        data: [],
      };
    }

    const formattedData =
      rawPosts.map(
        (post: any) => {
          const postLikes =
            Array.isArray(
              post.postLikes
            )
              ? post.postLikes
              : [];

          return {
            ...post,
            user: {
              id:
                post.userId,
              name:
                post.user_name ||
                "Kullanıcı",
              image:
                post.user_image ||
                "",
              expoPushToken:
                post.user_expo_push_token ||
                "",
            },
            postLikes,
            comments:
              Array.isArray(
                post.comments
              )
                ? post.comments
                : [],
            isLikeOwner:
              postLikes.some(
                (like: any) =>
                  like?.userId ===
                  userId
              ),
          };
        }
      );

    return {
      success: true,
      message: `${taskName} successfully`,
      data: formattedData,
    };
  } catch (error) {
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} | ${error}`
    );

    return {
      success: false,
      message: `Error while ${taskName}`,
      data: null,
    };
  }
};

export const getExploreFeed = async (
  page: number,
  userId: string
): Promise<APIResponse> => {
  const taskName = "getting explore feed";

  try {
    const limit = numPostsReturn;
    const offset = Math.max(0, (page - 1) * limit);

    const { data, error } = await supabase.rpc(
      "get_explore_feed",
      {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (error) {
      console.warn(
        `${SERVICE_NAME} - Error while ${taskName} | ${error.message}`
      );

      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    const formattedData = (Array.isArray(data) ? data : []).map(
      (post: any) => ({
        ...post,
        postLikes: Array.isArray(post.postLikes)
          ? post.postLikes
          : [],
        comments: Array.isArray(post.comments)
          ? post.comments
          : [],
        isLikeOwner:
          Array.isArray(post.postLikes) &&
          post.postLikes.some(
            (like: any) => like?.userId === userId
          ),
      })
    );

    return {
      success: true,
      message: `${taskName} successfully`,
      data: formattedData,
    };
  } catch (error) {
    console.warn(
      `${SERVICE_NAME} - Error while ${taskName} | ${error}`
    );

    return {
      success: false,
      message: `Error while ${taskName}`,
      data: null,
    };
  }
};

