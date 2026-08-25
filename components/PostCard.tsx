import { Router } from "expo-router";
import {
  Alert,
  Share,
  ShareContent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, {
  useEffect,
  useState,
} from "react";
import {
  createPostLike,
  PostLike,
  PostLikeBody,
  PostViewer,
  removePost,
  removePostLike,
} from "@/services/postService";
import { SupaUser } from "@/contexts/AuthContext";
import {
  getFormattedDate,
  getSupabaseFileUrl,
  hp,
  stripHtmlTags,
  wp,
} from "@/helpers/common";
import { theme } from "@/constants/theme";
import Avatar from "./Avatar";
import Icon from "@/assets/icons";
import RenderHtml from "react-native-render-html";
import {
  SUPABASE_FOLDER_NAME,
} from "@/constants";
import { Image } from "expo-image";
import {
  ResizeMode,
  Video,
} from "expo-av";
import {
  downloadFile,
  downloadFileAsync,
} from "@/services/imageService";
import Loading from "./Loading";

const POST_SHADOW_STYLES = {
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 1,
};

const POST_TAGS_STYLES = {
  div: {
    color: theme.colors.text,
    fontSize: hp(1.75),
  },
  p: {
    color: theme.colors.text,
    fontSize: hp(1.75),
  },
  ol: {
    color: theme.colors.text,
    fontSize: hp(1.75),
  },
  h1: {
    color: theme.colors.text,
  },
  h4: {
    color: theme.colors.text,
  },
};

interface PostCardProps {
  item: PostViewer;
  currentUser:
    | SupaUser
    | undefined;
  router: Router;
  hasShadow?: boolean;
  disableMoreIcon?: boolean;
  disableBackIcon?: boolean;
  isEdit?: boolean;
  onLikeChange?: (
    postId: string,
    likeId: string | null,
    userId: string,
    liked: boolean
  ) => void;
}

const PostCard: React.FC<
  PostCardProps
> = ({
  item,
  currentUser,
  router,
  hasShadow = true,
  disableMoreIcon = false,
  disableBackIcon = true,
  isEdit = false,
  onLikeChange,
}) => {
  const currentUserId =
    currentUser?.id;

  type LocalLike = {
    id: string;
    userId: string;
    postId?: string;
    created_at?: string;
  };

  const [
    likes,
    setLikes,
  ] = useState<LocalLike[]>(
    item?.postLikes || []
  );

  const [
    comments,
    setComments,
  ] = useState<any[]>(
    item?.comments || []
  );

  const [
    openMoreFunctions,
    setOpenMoreFunctions,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingDeletingPost,
    setLoadingDeletingPost,
  ] = useState(false);

  const [
    likeRequestLoading,
    setLikeRequestLoading,
  ] = useState(false);

  useEffect(() => {
    const incoming =
      item?.postLikes || [];

    setLikes(
      (previous) => {
        const currentUserLike =
          previous.find(
            (like) =>
              like.userId ===
              currentUserId
          );

        const incomingWithoutCurrent =
          incoming.filter(
            (like) =>
              like.userId !==
              currentUserId
          );

        /*
         * Parent yeni veriyi getirirken
         * mevcut kullanıcının optimistic
         * state'ini ezme.
         */
        return currentUserLike
          ? [
              ...incomingWithoutCurrent,
              currentUserLike,
            ]
          : incoming;
      }
    );
  }, [
    item?.postLikes,
    currentUserId,
  ]);

  useEffect(() => {
    setComments(
      item?.comments || []
    );
  }, [item?.comments]);

  const isLiked =
    !!likes.some(
      (like) =>
        like?.userId ===
        currentUserId
    );

  const likeCount =
    likes.length;

  const isPostOwner =
    item.userId ===
    currentUser?.id;

  const updateLikeState =
    (
      liked: boolean,
      like: LocalLike | null
    ) => {
      setLikes(
        (previous) => {
          const withoutCurrent =
            previous.filter(
              (entry) =>
                entry.userId !==
                currentUserId
            );

          if (
            !liked ||
            !like
          ) {
            return withoutCurrent;
          }

          return [
            ...withoutCurrent,
            like,
          ];
        }
      );
    };

  const openPostDetails =
    () => {
      router.push({
        pathname:
          "/postDetails",
        params: {
          postId:
            item.id,
        },
      });
    };

  const onLike = async () => {
    if (
      !currentUserId ||
      !item?.id ||
      likeRequestLoading
    ) {
      return;
    }

    setLikeRequestLoading(
      true
    );

    const optimisticLike: LocalLike =
      {
        id:
          `optimistic-${currentUserId}-${item.id}`,
        created_at:
          new Date().toISOString(),
        postId:
          item.id,
        userId:
          currentUserId,
      };

    updateLikeState(
      true,
      optimisticLike
    );

    onLikeChange?.(
      item.id,
      optimisticLike.id,
      currentUserId,
      true
    );

    try {
      const result =
        await createPostLike({
          userId:
            currentUserId,
          postId:
            item.id,
        });

      if (
        !result.success
      ) {
        updateLikeState(
          false,
          null
        );

        onLikeChange?.(
          item.id,
          optimisticLike.id,
          currentUserId,
          false
        );

        Alert.alert(
          "Beğeni",
          result.message
        );

        return;
      }

      const realLike =
        result.data as
          | LocalLike
          | null;

      if (
        realLike
      ) {
        updateLikeState(
          true,
          realLike
        );

        onLikeChange?.(
          item.id,
          realLike.id,
          currentUserId,
          true
        );
      }
    } catch {
      updateLikeState(
        false,
        null
      );

      onLikeChange?.(
        item.id,
        optimisticLike.id,
        currentUserId,
        false
      );

      Alert.alert(
        "Beğeni",
        "Beğeni işlemi başarısız oldu."
      );
    } finally {
      setLikeRequestLoading(
        false
      );
    }
  };

  const onRemoveLike =
    async () => {
      if (
        !currentUserId ||
        !item?.id ||
        likeRequestLoading
      ) {
        return;
      }

      const existingLike =
        likes.find(
          (like) =>
            like?.userId ===
            currentUserId
        );

      if (
        !existingLike
      ) {
        return;
      }

      setLikeRequestLoading(
        true
      );

      updateLikeState(
        false,
        null
      );

      onLikeChange?.(
        item.id,
        existingLike.id,
        currentUserId,
        false
      );

      try {
        const result =
          await removePostLike({
            userId:
              currentUserId,
            postId:
              item.id,
          });

        if (
          !result.success
        ) {
          updateLikeState(
            true,
            existingLike
          );

          onLikeChange?.(
            item.id,
            existingLike.id,
            currentUserId,
            true
          );

          Alert.alert(
            "Beğeni",
            result.message
          );
        }
      } catch {
        updateLikeState(
          true,
          existingLike
        );

        onLikeChange?.(
          item.id,
          existingLike.id,
          currentUserId,
          true
        );

        Alert.alert(
          "Beğeni",
          "Beğeni kaldırma işlemi başarısız oldu."
        );
      } finally {
        setLikeRequestLoading(
          false
        );
      }
    };

  const onComment = () => {
    router.push({
      pathname:
        "/postDetails",
      params: {
        postId:
          item.id,
      },
    });
  };

  const onShare =
    async () => {
      let uri = "";

      if (
        item?.file
      ) {
        setLoading(true);

        uri =
          (await downloadFile(
            getSupabaseFileUrl(
              item.file
            )?.uri ||
              ""
          )) || "";

        setLoading(false);
      }

      const content:
        ShareContent = {
        message:
          stripHtmlTags(
            item?.body
          ),
        url:
          uri,
      };

      Share.share(
        content
      );
    };

  const onDownload =
    async () => {
      if (
        !item?.file
      ) {
        Alert.alert(
          "Post",
          "Media bulunamadı."
        );
        return;
      }

      setLoading(true);

      const savedPath =
        await downloadFileAsync(
          getSupabaseFileUrl(
            item.file
          )?.uri ||
            ""
        );

      setLoading(false);

      console.log(
        "Downloaded file path:",
        savedPath
      );
    };

  const onDeletingPost =
    async () => {
      setLoadingDeletingPost(
        true
      );

      const result =
        await removePost(
          item.id
        );

      if (
        result.success
      ) {
        router.replace(
          "/home"
        );
      } else {
        Alert.alert(
          "Post",
          result.message
        );
      }

      setLoadingDeletingPost(
        false
      );
    };

  const onDeletePost =
    async () => {
      Alert.alert(
        "Bài viết",
        "Bài viết này sẽ bị xóa vĩnh viễn!",
        [
          {
            text: "Hủy",
            style:
              "cancel",
          },
          {
            text: "Xóa",
            style:
              "destructive",
            onPress:
              onDeletingPost,
          },
        ]
      );
    };

  const openProfile =
    () => {
      router.push({
        pathname:
          "/profile",
        params: {
          userId:
            item.userId,
        },
      });
    };

  return (
    <View
      style={[
        styles.container,
        hasShadow &&
          POST_SHADOW_STYLES,
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.userInfo
          }
        >
          <TouchableOpacity
            onPress={
              openProfile
            }
          >
            <Avatar
              size={hp(4.5)}
              uri={
                item?.user
                  ?.image
              }
              rounded={
                theme.radius
                  .md
              }
            />
          </TouchableOpacity>

          <View
            style={{
              gap: 2,
            }}
          >
            <TouchableOpacity
              onPress={
                openProfile
              }
            >
              <Text
                style={
                  styles.username
                }
              >
                {
                  item?.user
                    ?.name
                }
              </Text>
            </TouchableOpacity>

            <Text
              style={
                styles.postTime
              }
            >
              {getFormattedDate(
                item.created_at
              )}
            </Text>
          </View>
        </View>

        {disableBackIcon ? (
          <TouchableOpacity
            onPress={
              openPostDetails
            }
          >
            <Icon
              name="tokenCircle"
              size={hp(3.4)}
              strokeWidth={2}
              color={
                theme.colors
                  .primary
              }
            />
          </TouchableOpacity>
        ) : (
          <View
            style={
              styles.actions
            }
          >
            {isPostOwner && (
              loadingDeletingPost ? (
                <Loading />
              ) : (
                <TouchableOpacity
                  onPress={
                    onDeletePost
                  }
                >
                  <Icon
                    name="delete"
                    size={
                      hp(
                        3.4
                      )
                    }
                    color={
                      theme.colors
                        .rose
                    }
                  />
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              onPress={() =>
                router.replace(
                  "/home"
                )
              }
            >
              <Icon
                name="backward"
                size={
                  hp(3.4)
                }
                color={
                  theme.colors
                    .text
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View
        style={
          styles.content
        }
      >
        <View
          style={
            styles.postBody
          }
        >
          <RenderHtml
            contentWidth={wp(
              100
            )}
            source={{
              html:
                item?.body ||
                "",
            }}
            tagsStyles={
              POST_TAGS_STYLES
            }
          />
        </View>

        {item?.file &&
          item.file.includes(
            SUPABASE_FOLDER_NAME.IMAGE
          ) && (
            <Image
              source={
                getSupabaseFileUrl(
                  item.file
                )
              }
              transition={100}
              style={
                styles.postMedia
              }
              contentFit="cover"
            />
          )}

        {item?.file &&
          item.file.includes(
            SUPABASE_FOLDER_NAME.VIDEO
          ) && (
            <Video
              style={[
                styles.postMedia,
                {
                  height:
                    hp(30),
                },
              ]}
              source={{
                uri:
                  getSupabaseFileUrl(
                    item.file
                  )?.uri ||
                  "",
              }}
              shouldPlay={false}
              isMuted
              useNativeControls
              isLooping={false}
              resizeMode={
                ResizeMode.COVER
              }
            />
          )}
      </View>

      <View
        style={
          styles.footer
        }
      >
        <View
          style={
            styles.footerButton
          }
        >
          <TouchableOpacity
            disabled={
              likeRequestLoading
            }
            onPress={
              isLiked
                ? onRemoveLike
                : onLike
            }
          >
            <Icon
              name="heart"
              size={24}
              color={
                isLiked
                  ? theme.colors
                      .rose
                  : "#FFFFFF"
              }
              fill={
                isLiked
                  ? theme.colors
                      .rose
                  : "transparent"
              }
            />
          </TouchableOpacity>

          <Text
            style={
              styles.count
            }
          >
            {likeCount}
          </Text>
        </View>

        <View
          style={
            styles.footerButton
          }
        >
          <TouchableOpacity
            onPress={
              onComment
            }
            disabled={
              disableMoreIcon
            }
          >
            <Icon
              name="comment"
              size={24}
              color={
                theme.colors
                  .textLight
              }
            />
          </TouchableOpacity>

          <Text
            style={
              styles.count
            }
          >
            {comments.length}
          </Text>
        </View>

        <TouchableOpacity
          onPress={
            onShare
          }
        >
          <Icon
            name="share"
            size={24}
            color={
              theme.colors
                .textLight
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            onDownload
          }
        >
          <Icon
            name="download"
            size={24}
            color={
              theme.colors
                .textLight
            }
          />
        </TouchableOpacity>

        {loading && (
          <View
            style={
              styles.overlay
            }
          >
            <Loading />
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(
  PostCard,
  (previous, next) => {
    return (
      previous.item.id ===
        next.item.id &&
      previous.item.body ===
        next.item.body &&
      previous.item.file ===
        next.item.file &&
      previous.item.created_at ===
        next.item.created_at &&
      previous.item.isLikeOwner ===
        next.item.isLikeOwner &&
      (
        previous.item.postLikes?.length ||
        0
      ) ===
        (
          next.item.postLikes?.length ||
          0
        ) &&
      previous.currentUser?.id ===
        next.currentUser?.id
    );
  }
);

const styles =
  StyleSheet.create({
  container: {
    backgroundColor:
      theme.colors.card,
    borderWidth: 1,
    borderColor:
      theme.colors.gray,
    borderRadius:
      theme.radius.xl,
    marginHorizontal:
      wp(4),
    marginBottom:
      hp(1.3),
    overflow:
      "hidden",
  },

  header: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    paddingHorizontal:
      wp(4),
    paddingTop:
      hp(1.5),
    paddingBottom:
      hp(1),
  },

  userInfo: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 10,
    flex: 1,
  },

  userTextBlock: {
    gap: 2,
    flexShrink: 1,
  },

  username: {
    fontSize:
      hp(1.6),
    fontWeight:
      theme.fonts.semibold,
    color:
      theme.colors.text,
  },

  postTime: {
    fontSize:
      hp(1.3),
    color:
      "#94A3B8",
  },

  actions: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 12,
  },

  content: {
    paddingHorizontal:
      wp(4),
  },

  postBody: {
    marginBottom:
      hp(1.2),
  },

  postMedia: {
    width: "100%",
    height:
      hp(34),
    borderRadius:
      theme.radius.lg,
    marginBottom:
      hp(1.2),
    backgroundColor:
      theme.colors.background,
  },

  footer: {
    minHeight: 58,
    flexDirection:
      "row",
    alignItems:
      "center",
    gap:
      wp(6),
    paddingHorizontal:
      wp(4),
    borderTopWidth: 1,
    borderTopColor:
      theme.colors.gray,
    position:
      "relative",
    backgroundColor:
      theme.colors.card,
  },

  footerButton: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 6,
    minHeight:
      44,
  },

  footerAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  count: {
    fontSize:
      hp(1.5),
    color:
      "#CBD5E1",
  },

  overlay: {
    position:
      "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      "rgba(15,23,42,0.72)",
  },
})

