import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import PostCard from "@/components/PostCard";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { SupaUser, useAuth } from "@/contexts/AuthContext";
import {
  hp,
  maskGmail,
  maskPhoneNumber,
  wp,
} from "@/helpers/common";
import { supabase } from "@/lib/supabase";
import {
  getYourPosts,
  PostViewer,
} from "@/services/postService";
import { getUserData } from "@/services/userService";
import {
  Router,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
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
  TouchableOpacity,
  Alert,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";

const Profile = () => {
  const router = useRouter();

  const AuthContext = useAuth();

  if (!AuthContext) {
    console.warn("AuthContext is not found");
    return null;
  }

  const { user: currentUser, setAuth } = AuthContext;

  const [posts, setPosts] = useState<PostViewer[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isShowOtherUser, setIsShowOtherUser] =
    useState(false);
  const [otherUserId, setOtherUserId] =
    useState<string | null>(null);

  const [user, setUser] = useState<
    SupaUser | undefined
  >(currentUser?.userData);

  const params = useLocalSearchParams();

  const pageRef = useRef(0);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const profileUserId =
    otherUserId || currentUser?.userData?.id;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const gettingUserData = useCallback(
    async (userId: string) => {
      const res = await getUserData(userId);

      if (!res.success) {
        Alert.alert(
          "Trang cá nhân",
          "Không tìm thấy người dùng"
        );
        router.push("/home");
        return;
      }

      if (mountedRef.current) {
        setUser(res.data);
      }
    },
    [router]
  );

  const gettingPosts = useCallback(
    async (
      userId: string,
      reset = false
    ) => {
      if (!userId || loadingRef.current) {
        return;
      }

      if (!reset && !hasMore) {
        return;
      }

      loadingRef.current = true;

      const nextPage = reset
        ? 1
        : pageRef.current + 1;

      try {
        const res = await getYourPosts(
          nextPage,
          userId
        );

        if (!mountedRef.current) {
          return;
        }

        if (res.success) {
          const newPosts: PostViewer[] =
            res.data || [];

          if (reset) {
            setPosts(newPosts);
          } else {
            setPosts((prev) => {
              const existingIds = new Set(
                prev.map((item) => item.id)
              );

              return [
                ...prev,
                ...newPosts.filter(
                  (item) =>
                    !existingIds.has(item.id)
                ),
              ];
            });
          }

          pageRef.current = nextPage;
          setHasMore(
            newPosts.length > 0 &&
              newPosts.length >= 5
          );
        } else {
          console.warn(
            `Profile - ${res.message}`
          );
        }
      } finally {
        loadingRef.current = false;
      }
    },
    [hasMore]
  );

  const onRefresh = useCallback(async () => {
    if (!profileUserId || refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      const res = await getYourPosts(
        1,
        profileUserId
      );

      if (!res.success) {
        console.warn(
          `Profile refresh failed: ${res.message}`
        );
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      const newPosts: PostViewer[] =
        res.data || [];

      setPosts(newPosts);
      pageRef.current = 1;
      setHasMore(newPosts.length >= 5);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [profileUserId, refreshing]);

  useEffect(() => {
    const routeUserId =
      params.userId;

    pageRef.current = 0;
    setPosts([]);
    setHasMore(true);

    if (
      routeUserId &&
      typeof routeUserId === "string"
    ) {
      setOtherUserId(routeUserId);
      setIsShowOtherUser(true);

      gettingUserData(routeUserId);
      gettingPosts(routeUserId, true);
    } else if (currentUser?.userData?.id) {
      setOtherUserId(null);
      setIsShowOtherUser(false);
      setUser(currentUser.userData);

      gettingPosts(
        currentUser.userData.id,
        true
      );
    }
  }, [
    params.userId,
    currentUser?.userData?.id,
    gettingUserData,
    gettingPosts,
  ]);

  /*
   * Gerçek zamanlı like senkronizasyonu.
   * Profildeki aynı post anında güncellenir.
   */
  useEffect(() => {
    if (!profileUserId) {
      return;
    }

    const likesChannel = supabase
      .channel(
        `profile-likes-${profileUserId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "postLikes",
        },
        (payload: any) => {
          const like =
            payload?.new ||
            payload?.old;

          if (!like?.postId) {
            return;
          }

          setPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (
                post.id !== like.postId
              ) {
                return post;
              }

              if (
                payload.eventType ===
                "INSERT"
              ) {
                const exists =
                  post.postLikes?.some(
                    (item) =>
                      item.id === like.id
                  );

                if (exists) {
                  return post;
                }

                return {
                  ...post,
                  postLikes: [
                    ...(post.postLikes ||
                      []),
                    {
                      id: like.id,
                      userId:
                        like.userId,
                    },
                  ],
                  isLikeOwner:
                    like.userId ===
                    currentUser?.userData?.id
                      ? true
                      : post.isLikeOwner,
                };
              }

              if (
                payload.eventType ===
                "DELETE"
              ) {
                const nextLikes = (
                  post.postLikes ||
                  []
                ).filter(
                  (item) =>
                    item.id !== like.id
                );

                return {
                  ...post,
                  postLikes: nextLikes,
                  isLikeOwner:
                    like.userId ===
                    currentUser?.userData?.id
                      ? false
                      : post.isLikeOwner,
                };
              }

              return post;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        likesChannel
      );
    };
  }, [
    profileUserId,
    currentUser?.userData?.id,
  ]);

  const onLogout = async () => {
    setIsLoading(true);

    setAuth(null);

    const { error } =
      await supabase.auth.signOut();

    setIsLoading(false);

    if (error) {
      console.warn(
        "Error logging out",
        error
      );

      Alert.alert(
        "Error",
        "Error signing out!"
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Trang cá nhân",
      "Bạn đang đăng xuất đúng chứ?",
      [
        {
          text: "Không phải",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Đúng vậy",
          onPress: () =>
            onLogout(),
          style: "destructive",
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenWarpper autoDismissKeyboard={false}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: hp(4),
              textAlign: "center",
              fontWeight:
                theme.fonts.extraBold,
              marginBottom: hp(10),
            }}
          >
            ShareBook
          </Text>

          <Loading size={60} />
        </View>
      </ScreenWarpper>
    );
  }

  return (
    <ScreenWarpper autoDismissKeyboard={false}>
      <FlatList
        data={posts}
        ListHeaderComponent={
          <UserHeader
            user={user}
            router={router}
            handleLogoutBtn={handleLogout}
            disableEdit={
              otherUserId !== null
            }
            disableLogout={
              otherUserId !== null
            }
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listStyle
        }
        keyExtractor={(item) =>
          item.id.toString()
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={
              theme.colors.primary
            }
            colors={[
              theme.colors.primary,
            ]}
          />
        }
        renderItem={({ item }) => (
          <PostCard
            item={item}
            currentUser={user}
            router={router}
          />
        )}
        ListFooterComponent={
          !hasMore ? (
            <View
              style={{
                marginVertical: 30,
              }}
            >
              <Text
                style={styles.noPosts}
              >
                {posts.length > 0
                  ? "Bạn đã xem hết các bài viết"
                  : "Hãy tạo bài viết đầu tiên nào!"}
              </Text>
            </View>
          ) : (
            <View
              style={{
                marginVertical:
                  posts.length === 0
                    ? 200
                    : 30,
              }}
            >
              <Loading />
            </View>
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (
            profileUserId &&
            !loadingRef.current &&
            hasMore
          ) {
            gettingPosts(
              profileUserId,
              false
            );
          }
        }}
      />
    </ScreenWarpper>
  );
};

const UserHeader = ({
  user,
  router,
  handleLogoutBtn,
  disableEdit = false,
  disableLogout = false,
}: {
  user: SupaUser | undefined;
  router: Router;
  handleLogoutBtn: () => void;
  disableEdit?: boolean;
  disableLogout?: boolean;
}) => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
      }}
    >
      <View
        style={styles.headerContainer}
      >
        <Header
          title="Trang cá nhân"
          marginBottom={30}
        />

        {!disableLogout && (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={
              handleLogoutBtn
            }
          >
            <Icon
              name="logout"
              color={theme.colors.rose}
              strokeWidth={2}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        <View style={{ gap: 15 }}>
          <View
            style={
              styles.avatarContainer
            }
          >
            <Avatar
              uri={user?.image}
              size={hp(12)}
              rounded={
                theme.radius.xxl * 1.4
              }
            />

            {!disableEdit && (
              <Pressable
                style={
                  styles.editIcon
                }
                onPress={() =>
                  router.push(
                    "/editProfile"
                  )
                }
              >
                <Icon
                  name="edit"
                  strokeWidth={2.5}
                  size={20}
                />
              </Pressable>
            )}
          </View>

          <View
            style={{
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text
              style={styles.userName}
            >
              {user?.name ||
                "Chưa cập nhật tên"}
            </Text>

            <Text>
              {user?.address || ""}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <View style={styles.info}>
              <Icon
                name="mail"
                size={20}
                color={
                  theme.colors.textLight
                }
              />

              <Text
                style={styles.infoText}
              >
                {maskGmail(
                  user?.email || ""
                )}
              </Text>
            </View>

            {user?.phoneNumber && (
              <View style={styles.info}>
                <Icon
                  name="call"
                  size={20}
                  color={
                    theme.colors.textLight
                  }
                />

                <Text
                  style={styles.infoText}
                >
                  {maskPhoneNumber(
                    user.phoneNumber
                  )}
                </Text>
              </View>
            )}

            {user?.bio && (
              <View style={styles.info}>
                <Text
                  style={styles.infoText}
                >
                  {user.bio}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View
        style={{
          height: hp(10),
          borderColor:
            theme.colors.dark,
          borderTopWidth: 0.6,
          marginTop: hp(2.6),
          padding: hp(2.6),
        }}
      >
        <Text
          style={{
            alignSelf: "center",
            fontSize: hp(2.6),
            fontWeight:
              theme.fonts.medium,
          }}
        >
          Các bài viết của bạn
        </Text>
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },

  headerContainer: {
    marginBottom: 20,
  },

  avatarContainer: {
    height: hp(12),
    width: hp(12),
    alignSelf: "center",
  },

  editIcon: {
    position: "absolute",
    bottom: 0,
    right: -12,
    padding: 7,
    borderRadius: 50,
    backgroundColor: "white",
    shadowColor:
      theme.colors.textLight,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 7,
  },

  userName: {
    fontSize: hp(3),
    fontWeight: theme.fonts.medium,
    color: theme.colors.textDark,
  },

  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  infoText: {
    fontSize: hp(1.5),
    fontWeight: theme.fonts.medium,
    color: theme.colors.textLight,
  },

  logoutBtn: {
    position: "absolute",
    right: 0,
    padding: 5,
    borderRadius: theme.radius.sm,
    backgroundColor:
      theme.colors.mistyRose,
  },

  listStyle: {
    paddingHorizontal: wp(4),
    paddingBottom: 30,
  },

  noPosts: {
    fontSize: hp(2),
    textAlign: "center",
    color: theme.colors.text,
  },
});
