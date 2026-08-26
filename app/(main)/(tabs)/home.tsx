import Icon from "@/assets/icons";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { hp, wp } from "@/helpers/common";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  memo,
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
  getHomeFeed,
  getPostDetails,
  PostViewer,
  numPostsReturn,
} from "@/services/postService";
import PostCard from "@/components/PostCard";
import Loading from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import { getNotifications } from "@/services/notificationService";
import BottomNav from "@/components/BottomNav";
import StoryBar from "@/components/StoryBar";

const MemoPostCard = memo(PostCard);

const Home = () => {
  const authContext = useAuth();
  const router = useRouter();

  if (!authContext) {
    return null;
  }

  const { user } = authContext;

  const userId =
    user?.authInfo?.id;

  const [posts, setPosts] = useState<PostViewer[]>([]);
  const [feedMode, setFeedMode] = useState<"home" | "loop">("home");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notiCount, setNotiCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const mountedRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const lastLoadRef = useRef(0);
  const focusRefreshRef = useRef(false);
  const lastFeedRefreshRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPosts = useCallback(
    async (
      targetPage: number,
      replace = false,
      force = false
    ) => {
      if (!userId) {
        return false;
      }

      const now = Date.now();

      // Aynı sorgunun peş peşe çalışmasını engelle.
      if (
        !force &&
        replace &&
        now - lastLoadRef.current < 1500
      ) {
        return false;
      }

      if (
        !replace &&
        (loadingMoreRef.current || !hasMore)
      ) {
        return false;
      }

      if (!replace) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setInitialLoading(true);
      }

      lastLoadRef.current = now;

      try {
        if (feedMode === "loop") {
          setPosts([]);
          setPage(1);
          setHasMore(false);
          return true;
        }

        const res = await getHomeFeed(
          targetPage,
          userId
        );

        if (!mountedRef.current) {
          return false;
        }

        if (!res.success) {
          console.warn(
            "Home getPosts:",
            res.message
          );
          return false;
        }

        const incoming: PostViewer[] = Array.isArray(res.data) ? (res.data as PostViewer[]) : [];

        setPosts(previous => {
          if (replace) {
            return incoming;
          }

          const ids = new Set(
            previous.map(item => item.id)
          );

          const unique = incoming.filter((item: PostViewer) => !ids.has(item.id));

          if (!unique.length) {
            return previous;
          }

          return [
            ...previous,
            ...unique,
          ];
        });

        setPage(targetPage);
        setHasMore(
          incoming.length >= numPostsReturn
        );

        return true;
      } catch (error) {
        console.warn(
          "Home loadPosts error:",
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
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [feedMode, hasMore, userId]
  );

  const onRefresh = useCallback(
    async () => {
      if (
        !userId ||
        refreshing ||
        loadingMoreRef.current
      ) {
        return;
      }

      setRefreshing(true);

      try {
        await loadPosts(
          1,
          true,
          true
        );
      } finally {
        if (mountedRef.current) {
          setRefreshing(false);
        }
      }
    },
    [
      loadPosts,
      refreshing,
      userId,
    ]
  );

  const gettingNotifications =
    useCallback(async () => {
      if (!userId) {
        return;
      }

      const res =
        await getNotifications(
          userId,
          false
        );

      if (
        mountedRef.current &&
        res.success
      ) {
        setNotiCount(
          res.data?.length || 0
        );
      }
    }, [userId]);

  const handlePostEvent =
    useCallback(
      async (payload: any) => {
        if (
          payload?.eventType !== "INSERT" ||
          !payload?.new?.id ||
          !userId ||
          feedMode !== "home"
        ) {
          return;
        }

        /*
         * Realtime payload çıplak posts satırıdır.
         * Bununla doğrudan listeye eklersek user,
         * avatar ve like bilgileri eksik kalır.
         *
         * Feed'i yeniden çekerek tam PostViewer
         * üretiyoruz.
         */
        const result =
          await getHomeFeed(
            1,
            userId
          );

        if (
          !result.success ||
          !Array.isArray(
            result.data
          )
        ) {
          return;
        }

        const incoming =
          result.data as PostViewer[];

        setPosts(
          previous => {
            const map =
              new Map(
                previous.map(
                  post => [
                    post.id,
                    post,
                  ]
                )
              );

            for (
              const post of incoming
            ) {
              map.set(
                post.id,
                post
              );
            }

            return Array.from(
              map.values()
            ).sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            );
          }
        );
      },
      [
        feedMode,
        userId,
      ]
    );

  const handleNotificationEvent =
    useCallback(
      (payload: any) => {
        if (
          payload?.eventType ===
            "INSERT" &&
          payload?.new?.id
        ) {
          setNotiCount(
            value => value + 1
          );
        }
      },
      []
    );

  /*
   * -------------------------------------------------------
   * Realtime likes
   * -------------------------------------------------------
   *
   * Like/unlike DB'ye yazıldığı anda ilgili postun
   * gerçek snapshot'ını tekrar alıyoruz.
   *
   * Mevcut optimistic PostCard davranışına dokunmuyoruz.
   */

  const handleLikeRealtimeEvent =
    useCallback(
      async (payload: any) => {
        if (
          !userId ||
          feedMode !== "home"
        ) {
          return;
        }

        const postId =
          payload?.new?.postId ||
          payload?.new?.post_id ||
          payload?.old?.postId ||
          payload?.old?.post_id;

        if (!postId) {
          return;
        }

        const result =
          await getPostDetails(
            String(postId),
            userId
          );

        if (
          !result.success ||
          !result.data ||
          !mountedRef.current
        ) {
          return;
        }

        const freshPost =
          result.data as PostViewer;

        setPosts(previous =>
          previous.map(post =>
            post.id === String(postId)
              ? freshPost
              : post
          )
        );
      },
      [userId, feedMode]
    );

  useEffect(() => {
    if (
      !userId ||
      feedMode !== "home"
    ) {
      return;
    }

    const likesChannel =
      supabase
        .channel(
          `home-likes-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "postLikes",
          },
          handleLikeRealtimeEvent
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        likesChannel
      );
    };
  }, [
    userId,
    feedMode,
    handleLikeRealtimeEvent,
  ]);

  const handleLikeChange =
    useCallback(
      async (
        postId: string,
        _likeId: string | null,
        _changedUserId: string,
        _liked: boolean
      ) => {
        if (!userId) {
          return;
        }

        const result =
          await getPostDetails(
            postId,
            userId
          );

        if (
          !result.success ||
          !result.data
        ) {
          return;
        }

        const freshPost =
          result.data as PostViewer;

        setPosts(
          previous =>
            previous.map(
              post =>
                post.id === postId
                  ? freshPost
                  : post
            )
        );
      },
      [userId]
    );

  /*
   * -------------------------------------------------------
   * Realtime comments
   * -------------------------------------------------------
   *
   * Yorum DB'ye yazıldığı anda ilgili postu tekrar çekiyoruz.
   * Böylece Home'daki comments dizisi ve yorum sayısı
   * refresh beklemeden güncelleniyor.
   */

  const handleCommentEvent =
    useCallback(
      async (payload: any) => {
        if (
          !userId ||
          feedMode !== "home"
        ) {
          return;
        }

        const postId =
          payload?.new?.postId ||
          payload?.new?.post_id ||
          payload?.old?.postId ||
          payload?.old?.post_id;

        if (!postId) {
          return;
        }

        const result =
          await getPostDetails(
            String(postId),
            userId
          );

        if (
          !result.success ||
          !result.data ||
          !mountedRef.current
        ) {
          return;
        }

        const freshPost =
          result.data as PostViewer;

        setPosts(previous =>
          previous.map(post =>
            post.id === String(postId)
              ? freshPost
              : post
          )
        );
      },
      [userId, feedMode]
    );

  useEffect(() => {
    if (
      !userId ||
      feedMode !== "home"
    ) {
      return;
    }

    const commentsChannel =
      supabase
        .channel(
          `home-comments-${userId}`
        )
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

    return () => {
      supabase.removeChannel(
        commentsChannel
      );
    };
  }, [
    userId,
    feedMode,
    handleCommentEvent,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }

      const now = Date.now();

      const shouldRefresh =
        !focusRefreshRef.current ||
        now -
          lastFeedRefreshRef.current >=
          30_000;

      if (!shouldRefresh) {
        return;
      }

      focusRefreshRef.current = true;
      lastFeedRefreshRef.current = now;

      if (feedMode === "loop") {
        setPosts([]);
        setHasMore(false);
      } else {
        void loadPosts(1, true);
      }

      void gettingNotifications();
    }, [
      gettingNotifications,
      feedMode,
      loadPosts,
      userId,
    ])
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    const postsChannel =
      supabase
        .channel(
          `home-posts-${userId}`
        )
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

    const notificationsChannel =
      supabase
        .channel(
          `home-notifications-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter:
              `receiverId=eq.${userId}`,
          },
          handleNotificationEvent
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        postsChannel
      );

      supabase.removeChannel(
        notificationsChannel
      );
    };
  }, [
    handleNotificationEvent,
    handlePostEvent,
    userId,
  ]);

  const handleEndReached =
    useCallback(async () => {
      if (
        !posts.length ||
        refreshing ||
        initialLoading ||
        loadingMore ||
        loadingMoreRef.current ||
        !hasMore
      ) {
        return;
      }

      await loadPosts(
        page + 1,
        false
      );
    }, [
      hasMore,
      initialLoading,
      loadPosts,
      loadingMore,
      page,
      posts.length,
      refreshing,
    ]);

  const renderPost =
    useCallback(
      ({
        item,
      }: {
        item: PostViewer;
      }) => (
        <MemoPostCard
          item={item}
          currentUser={
            user?.userData
          }
          router={router}
          onLikeChange={
            handleLikeChange
          }
        />
      ),
      [
        handleLikeChange,
        router,
        user?.userData,
      ]
    );

  return (
    <ScreenWarpper
      autoDismissKeyboard={false}
    >
      <View
        style={styles.container}
      >
        <View
          style={styles.header}
        >
          <View
            style={styles.headerLeft}
          >
            <Text
              style={styles.title}
            >
              Nysapp
            </Text>

            <Text
              style={styles.subtitle}
            >
              Takıl, paylaş, eğlen.
            </Text>
          </View>

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
              size={hp(3)}
              strokeWidth={1.7}
              color={
                theme.colors.text
              }
            />

            {notiCount > 0 && (
              <View
                style={styles.pill}
              >
                <Text
                  style={
                    styles.pillText
                  }
                >
                  {notiCount > 99
                    ? "99+"
                    : notiCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.feedTabs}>
          <Pressable
            onPress={() => {
              if (feedMode === "home") return;

              setFeedMode("home");
              setPage(1);
              setHasMore(true);
              setPosts([]);

              void loadPosts(1, true, true);
            }}
            style={[
              styles.feedTab,
              feedMode === "home" && styles.feedTabActive,
            ]}
          >
            <Text
              style={[
                styles.feedTabText,
                feedMode === "home" && styles.feedTabTextActive,
              ]}
            >
              Anasayfa
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (feedMode === "loop") return;

              setFeedMode("loop");
              setPage(1);
              setHasMore(false);
              setPosts([]);
            }}
            style={[
              styles.feedTab,
              feedMode === "loop" && styles.feedTabActive,
            ]}
          >
            <Text
              style={[
                styles.feedTabText,
                feedMode === "loop" && styles.feedTabTextActive,
              ]}
            >
              Loop
            </Text>
          </Pressable>
        </View>

        {feedMode === "loop" ? (
          <View style={styles.loopEmpty}>
            <Text style={styles.loopEmptyTitle}>
              Loop
            </Text>
            <Text style={styles.loopEmptyText}>
              Yakında burada yeni içerikler olacak.
            </Text>
          </View>
        ) : (
          <FlatList
            data={posts}
          keyExtractor={item =>
            item.id.toString()
          }
          renderItem={renderPost}
          ListHeaderComponent={
            <StoryBar />
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.listStyle
          }
          removeClippedSubviews={
            true
          }
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          onEndReachedThreshold={
            0.25
          }
          onEndReached={
            handleEndReached
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
              tintColor={
                theme.colors.primary
              }
              colors={[
                theme.colors.primary,
              ]}
            />
          }
          ListEmptyComponent={
            !initialLoading ? (
              <View
                style={
                  styles.emptyContainer
                }
              >
                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Henüz hareket yok ✨
                </Text>
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Bir şeyler paylaşarak
                  ortamı başlat.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View
                style={
                  styles.footerLoading
                }
              >
                <Loading size="small" />
              </View>
            ) : null
          }
        />
        )}
      </View>

      <BottomNav />

      {initialLoading &&
        posts.length === 0 && (
          <View
            style={
              styles.initialLoading
            }
          >
            <Loading size="large" />
          </View>
        )}
    </ScreenWarpper>
  );
};

export default Home;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      backgroundColor:
        theme.colors.background,
    },

    header: {
      width: "100%",
      minHeight: hp(8),
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.2),
      backgroundColor:
        theme.colors.background,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        theme.colors.gray,
    },

    headerLeft: {
      flex: 1,
    },

    title: {
      color: theme.colors.text,
      fontSize: hp(2.8),
      fontWeight:
        theme.fonts.extraBold,
      letterSpacing: 0.2,
    },

    subtitle: {
      marginTop: 3,
      color: "#94A3B8",
      fontSize: hp(1.35),
    },

    notificationButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },

    pill: {
      position: "absolute",
      top: 2,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        theme.colors.primary,
    },

    pillText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "700",
    },

    listStyle: {
      paddingBottom: hp(10),
    },

    emptyContainer: {
      paddingTop: hp(8),
      alignItems: "center",
      paddingHorizontal: wp(10),
    },

    emptyTitle: {
      color: theme.colors.text,
      fontSize: hp(2),
      fontWeight: "700",
    },

    emptyText: {
      marginTop: hp(1),
      color: theme.colors.gray,
      textAlign: "center",
    },

    footerLoading: {
      paddingVertical: hp(2),
      alignItems: "center",
    },

    initialLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        theme.colors.background,
    },

    feedTabs: {
      width: "100%",
      flexDirection: "row",
      paddingHorizontal: wp(4),
      marginBottom: hp(1),
      gap: wp(2),
    },

    feedTab: {
      flex: 1,
      minHeight: hp(5),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.gray,
    },

    feedTabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    feedTabText: {
      fontSize: hp(1.55),
      fontWeight: theme.fonts.semibold,
      color: theme.colors.textLight,
    },

    feedTabTextActive: {
      color: "#FFFFFF",
    },

    loopEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: wp(8),
    },

    loopEmptyTitle: {
      fontSize: hp(2.4),
      fontWeight: theme.fonts.bold,
      color: theme.colors.text,
      marginBottom: hp(1),
    },

    loopEmptyText: {
      textAlign: "center",
      fontSize: hp(1.7),
      color: theme.colors.textLight,
    },
  });
