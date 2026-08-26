import { Router } from "expo-router";
import {
  Alert,
  Share,
  ShareContent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
  Modal,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import React, {
  useEffect,
  useRef,
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

  const lastImageTapRef =
    useRef(0);

  const [
    menuVisible,
    setMenuVisible,
  ] = useState(false);

  const [
    showDoubleTapHeart,
    setShowDoubleTapHeart,
  ] = useState(false);

  const heartScale =
    useRef(
      new Animated.Value(0.35)
    ).current;

  const heartOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    setLikes(
      Array.isArray(
        item?.postLikes
      )
        ? item.postLikes
        : []
    );
  }, [
    item?.postLikes,
  ]);

  useEffect(() => {
    setComments(
      Array.isArray(
        item?.comments
      )
        ? [...item.comments]
        : []
    );
  }, [
    item?.comments,
  ]);

  const isLiked =
    !!likes.some(
      (like) =>
        like?.userId ===
        currentUserId
    );

  const likeCount =
    likes.filter(
      (like) =>
        !!like?.id &&
        !!like?.userId
    ).length;

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

          const withoutDuplicate =
            withoutCurrent.filter(
              (entry) =>
                entry.id !== like.id
            );

          return [
            ...withoutDuplicate,
            like,
          ];
        }
      );
    };

  const showLikeAnimation =
    () => {
      setShowDoubleTapHeart(true);

      heartScale.setValue(0.35);
      heartOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(
          heartScale,
          {
            toValue: 1,
            friction: 5,
            tension: 220,
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          heartOpacity,
          {
            toValue: 1,
            duration: 50,
            easing:
              Easing.out(
                Easing.ease
              ),
            useNativeDriver: true,
          }
        ),
      ]).start(() => {
        Animated.sequence([
          Animated.delay(140),
          Animated.parallel([
            Animated.timing(
              heartOpacity,
              {
                toValue: 0,
                duration: 110,
                useNativeDriver: true,
              }
            ),
            Animated.timing(
              heartScale,
              {
                toValue: 1.2,
                duration: 110,
                useNativeDriver: true,
              }
            ),
          ]),
        ]).start(() => {
          setShowDoubleTapHeart(false);
        });
      });
    };

  const handleDoubleTap =
    async () => {
      showLikeAnimation();

      if (!isLiked) {
        await onLike();
      }
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
        result.data as LocalLike | null;

      updateLikeState(
        true,
        realLike || optimisticLike
      );

      onLikeChange?.(
        item.id,
        realLike?.id || optimisticLike.id,
        currentUserId,
        true
      );
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

  const onEditPost = () => {
    setMenuVisible(false);

    router.push({
      pathname: "/newPosts",
      params: {
        postId: item.id,
      },
    });
  };

  const onOpenPostMenu = () => {
    if (!isPostOwner) return;
    setMenuVisible(true);
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
          <View style={styles.headerRight}>
            {isPostOwner ? (
              <TouchableOpacity
                onPress={onOpenPostMenu}
                hitSlop={10}
              >
                <Icon
                  name="threeDotsHorizontal"
                  size={hp(3.1)}
                  strokeWidth={2}
                  color={theme.colors.textLight}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={openPostDetails}
              >
                <Icon
                  name="tokenCircle"
                  size={hp(3.4)}
                  strokeWidth={2}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.actions}>
            {isPostOwner && (
              loadingDeletingPost ? (
                <Loading />
              ) : (
                <TouchableOpacity
                  onPress={onDeletePost}
                >
                  <Icon
                    name="delete"
                    size={hp(3.4)}
                    color={theme.colors.rose}
                  />
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              onPress={() => router.replace("/home")}
            >
              <Icon
                name="backward"
                size={hp(3.4)}
                color={theme.colors.text}
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
            <Pressable
              onPress={() => {
                const now = Date.now();
                const diff =
                  now - lastImageTapRef.current;

                if (diff < 300) {
                  void handleDoubleTap();
                }

                lastImageTapRef.current = now;
              }}
            >
              <Image
                source={
                  getSupabaseFileUrl(
                    item.file
                  )
                }
                transition={100}
                style={styles.postMedia}
                contentFit="cover"
              />

              {showDoubleTapHeart && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.doubleTapHeart,
                    {
                      opacity:
                        heartOpacity,
                      transform: [
                        {
                          scale:
                            heartScale,
                        },
                      ],
                    },
                  ]}
                >
                  <Icon
                    name="heart"
                    size={86}
                    strokeWidth={1.5}
                    color="#FFFFFF"
                    fill="#FF2D55"
                  />
                </Animated.View>
              )}
            </Pressable>
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
            onPress={onComment}
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
            {
              comments.filter(
                (comment) =>
                  !!comment?.id
              ).length
            }
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

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>
              Gönderi işlemleri
            </Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={onEditPost}
            >
              <Icon
                name="edit"
                size={20}
                color={theme.colors.text}
              />
              <Text style={styles.menuText}>
                Düzenle
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                void onDeletePost();
              }}
            >
              <Icon
                name="delete"
                size={20}
                color={theme.colors.rose}
              />
              <Text
                style={[
                  styles.menuText,
                  { color: theme.colors.rose },
                ]}
              >
                Sil
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuCancelText}>
                Vazgeç
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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

  headerRight: {
    alignItems: "center",
    justifyContent: "center",
  },

  doubleTapHeart: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -43,
    marginTop: -43,
    alignItems: "center",
    justifyContent: "center",
  },

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  menuCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    gap: 8,
  },

  menuTitle: {
    fontSize: hp(2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  menuItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },

  menuText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },

  menuCancel: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  menuCancelText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.textLight,
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

