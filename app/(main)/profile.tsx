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
  createNotification,
  pushNotification,
} from "@/services/notificationService";
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowersCount,
  getFollowingCount,
} from "@/services/followService";
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

const POSTS_PAGE_SIZE = 5;

const Profile = () => {
  const router = useRouter();
  const authContext = useAuth();

  if (!authContext) {
    console.warn(
      "AuthContext is not found"
    );
    return null;
  }

  const {
    user: currentUser,
    setAuth,
  } = authContext;

  const params = useLocalSearchParams();

  const [posts, setPosts] = useState<
    PostViewer[]
  >([]);

  const [hasMore, setHasMore] =
    useState(true);

  const [isLoading, setIsLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [otherUserId, setOtherUserId] =
    useState<string | null>(null);

  const [user, setUser] =
    useState<SupaUser | undefined>(
      currentUser?.userData
    );

  const [isFollowingUser, setIsFollowingUser] =
    useState(false);

  const [followLoading, setFollowLoading] =
    useState(false);

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef =
    useRef(false);
  const mountedRef =
    useRef(true);

  const profileUserId =
    otherUserId ||
    currentUser?.userData?.id;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const gettingUserData =
    useCallback(
      async (userId: string) => {
        const res =
          await getUserData(userId);

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

  const loadFollowData = useCallback(
    async (targetUserId: string) => {
      if (!currentUser?.authInfo?.id) {
        return;
      }

      const [followingRes, followersRes, statusRes] =
        await Promise.all([
          getFollowingCount(targetUserId),
          getFollowersCount(targetUserId),
          isFollowing(
            currentUser.authInfo.id,
            targetUserId
          ),
        ]);

      if (!mountedRef.current) {
        return;
      }

      if (followingRes.success) {
        setFollowingCount(
          followingRes.data || 0
        );
      }

      if (followersRes.success) {
        setFollowersCount(
          followersRes.data || 0
        );
      }

      if (statusRes.success) {
        setIsFollowingUser(
          !!statusRes.data
        );
      }
    },
    [currentUser?.authInfo?.id]
  );

  const handleFollowToggle = useCallback(
    async () => {
      const followerId =
        currentUser?.authInfo?.id;

      if (
        !followerId ||
        !profileUserId ||
        followerId === profileUserId ||
        followLoading
      ) {
        return;
      }

      setFollowLoading(true);

      const wasFollowing = isFollowingUser;

      setIsFollowingUser(!wasFollowing);

      setFollowersCount((prev) =>
        wasFollowing
          ? Math.max(0, prev - 1)
          : prev + 1
      );

      try {
        const result = wasFollowing
          ? await unfollowUser(
              followerId,
              profileUserId
            )
          : await followUser(
              followerId,
              profileUserId
            );

        if (
          result.success &&
          !wasFollowing
        ) {
          const notificationResult =
            await createNotification({
              senderId: followerId,
              receiverId: profileUserId,
              title:
                "Yeni takipçi",
              data: JSON.stringify({
                type: "follow",
                followerId,
                followingId:
                  profileUserId,
              }),
            });

          if (
            notificationResult.success
          ) {
            /*
             * Profil verisinden hedef kullanıcının
             * Expo token'ını ayrıca alıp push göndermek
             * sonraki aşamada ayrı servisle yapılabilir.
             *
             * Önce database notification kesin olarak
             * çalışsın.
             */
          }
        }

        if (!result.success) {
          setIsFollowingUser(
            wasFollowing
          );

          setFollowersCount((prev) =>
            wasFollowing
              ? prev + 1
              : Math.max(0, prev - 1)
          );

          Alert.alert(
            "Takip",
            result.message
          );
        }
      } catch (error) {
        setIsFollowingUser(
          wasFollowing
        );

        setFollowersCount((prev) =>
          wasFollowing
            ? prev + 1
            : Math.max(0, prev - 1)
        );

        Alert.alert(
          "Takip",
          "Takip işlemi başarısız"
        );
      } finally {
        setFollowLoading(false);
      }
    },
    [
      currentUser?.authInfo?.id,
      followLoading,
      isFollowingUser,
      profileUserId,
    ]
  );

  const gettingPosts =
    useCallback(
      async (
        targetUserId: string,
        reset = false
      ) => {
        if (
          !targetUserId ||
          loadingRef.current
        ) {
          return;
        }

        if (
          !reset &&
          !hasMoreRef.current
        ) {
          return;
        }

        loadingRef.current =
          true;

        const nextPage = reset
          ? 1
          : pageRef.current + 1;

        try {
          const res =
            await getYourPosts(
              nextPage,
              targetUserId
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          if (!res.success) {
            console.warn(
              `Profile - ${res.message}`
            );
            return;
          }

          const newPosts: PostViewer[] =
            res.data || [];

          if (reset) {
            setPosts(newPosts);
          } else {
            setPosts((prev) => {
              const existingIds =
                new Set(
                  prev.map(
                    (item) => item.id
                  )
                );

              return [
                ...prev,
                ...newPosts.filter(
                  (item) =>
                    !existingIds.has(
                      item.id
                    )
                ),
              ];
            });
          }

          pageRef.current =
            nextPage;

          const moreAvailable =
            newPosts.length ===
            POSTS_PAGE_SIZE;

          hasMoreRef.current =
            moreAvailable;

          setHasMore(
            moreAvailable
          );
        } catch (error) {
          console.warn(
            "Profile - gettingPosts error:",
            error
          );
        } finally {
          loadingRef.current =
            false;
        }
      },
      []
    );

  const onRefresh =
    useCallback(async () => {
      if (
        !profileUserId ||
        refreshing
      ) {
        return;
      }

      setRefreshing(true);

      try {
        const res =
          await getYourPosts(
            1,
            profileUserId
          );

        if (!res.success) {
          console.warn(
            `Profile refresh failed: ${res.message}`
          );
          return;
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        const newPosts: PostViewer[] =
          res.data || [];

        setPosts(newPosts);
        pageRef.current = 1;

        const moreAvailable =
          newPosts.length ===
          POSTS_PAGE_SIZE;

        hasMoreRef.current =
          moreAvailable;

        setHasMore(
          moreAvailable
        );
      } catch (error) {
        console.warn(
          "Profile - refresh error:",
          error
        );
      } finally {
        if (
          mountedRef.current
        ) {
          setRefreshing(false);
        }
      }
    }, [
      profileUserId,
      refreshing,
    ]);

  useEffect(() => {
    const routeUserId =
      typeof params.userId ===
      "string"
        ? params.userId
        : null;

    /*
     * Bu effect yalnızca route userId
     * veya mevcut auth user değiştiğinde
     * çalışır.
     *
     * gettingPosts dependency değil;
     * böylece hasMore değişimi sonsuz
     * refresh döngüsü oluşturamaz.
     */
    if (routeUserId) {
      if (
        otherUserId !==
        routeUserId
      ) {
        setOtherUserId(
          routeUserId
        );
      }

      setUser(
        currentUser?.userData
      );

      pageRef.current = 0;
      hasMoreRef.current = true;
      setPosts([]);
      setHasMore(true);

      gettingUserData(
        routeUserId
      );

      loadFollowData(
        routeUserId
      );

      gettingPosts(
        routeUserId,
        true
      );

      return;
    }

    const currentUserId =
      currentUser?.userData?.id;

    if (!currentUserId) {
      return;
    }

    if (otherUserId !== null) {
      setOtherUserId(null);
    }

    setUser(
      currentUser.userData
    );

    pageRef.current = 0;
    hasMoreRef.current = true;
    setPosts([]);
    setHasMore(true);

    loadFollowData(
      currentUserId
    );

    gettingPosts(
      currentUserId,
      true
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.userId,
    currentUser?.userData?.id,
    gettingUserData,
    loadFollowData,
  ]);

  const handleLikeChange =
    useCallback(
      (
        postId: string,
        likeId: string | null,
        changedUserId: string,
        liked: boolean
      ) => {
        setPosts(
          (prevPosts) =>
            prevPosts.map(
              (post) => {
                if (
                  post.id !==
                  postId
                ) {
                  return post;
                }

                const currentLikes =
                  post.postLikes ||
                  [];

                if (liked) {
                  const existingIndex =
                    currentLikes.findIndex(
                      (like) =>
                        like.userId ===
                        changedUserId
                    );

                  if (
                    existingIndex !==
                    -1
                  ) {
                    if (
                      likeId &&
                      currentLikes[
                        existingIndex
                      ].id !==
                        likeId
                    ) {
                      const updatedLikes =
                        [
                          ...currentLikes,
                        ];

                      updatedLikes[
                        existingIndex
                      ] = {
                        ...updatedLikes[
                          existingIndex
                        ],
                        id: likeId,
                      };

                      return {
                        ...post,
                        postLikes:
                          updatedLikes,
                        isLikeOwner:
                          changedUserId ===
                          currentUser?.userData
                            ?.id
                            ? true
                            : post.isLikeOwner,
                      };
                    }

                    return {
                      ...post,
                      isLikeOwner:
                        changedUserId ===
                        currentUser?.userData
                          ?.id
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
                        userId:
                          changedUserId,
                      },
                    ],
                    isLikeOwner:
                      changedUserId ===
                      currentUser?.userData
                        ?.id
                        ? true
                        : post.isLikeOwner,
                  };
                }

                return {
                  ...post,
                  postLikes:
                    currentLikes.filter(
                      (like) =>
                        like.userId !==
                        changedUserId
                    ),
                  isLikeOwner:
                    changedUserId ===
                    currentUser?.userData
                      ?.id
                      ? false
                      : post.isLikeOwner,
                };
              }
            )
        );
      },
      [
        currentUser?.userData
          ?.id,
      ]
    );

  useEffect(() => {
    if (!profileUserId) {
      return;
    }

    const likesChannel =
      supabase
        .channel(
          `profile-likes-${profileUserId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "postLikes",
          },
          (payload: any) => {
            const like =
              payload?.new;

            if (
              !like?.id ||
              !like?.postId ||
              !like?.userId
            ) {
              return;
            }

            setPosts(
              (prevPosts) =>
                prevPosts.map(
                  (post) => {
                    if (
                      post.id !==
                      like.postId
                    ) {
                      return post;
                    }

                    const likes =
                      post.postLikes ||
                      [];

                    const alreadyExists =
                      likes.some(
                        (item) =>
                          item.id ===
                            like.id ||
                          item.userId ===
                            like.userId
                      );

                    if (
                      alreadyExists
                    ) {
                      return post;
                    }

                    return {
                      ...post,
                      postLikes: [
                        ...likes,
                        {
                          id: like.id,
                          userId:
                            like.userId,
                        },
                      ],
                      isLikeOwner:
                        like.userId ===
                        currentUser?.userData
                          ?.id
                          ? true
                          : post.isLikeOwner,
                    };
                  }
                )
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "postLikes",
          },
          (payload: any) => {
            const like =
              payload?.old;

            if (
              !like?.id ||
              !like?.postId ||
              !like?.userId
            ) {
              return;
            }

            setPosts(
              (prevPosts) =>
                prevPosts.map(
                  (post) => {
                    if (
                      post.id !==
                      like.postId
                    ) {
                      return post;
                    }

                    return {
                      ...post,
                      postLikes:
                        (
                          post.postLikes ||
                          []
                        ).filter(
                          (item) =>
                            item.id !==
                              like.id &&
                            item.userId !==
                              like.userId
                        ),
                      isLikeOwner:
                        like.userId ===
                        currentUser?.userData
                          ?.id
                          ? false
                          : post.isLikeOwner,
                    };
                  }
                )
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
    currentUser?.userData
      ?.id,
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
          onPress: onLogout,
          style: "destructive",
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={{
            flex: 1,
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <Text
            style={{
              color:
                theme.colors
                  .primary,
              fontSize: hp(4),
              textAlign:
                "center",
              fontWeight:
                theme.fonts
                  .extraBold,
              marginBottom:
                hp(10),
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
    <ScreenWarpper
      autoDismissKeyboard={
        false
      }
    >
      <FlatList
        data={posts}
        ListHeaderComponent={
          <UserHeader
            user={user}
            router={router}
            handleLogoutBtn={
              handleLogout
            }
            disableEdit={
              otherUserId !==
              null
            }
            disableLogout={
              otherUserId !==
              null
            }
            isFollowingUser={
              isFollowingUser
            }
            followersCount={
              followersCount
            }
            followingCount={
              followingCount
            }
            followLoading={
              followLoading
            }
            onFollowToggle={
              handleFollowToggle
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.listStyle
        }
        keyExtractor={(item) =>
          item.id.toString()
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
              theme.colors
                .primary
            }
            colors={[
              theme.colors
                .primary,
            ]}
          />
        }
        renderItem={({
          item,
        }) => (
          <PostCard
            item={item}
            currentUser={
              user
            }
            router={
              router
            }
            onLikeChange={
              handleLikeChange
            }
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
                style={
                  styles.noPosts
                }
              >
                {posts.length >
                0
                  ? "Bạn đã xem hết các bài viết"
                  : "Hãy tạo bài viết đầu tiên nào!"}
              </Text>
            </View>
          ) : posts.length >
            0 ? (
            <View
              style={{
                marginVertical: 30,
              }}
            >
              <Loading />
            </View>
          ) : null
        }
        onEndReachedThreshold={
          0.5
        }
        onEndReached={() => {
          if (
            profileUserId &&
            !loadingRef.current &&
            hasMoreRef.current
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
  isFollowingUser = false,
  followersCount = 0,
  followingCount = 0,
  followLoading = false,
  onFollowToggle,
}: {
  user:
    | SupaUser
    | undefined;
  router: Router;
  handleLogoutBtn: () => void;
  disableEdit?: boolean;
  disableLogout?: boolean;
  isFollowingUser?: boolean;
  followersCount?: number;
  followingCount?: number;
  followLoading?: boolean;
  onFollowToggle?: () => void;
}) => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "white",
      }}
    >
      <View
        style={
          styles.headerContainer
        }
      >
        <Header
          title="Trang cá nhân"
          marginBottom={30}
        />

        {!disableLogout && (
          <TouchableOpacity
            style={
              styles.logoutBtn
            }
            onPress={
              handleLogoutBtn
            }
          >
            <Icon
              name="logout"
              color={
                theme.colors
                  .rose
              }
              strokeWidth={2}
            />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={
          styles.container
        }
      >
        <View
          style={{
            gap: 15,
          }}
        >
          <View
            style={
              styles.avatarContainer
            }
          >
            <Avatar
              uri={
                user?.image
              }
              size={hp(12)}
              rounded={
                theme.radius
                  .xxl * 1.4
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
                  strokeWidth={
                    2.5
                  }
                  size={20}
                />
              </Pressable>
            )}
          </View>

          <View
            style={{
              alignItems:
                "center",
              gap: 4,
            }}
          >
            <Text
              style={
                styles.userName
              }
            >
              {user?.name ||
                "Chưa cập nhật tên"}
            </Text>

            <Text>
              {user?.address ||
                ""}
            </Text>
          </View>

          <View
            style={{
              gap: 10,
            }}
          >
            <View
              style={
                styles.info
              }
            >
              <Icon
                name="mail"
                size={20}
                color={
                  theme.colors
                    .textLight
                }
              />

              <Text
                style={
                  styles.infoText
                }
              >
                {maskGmail(
                  user?.email ||
                    ""
                )}
              </Text>
            </View>

            {user?.phoneNumber && (
              <View
                style={
                  styles.info
                }
              >
                <Icon
                  name="call"
                  size={20}
                  color={
                    theme.colors
                      .textLight
                  }
                />

                <Text
                  style={
                    styles.infoText
                  }
                >
                  {maskPhoneNumber(
                    user.phoneNumber
                  )}
                </Text>
              </View>
            )}

            {user?.bio && (
              <View
                style={
                  styles.info
                }
              >
                <Text
                  style={
                    styles.infoText
                  }
                >
                  {user.bio}
                </Text>
              </View>
            )}

            <View style={styles.followStats}>
              <TouchableOpacity
                style={styles.followStat}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname:
                      "/followList",
                    params: {
                      userId:
                        user?.id,
                      type:
                        "followers",
                    },
                  })
                }
              >
                <Text style={styles.followStatNumber}>
                  {followersCount || 0}
                </Text>

                <Text style={styles.followStatLabel}>
                  Takipçi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.followStat}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname:
                      "/followList",
                    params: {
                      userId:
                        user?.id,
                      type:
                        "following",
                    },
                  })
                }
              >
                <Text style={styles.followStatNumber}>
                  {followingCount || 0}
                </Text>

                <Text style={styles.followStatLabel}>
                  Takip
                </Text>
              </TouchableOpacity>
            </View>

            {disableEdit &&
              onFollowToggle && (
                <TouchableOpacity
                  disabled={followLoading}
                  onPress={onFollowToggle}
                  style={[
                    styles.followButton,
                    isFollowingUser &&
                      styles.followingButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.followButtonText,
                      isFollowingUser &&
                        styles.followingButtonText,
                    ]}
                  >
                    {followLoading
                      ? "Bekle..."
                      : isFollowingUser
                      ? "Takibi bırak"
                      : "Takip et"}
                  </Text>
                </TouchableOpacity>
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
            alignSelf:
              "center",
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
    paddingHorizontal:
      wp(4),
  },

  headerContainer: {
    marginBottom: 20,
  },

  avatarContainer: {
    height: hp(12),
    width: hp(12),
    alignSelf:
      "center",
  },

  editIcon: {
    position:
      "absolute",
    bottom: 0,
    right: -12,
    padding: 7,
    borderRadius: 50,
    backgroundColor:
      "white",
    shadowColor:
      theme.colors
        .textLight,
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
    fontWeight:
      theme.fonts.medium,
    color:
      theme.colors
        .textDark,
  },

  info: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 10,
  },

  infoText: {
    fontSize: hp(1.5),
    fontWeight:
      theme.fonts.medium,
    color:
      theme.colors
        .textLight,
  },

  logoutBtn: {
    position:
      "absolute",
    right: 0,
    padding: 5,
    borderRadius:
      theme.radius.sm,
    backgroundColor:
      theme.colors
        .mistyRose,
  },

  listStyle: {
    paddingHorizontal:
      wp(4),
    paddingBottom: 30,
  },

  noPosts: {
    fontSize: hp(2),
    textAlign:
      "center",
    color:
      theme.colors.text,
  },

  followStats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 35,
    marginTop: 10,
  },

  followStat: {
    alignItems: "center",
  },

  followStatNumber: {
    fontSize: hp(2.1),
    fontWeight: theme.fonts.bold,
    color: theme.colors.textDark,
  },

  followStatLabel: {
    marginTop: 2,
    fontSize: hp(1.45),
    color: theme.colors.textLight,
  },

  followButton: {
    marginTop: 8,
    alignSelf: "center",
    minWidth: wp(42),
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },

  followingButton: {
    backgroundColor: theme.colors.mistyRose,
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },

  followButtonText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
    color: "white",
  },

  followingButtonText: {
    color: theme.colors.textDark,
  },
});
