import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { hp, wp } from "@/helpers/common";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import { getPosts, PostViewer } from "@/services/postService";
import PostCard from "@/components/PostCard";
import Loading from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import { getUserData } from "@/services/userService";
import { getNotifications } from "@/services/notificationService";

const home = () => {
  const authContext = useAuth();
  const router = useRouter();

  if (!authContext) {
    console.error("AuthContext is not found");
    return null;
  }

  const { user } = authContext;

  const [posts, setPosts] = useState<PostViewer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [nofiCount, setNotiCount] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadingMoreRef = useRef(false);

  const loadPosts = useCallback(
    async (targetPage: number, replace = false) => {
      if (!user?.authInfo?.id) {
        return;
      }

      if (loadingMoreRef.current && !replace) {
        return;
      }

      loadingMoreRef.current = true;

      if (replace) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await getPosts(
          targetPage,
          user.authInfo.id
        );

        if (!res.success) {
          Alert.alert("Home", "Error while getting posts");
          return;
        }

        const newPosts: PostViewer[] = res.data || [];

        if (replace) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueNewPosts = newPosts.filter(
              (item) => !existingIds.has(item.id)
            );

            return [...prev, ...uniqueNewPosts];
          });
        }

        setPage(targetPage);

        // Sayfadaki kayıt sayısı 0 ise daha fazla veri yok.
        // Tam sayfa geldiyse bir sonraki sayfa olabilir.
        setHasMore(newPosts.length > 0);
      } catch (error) {
        console.warn("Home - loadPosts error:", error);
        Alert.alert("Home", "Error while getting posts");
      } finally {
        if (replace) {
          setInitialLoading(false);
        } else {
          setLoadingMore(false);
        }

        loadingMoreRef.current = false;
      }
    },
    [user?.authInfo?.id]
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setHasMore(true);

    try {
      await loadPosts(1, true);
      setPage(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadPosts, refreshing]);

  const gettingNotifications = useCallback(async () => {
    if (!user?.authInfo?.id) {
      return;
    }

    const res = await getNotifications(
      user.authInfo.id,
      false
    );

    if (res.success) {
      setNotiCount(res.data?.length || 0);
    } else {
      console.warn(
        `Notification - ${res.message}`
      );
    }
  }, [user?.authInfo?.id]);

  const handlePostEvent = useCallback(async (payload: any) => {
    if (
      payload?.eventType === "INSERT" &&
      payload?.new?.id
    ) {
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

      setPosts((prevPosts) => {
        if (prevPosts.some((post) => post.id === newPost.id)) {
          return prevPosts;
        }

        return [newPost, ...prevPosts];
      });
    }
  }, []);

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

  useEffect(() => {
    if (!user?.authInfo?.id) {
      return;
    }

    loadPosts(1, true);
    gettingNotifications();

    const postsChannel = supabase
      .channel("posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        handlePostEvent
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
          filter: `receiverId=eq.${user.authInfo.id}`,
        },
        handleNotificationEvent
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [
    user?.authInfo?.id,
    loadPosts,
    gettingNotifications,
    handlePostEvent,
    handleNotificationEvent,
  ]);

  const handleEndReached = async () => {
    if (
      loadingMore ||
      refreshing ||
      initialLoading ||
      !hasMore
    ) {
      return;
    }

    await loadPosts(page + 1, false);
  };

  return (
    <ScreenWarpper autoDismissKeyboard={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ShareBook</Text>

          <View style={styles.icons}>
            <Pressable
              onPress={() => router.push("/notifications")}
            >
              <Icon
                name="notification"
                size={hp(3.2)}
                strokeWidth={1.5}
                color={theme.colors.text}
              />

              {nofiCount > 0 && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    {nofiCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/newPosts")}
            >
              <Icon
                name="plus"
                size={hp(3.2)}
                strokeWidth={1.5}
                color={theme.colors.text}
              />
            </Pressable>

            <Pressable
              onPress={() => router.push("/profile")}
            >
              <Avatar
                uri={user?.userData?.image}
                size={hp(4.3)}
                rounded={theme.radius.sm}
                style={{ borderWidth: 2 }}
              />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={posts}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listStyle}
          keyExtractor={(item) => item.id.toString()}
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
            />
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <Loading size="small" />
              </View>
            ) : !hasMore && posts.length > 0 ? (
              <View style={styles.endMessage}>
                <Text style={styles.noPost}>
                  Bạn đã xem hết các bài viết
                </Text>
              </View>
            ) : null
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
        />
      </View>

      {initialLoading && posts.length === 0 && (
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
    marginHorizontal: wp(4),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginHorizontal: wp(4),
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
    paddingTop: 10,
    paddingHorizontal: wp(4),
    paddingBottom: 20,
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
    fontSize: hp(2),
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
    backgroundColor: theme.colors.roseLight,
    borderColor: theme.colors.gray,
    borderWidth: 1,
  },

  pillText: {
    color: "white",
    fontSize: hp(1.2),
    fontWeight: theme.fonts.bold,
  },
});
