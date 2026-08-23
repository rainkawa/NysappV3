import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { hp, wp } from "@/helpers/common";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import {
  getPosts,
  PostViewer,
  numPostsReturn,
} from "@/services/postService";
import PostCard from "@/components/PostCard";
import Loading from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import { getUserData } from "@/services/userService";
import { getNotifications } from "@/services/notificationService";
import BottomNav from "@/components/BottomNav";
import StoryBar from "@/components/StoryBar";

const home = () => {
  const authContext = useAuth();
  const router = useRouter();

  if (!authContext) {
    console.error("AuthContext is not found");
    return null;
  }

  const { user } = authContext;
  const userId = user?.authInfo?.id;

  const [posts, setPosts] = useState<PostViewer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [nofiCount, setNotiCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadingMoreRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPosts = useCallback(
    async (targetPage: number, replace = false) => {
      if (!userId) {
        return false;
      }

      if (!replace && loadingMoreRef.current) {
        return false;
      }

      if (!replace && posts.length === 0) {
        return false;
      }

      if (!replace && !hasMore) {
        return false;
      }

      if (!replace) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setInitialLoading(true);
      }

      try {
        const res = await getPosts(targetPage, userId);

        if (!res.success) {
          console.warn(
            `Home - getPosts failed: ${res.message}`
          );
          return false;
        }

        const newPosts: PostViewer[] = res.data || [];

        if (!mountedRef.current) {
          return false;
        }

        if (replace) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(
              prev.map((item) => item.id)
            );

            const uniqueNewPosts = newPosts.filter(
              (item) => !existingIds.has(item.id)
            );

            return [...prev, ...uniqueNewPosts];
          });
        }

        setPage(targetPage);
        setHasMore(newPosts.length === numPostsReturn);

        return true;
      } catch (error) {
        console.warn(
          "Home - loadPosts error:",
          error
        );
        return false;
      } finally {
        if (!mountedRef.current) {
          return;
        }

        if (replace) {
          setInitialLoading(false);
        } else {
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [hasMore, posts.length, userId]
  );

  const onRefresh = useCallback(async () => {
    if (!userId || refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      const res = await getPosts(1, userId);

      if (!res.success) {
        console.warn(
          `Home - Refresh failed: ${res.message}`
        );
        return;
      }

      const newPosts: PostViewer[] = res.data || [];

      if (!mountedRef.current) {
        return;
      }

      setPosts(newPosts);
      setPage(1);
      setHasMore(newPosts.length === numPostsReturn);
    } catch (error) {
      console.warn(
        "Home - Refresh network error:",
        error
      );
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshing, userId]);

  const gettingNotifications = useCallback(async () => {
    if (!userId) {
      return;
    }

    const res = await getNotifications(userId, false);

    if (res.success) {
      setNotiCount(res.data?.length || 0);
    } else {
      console.warn(
        `Notification - ${res.message}`
      );
    }
  }, [userId]);

  const handlePostEvent = useCallback(
    async (payload: any) => {
      if (
        payload?.eventType !== "INSERT" ||
        !payload?.new?.id
      ) {
        return;
      }

      const newPost: PostViewer = {
        ...payload.new,
      };

      const res = await getUserData(newPost.userId);

      newPost.user = res.success
        ? res.data
        : ({} as any);

      newPost.comments = [];
      newPost.postLikes = [];
      newPost.isLikeOwner = false;

      if (!mountedRef.current) {
        return;
      }

      setPosts((prevPosts) => {
        if (
          prevPosts.some(
            (post) => post.id === newPost.id
          )
        ) {
          return prevPosts;
        }

        return [newPost, ...prevPosts];
      });
    },
    []
  );

  const handleCommentEvent = useCallback(
    async (payload: any) => {
      if (
        !payload?.eventType ||
        !payload?.new?.id
      ) {
        return;
      }

      const comment = payload.new;
      const postId = comment.postId;

      if (!postId) {
        return;
      }

      if (payload.eventType === "INSERT") {
        const res = await getUserData(comment.userId);

        const commentWithUser = {
          ...comment,
          user: res.success
            ? res.data
            : {
                id: comment.userId,
                name: "Unknown",
                image: null,
              },
        };

        if (!mountedRef.current) {
          return;
        }

        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) {
              return post;
            }

            const alreadyExists =
              post.comments?.some(
                (item) => item.id === comment.id
              );

            if (alreadyExists) {
              return post;
            }

            return {
              ...post,
              comments: [
                ...(post.comments || []),
                commentWithUser,
              ],
            };
          })
        );
      }

      if (payload.eventType === "DELETE") {
        if (!mountedRef.current) {
          return;
        }

        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) {
              return post;
            }

            return {
              ...post,
              comments: (
                post.comments || []
              ).filter(
                (item) => item.id !== comment.id
              ),
            };
          })
        );
      }
    },
    []
  );

  const handleLikeEvent = useCallback(
    (payload: any) => {
      if (
        !payload?.eventType ||
        !payload?.new
      ) {
        return;
      }

      const like = payload.new;
      const postId = like.postId;

      if (!postId || !like.id) {
        return;
      }

      if (payload.eventType === "INSERT") {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) {
              return post;
            }

            const alreadyExists =
              post.postLikes?.some(
                (item) => item.id === like.id
              );

            if (alreadyExists) {
              return post;
            }

            return {
              ...post,
              postLikes: [
                ...(post.postLikes || []),
                {
                  id: like.id,
                  userId: like.userId,
                },
              ],
              isLikeOwner:
                like.userId === userId
                  ? true
                  : post.isLikeOwner,
            };
          })
        );
      }

      if (payload.eventType === "DELETE") {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) {
              return post;
            }

            const remainingLikes = (
              post.postLikes || []
            ).filter(
              (item) => item.id !== like.id
            );

            return {
              ...post,
              postLikes: remainingLikes,
              isLikeOwner:
                like.userId === userId
                  ? false
                  : post.isLikeOwner,
            };
          })
        );
      }
    },
    [userId]
  );

  const handleNotificationEvent = useCallback(
    async (payload: any) => {
      if (
        payload?.eventType === "INSERT" &&
        payload?.new?.id
      ) {
        setNotiCount((prev) => prev + 1);
      }

      if (
        payload?.eventType === "UPDATE" &&
        payload?.new?.seen
      ) {
        setNotiCount((prev) =>
          Math.max(0, prev - 1)
        );
      }
    },
    []
  );

  const handleLikeChange = useCallback(
    (
      postId: string,
      likeId: string | null,
      changedUserId: string,
      liked: boolean
    ) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const currentLikes =
            post.postLikes || [];

          if (liked) {
            const existingIndex =
              currentLikes.findIndex(
                (like) =>
                  like.userId === changedUserId
              );

            if (existingIndex !== -1) {
              const updatedLikes = [
                ...currentLikes,
              ];

              if (likeId) {
                updatedLikes[existingIndex] = {
                  ...updatedLikes[existingIndex],
                  id: likeId,
                };
              }

              return {
                ...post,
                postLikes: updatedLikes,
                isLikeOwner:
                  changedUserId === userId
                    ? true
                    : post.isLikeOwner,
              };
            }

            return {
              ...post,
              postLikes: [
                ...currentLikes,
                {
                  id:
                    likeId ||
                    `local-${changedUserId}-${postId}`,
                  userId: changedUserId,
                },
              ],
              isLikeOwner:
                changedUserId === userId
                  ? true
                  : post.isLikeOwner,
            };
          }

          /*
           * UNLIKE:
           * Realtime DELETE'i beklemeden Home state'inden
           * kullanıcının like'ını hemen kaldırıyoruz.
           */
          return {
            ...post,
            postLikes: currentLikes.filter(
              (like) =>
                like.userId !== changedUserId
            ),
            isLikeOwner:
              changedUserId === userId
                ? false
                : post.isLikeOwner,
          };
        })
      );
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }

      /*
       * Profile/new screen gibi başka bir ekrandan Home'a
       * dönüldüğünde mevcut ilk sayfadaki verileri sessizce
       * yeniden çekiyoruz.
       *
       * Böylece Profile'dan yapılan like/unlike işlemi
       * Home'a dönüldüğünde refresh gerektirmeden görünür.
       */
      loadPosts(1, true);
      gettingNotifications();
    }, [
      userId,
      loadPosts,
      gettingNotifications,
    ])
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    loadPosts(1, true);
    gettingNotifications();

    const postsChannel = supabase
      .channel("posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        handlePostEvent
      )
      .subscribe();

    const commentsChannel = supabase
      .channel("comments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
        },
        handleCommentEvent
      )
      .subscribe();

    const likesChannel = supabase
      .channel("postLikes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "postLikes",
        },
        handleLikeEvent
      )
      .subscribe();

    const notificationChannel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `receiverId=eq.${userId}`,
        },
        handleNotificationEvent
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [
    userId,
    loadPosts,
    gettingNotifications,
    handlePostEvent,
    handleCommentEvent,
    handleLikeEvent,
    handleNotificationEvent,
  ]);

  const handleEndReached = useCallback(async () => {
    if (posts.length === 0) {
      return;
    }

    if (refreshing) {
      return;
    }

    if (initialLoading) {
      return;
    }

    if (loadingMore) {
      return;
    }

    if (loadingMoreRef.current) {
      return;
    }

    if (!hasMore) {
      return;
    }

    await loadPosts(page + 1, false);
  }, [
    hasMore,
    initialLoading,
    loadPosts,
    loadingMore,
    page,
    posts.length,
    refreshing,
  ]);

  return (
    <ScreenWarpper autoDismissKeyboard={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            ShareBook
          </Text>

          <Pressable
            onPress={() =>
              router.push(
                "/notifications"
              )
            }
            hitSlop={10}
            style={
              styles.notificationButton
            }
          >
            <Icon
              name="notification"
              size={hp(3.1)}
              strokeWidth={1.6}
              color={
                theme.colors.text
              }
            />

            {nofiCount > 0 && (
              <View
                style={styles.pill}
              >
                <Text
                  style={
                    styles.pillText
                  }
                >
                  {nofiCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <FlatList
          data={posts}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listStyle}
          ListHeaderComponent={
            <StoryBar />
          }
          keyExtractor={(item) =>
            item.id.toString()
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <PostCard
              item={item}
              currentUser={user?.userData}
              router={router}
              onLikeChange={handleLikeChange}
            />
          )}
          ListEmptyComponent={
            !initialLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Henüz gönderi yok
                </Text>
                <Text style={styles.emptySubText}>
                  İlk gönderiyi sen paylaşabilirsin.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View
                style={styles.footerLoading}
              >
                <Loading size="small" />
              </View>
            ) : posts.length > 0 &&
              !hasMore ? (
              <View style={styles.endMessage}>
                <Text style={styles.noPost}>
                  Bütün gönderileri gördün
                </Text>
              </View>
            ) : null
          }
          onEndReachedThreshold={0.5}
          onEndReached={handleEndReached}
        />
      </View>

      <BottomNav />

      {initialLoading &&
        posts.length === 0 && (
          <View style={styles.initialLoading}>
            <Loading size="large" />
          </View>
        )}
    </ScreenWarpper>
  );
};

export default home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    marginHorizontal: 0,
  },
  header: {
    width: "100%",
    minHeight: hp(7),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(5),
    backgroundColor: "white",
  },

  notificationButton: {
    width: hp(4.5),
    height: hp(4.5),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  title: {
    color: theme.colors.text,
    fontSize: hp(3.2),
    fontWeight: theme.fonts.bold,
  },

  icons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },

  listStyle: {
    flexGrow: 1,
    paddingTop: 10,
    paddingHorizontal: 0,
    paddingBottom: hp(10),
  },

  emptyContainer: {
    flex: 1,
    minHeight: hp(50),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(8),
  },

  emptyText: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    textAlign: "center",
  },

  emptySubText: {
    marginTop: 8,
    fontSize: hp(1.6),
    color: theme.colors.gray,
    textAlign: "center",
  },

  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  endMessage: {
    paddingVertical: 25,
    alignItems: "center",
  },

  noPost: {
    fontSize: hp(1.8),
    textAlign: "center",
    color: theme.colors.text,
  },

  initialLoading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: hp(12),
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },

  pill: {
    position: "absolute",
    right: -10,
    top: -4,
    height: hp(2.2),
    width: hp(2.2),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor:
      theme.colors.roseLight,
    borderColor: theme.colors.gray,
    borderWidth: 1,
  },

  pillText: {
    color: "white",
    fontSize: hp(1.2),
    fontWeight: theme.fonts.bold,
  },
});
