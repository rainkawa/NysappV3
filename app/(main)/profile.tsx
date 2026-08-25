import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";
import Loading from "@/components/Loading";
import PostCard from "@/components/PostCard";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import {
  SupaUser,
  useAuth,
} from "@/contexts/AuthContext";
import {
  hp,
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
} from "@/services/notificationService";
import {
  getProfileLinks,
  ProfileLink,
} from "@/services/profileSettingsService";
import BottomNav from "@/components/BottomNav";
import {
  followUser,
  unfollowUser,
  getFollowRelation,
  getFollowersCount,
  getFollowingCount,
  cancelFollowRequest,
} from "@/services/followService";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import * as Linking from "expo-linking";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const POSTS_PAGE_SIZE = 5;

const formatCount = (
  value: number
) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000)
      .toFixed(1)
      .replace(/\\.0$/, "")}Mr`;
  }

  if (value >= 1000000) {
    return `${(value / 1000000)
      .toFixed(1)
      .replace(/\\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000)
      .toFixed(1)
      .replace(/\\.0$/, "")}B`;
  }

  return String(value);
};



type RelationState =
  | "following"
  | "pending"
  | "none";

const Profile = () => {
  const router = useRouter();
  const authContext = useAuth();

  if (!authContext) {
    return null;
  }

  const {
    user: currentUser,
  } = authContext;

  const params =
    useLocalSearchParams();

  const routeUserId =
    typeof params.userId ===
    "string"
      ? params.userId
      : null;

  const currentUserId =
    currentUser?.authInfo?.id ||
    currentUser?.userData?.id ||
    "";

  const isOwnProfile =
    !routeUserId ||
    routeUserId ===
      currentUserId;

  const profileUserId =
    routeUserId ||
    currentUserId;

  const [user, setUser] =
    useState<
      SupaUser | undefined
    >(
      currentUser?.userData
    );

  const [posts, setPosts] =
    useState<
      PostViewer[]
    >([]);

  const [hasMore, setHasMore] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [relation, setRelation] =
    useState<RelationState>(
      "none"
    );

  const [followLoading, setFollowLoading] =
    useState(false);

  const [otherUserLoading, setOtherUserLoading] =
    useState(false);

  const [profileLinks, setProfileLinks] =
    useState<ProfileLink[]>([]);

  const pageRef =
    useRef(0);

  const hasMoreRef =
    useRef(true);

  const loadingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  /*
   * -------------------------------------------------------
   * Mount
   * -------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  /*
   * -------------------------------------------------------
   * User
   * -------------------------------------------------------
   */

  const loadUser =
    useCallback(
      async (
        targetUserId: string
      ) => {
        if (
          targetUserId ===
          currentUserId
        ) {
          if (
            mountedRef.current
          ) {
            setUser(
              currentUser?.userData
            );
          }

          return;
        }

        setOtherUserLoading(
          true
        );

        try {
          const result =
            await getUserData(
              targetUserId
            );

          if (
            !result.success ||
            !result.data
          ) {
            Alert.alert(
              "Profil",
              "Kullanıcı bulunamadı."
            );

            router.back();
            return;
          }

          if (
            mountedRef.current
          ) {
            setUser(
              result.data
            );
          }
        } catch {
          Alert.alert(
            "Profil",
            "Kullanıcı bilgileri alınamadı."
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setOtherUserLoading(
              false
            );
          }
        }
      },
      [
        currentUser?.userData,
        currentUserId,
        router,
      ]
    );

  /*
   * -------------------------------------------------------
   * Follow data
   * -------------------------------------------------------
   */

  const loadFollowData =
    useCallback(
      async (
        targetUserId: string
      ) => {
        if (
          !targetUserId
        ) {
          return;
        }

        const [
          followersRes,
          followingRes,
        ] =
          await Promise.all([
            getFollowersCount(
              targetUserId
            ),
            getFollowingCount(
              targetUserId
            ),
          ]);

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (
          followersRes.success
        ) {
          setFollowersCount(
            followersRes.data ||
              0
          );
        }

        if (
          followingRes.success
        ) {
          setFollowingCount(
            followingRes.data ||
              0
          );
        }

        if (
          isOwnProfile ||
          !currentUserId
        ) {
          setRelation(
            "none"
          );

          return;
        }

        const relationRes =
          await getFollowRelation(
            currentUserId,
            targetUserId
          );

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (
          relationRes.success
        ) {
          setRelation(
            relationRes.data as RelationState
          );
        }
      },
      [
        currentUserId,
        isOwnProfile,
      ]
    );

  useEffect(() => {
    if (!profileUserId) {
      return;
    }

    const timer =
      setTimeout(() => {
        void loadFollowData(
          profileUserId
        );
      }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [
    profileUserId,
    loadFollowData,
  ]);


  useEffect(() => {
    if (!profileUserId) {
      setProfileLinks([]);
      return;
    }

    let mounted = true;

    (async () => {
      const links =
        await getProfileLinks(
          profileUserId
        );

      if (mounted) {
        setProfileLinks(
          links
        );
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profileUserId]);

  /*
   * -------------------------------------------------------
   * Posts
   * -------------------------------------------------------
   */

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

        if (
          reset
        ) {
          setInitialLoading(
            true
          );
        }

        const nextPage =
          reset
            ? 1
            : pageRef.current +
              1;

        try {
          /*
           * Gizli profil + takip edilmiyor
           * => postları istemiyoruz.
           */
          if (
            !isOwnProfile &&
            !!user?.isPrivate &&
            relation !==
              "following"
          ) {
            if (
              mountedRef.current
            ) {
              setPosts(
                []
              );

              setHasMore(
                false
              );

              hasMoreRef.current =
                false;

              pageRef.current =
                1;
            }

            return;
          }

          const result =
            await getYourPosts(
              nextPage,
              targetUserId
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          if (
            !result.success
          ) {
            console.warn(
              "Profile - getting posts failed:",
              result.message
            );

            return;
          }

          const newPosts:
            PostViewer[] =
            result.data || [];

          if (
            reset
          ) {
            setPosts(
              newPosts
            );
          } else {
            setPosts(
              (previous) => {
                const ids =
                  new Set(
                    previous.map(
                      (item) =>
                        item.id
                    )
                  );

                return [
                  ...previous,
                  ...newPosts.filter(
                    (item) =>
                      !ids.has(
                        item.id
                      )
                  ),
                ];
              }
            );
          }

          pageRef.current =
            nextPage;

          const more =
            newPosts.length ===
            POSTS_PAGE_SIZE;

          hasMoreRef.current =
            more;

          setHasMore(
            more
          );
        } catch (
          error
        ) {
          console.warn(
            "Profile - gettingPosts error:",
            error
          );
        } finally {
          loadingRef.current =
            false;

          if (
            reset &&
            mountedRef.current
          ) {
            setInitialLoading(
              false
            );
          }
        }
      },
      [
        isOwnProfile,
        relation,
        user?.isPrivate,
      ]
    );

  /*
   * -------------------------------------------------------
   * Initial / route change
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (
      !profileUserId
    ) {
      return;
    }

    pageRef.current =
      0;

    hasMoreRef.current =
      true;

    setPosts([]);

    setHasMore(
      true
    );

    setInitialLoading(
      true
    );

    loadUser(
      profileUserId
    );

    loadFollowData(
      profileUserId
    );
  }, [
    profileUserId,
    loadUser,
    loadFollowData,
  ]);

  /*
   * -------------------------------------------------------
   * Load posts after user/relation resolved
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (
      !profileUserId
    ) {
      return;
    }

    if (
      otherUserLoading
    ) {
      return;
    }

    gettingPosts(
      profileUserId,
      true
    );
  }, [
    profileUserId,
    otherUserLoading,
    user?.isPrivate,
    relation,
    gettingPosts,
  ]);

  /*
   * -------------------------------------------------------
   * Refresh
   * -------------------------------------------------------
   */

  const onRefresh =
    useCallback(
      async () => {
        if (
          refreshing ||
          !profileUserId
        ) {
          return;
        }

        setRefreshing(
          true
        );

        try {
          await Promise.all([
            loadUser(
              profileUserId
            ),
            loadFollowData(
              profileUserId
            ),
          ]);

          pageRef.current =
            0;

          hasMoreRef.current =
            true;

          setHasMore(
            true
          );

          await gettingPosts(
            profileUserId,
            true
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setRefreshing(
              false
            );
          }
        }
      },
      [
        refreshing,
        profileUserId,
        loadUser,
        loadFollowData,
        gettingPosts,
      ]
    );

  /*
   * -------------------------------------------------------
   * Like change
   * -------------------------------------------------------
   */

const handleLikeChange =
    useCallback(
      (
        postId: string,
        likeId: string | null,
        changedUserId: string,
        liked: boolean
      ) => {
        setPosts(
          (previous) =>
            previous.map(
              (post) => {
                if (
                  post.id !==
                  postId
                ) {
                  return post;
                }

                const likes =
                  post.postLikes ||
                  [];

                if (
                  liked
                ) {
                  const existing =
                    likes.some(
                      (item) =>
                        item.userId ===
                        changedUserId
                    );

                  if (
                    existing
                  ) {
                    return post;
                  }

                  return {
                    ...post,
                    postLikes: [
                      ...likes,
                      {
                        id:
                          likeId ||
                          `local-${changedUserId}-${postId}`,
                        userId:
                          changedUserId,
                      },
                    ],
                  };
                }

                return {
                  ...post,
                  postLikes:
                    likes.filter(
                      (item) =>
                        item.userId !==
                        changedUserId
                    ),
                };
              }
            )
        );
      },
      []
    );

  
  /*
   * -------------------------------------------------------
   * Realtime likes
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (
      !profileUserId
    ) {
      return;
    }

    const channel =
      supabase
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
          (
            payload: any
          ) => {
            const like =
              payload?.new ||
              payload?.old;

            if (
              !like?.id ||
              !like?.postId ||
              !like?.userId
            ) {
              return;
            }

            setPosts(
              (previous) =>
                previous.map(
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

                    if (
                      payload.eventType ===
                      "INSERT"
                    ) {
                      if (
                        likes.some(
                          (
                            item
                          ) =>
                            item.id ===
                              like.id ||
                            item.userId ===
                              like.userId
                        )
                      ) {
                        return post;
                      }

                      return {
                        ...post,
                        postLikes: [
                          ...likes,
                          {
                            id:
                              like.id,
                            userId:
                              like.userId,
                          },
                        ],
                        isLikeOwner:
                          like.userId ===
                          currentUserId
                            ? true
                            : post.isLikeOwner,
                      };
                    }

                    return {
                      ...post,
                      postLikes:
                        likes.filter(
                          (
                            item
                          ) =>
                            item.id !==
                              like.id &&
                            item.userId !==
                              like.userId
                        ),
                      isLikeOwner:
                        like.userId ===
                        currentUserId
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
        channel
      );
    };
  }, [
    profileUserId,
    currentUserId,
  ]);

  /*
   * -------------------------------------------------------
   * Follow button
   * -------------------------------------------------------
   */

  const handleFollow =
    useCallback(
      async () => {
        if (
          !currentUserId ||
          !profileUserId ||
          isOwnProfile ||
          followLoading
        ) {
          return;
        }

        /*
         * FOLLOWING
         * => confirmation first
         */

        if (
          relation ===
          "following"
        ) {
          Alert.alert(
            "Takibi bırak",
            `${user?.name || "Bu kullanıcı"} kişisini takip etmekten çıkmak istediğinize emin misiniz?`,
            [
              {
                text: "Vazgeç",
                style:
                  "cancel",
              },
              {
                text: "Evet",
                style:
                  "destructive",
                onPress:
                  async () => {
                    setFollowLoading(
                      true
                    );

                    const result =
                      await unfollowUser(
                        currentUserId,
                        profileUserId
                      );

                    if (
                      result.success
                    ) {
                      setRelation(
                        "none"
                      );

                      setFollowersCount(
                        (
                          count
                        ) =>
                          Math.max(
                            0,
                            count -
                              1
                          )
                      );
                    } else {
                      Alert.alert(
                        "Takip",
                        result.message
                      );
                    }

                    setFollowLoading(
                      false
                    );
                  },
              },
            ]
          );

          return;
        }

        /*
         * PENDING
         * => cancel
         */

        if (
          relation ===
          "pending"
        ) {
          setFollowLoading(
            true
          );

          const result =
            await cancelFollowRequest(
              currentUserId,
              profileUserId
            );

          if (
            result.success
          ) {
            setRelation(
              "none"
            );
          } else {
            Alert.alert(
              "Takip",
              result.message
            );
          }

          setFollowLoading(
            false
          );

          return;
        }

        setFollowLoading(
          true
        );

        const isPrivate =
          !!user?.isPrivate;

        const result =
          await followUser(
            currentUserId,
            profileUserId,
            isPrivate
          );

        if (
          result.success
        ) {
          if (
            isPrivate
          ) {
            setRelation(
              "pending"
            );
          } else {
            setRelation(
              "following"
            );

            setFollowersCount(
              (
                count
              ) =>
                count +
                1
            );
          }
        } else {
          Alert.alert(
            "Takip",
            result.message
          );
        }

        setFollowLoading(
          false
        );
      },
      [
        currentUserId,
        profileUserId,
        isOwnProfile,
        followLoading,
        relation,
        user?.name,
        user?.isPrivate,
      ]
    );

  /*
   * -------------------------------------------------------
   * Follow / follower list permissions
   * -------------------------------------------------------
   */

  const canViewFollowLists =
    isOwnProfile ||
    relation ===
      "following" ||
    !user?.isPrivate;

  const openFollowers =
    () => {
      if (
        !canViewFollowLists
      ) {
        Alert.alert(
          "Gizli hesap",
          "Bu hesabın takipçilerini görmek için takip etmelisiniz."
        );

        return;
      }

      router.push({
        pathname:
          "/(main)/followList",
        params: {
          userId:
            profileUserId,
          type:
            "followers",
        },
      });
    };

  const openFollowing =
    () => {
      if (
        !canViewFollowLists
      ) {
        Alert.alert(
          "Gizli hesap",
          "Bu hesabın takip ettiklerini görmek için takip etmelisiniz."
        );

        return;
      }

      router.push({
        pathname:
          "/(main)/followList",
        params: {
          userId:
            profileUserId,
          type:
            "following",
        },
      });
    };

  /*
   * -------------------------------------------------------
   * User action
   * -------------------------------------------------------
   */

  const renderPrimaryAction =
    () => {
      if (
        isOwnProfile
      ) {
        return (
          <TouchableOpacity
            activeOpacity={
              0.8
            }
            onPress={() =>
              router.push(
                "/editProfile"
              )
            }
            style={
              styles.primaryButton
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Profili düzenle
            </Text>
          </TouchableOpacity>
        );
      }

      if (
        relation ===
        "following"
      ) {
        return (
          <View
            style={
              styles.actionRow
            }
          >
            <TouchableOpacity
              activeOpacity={
                0.8
              }
              onPress={
                handleFollow
              }
              disabled={
                followLoading
              }
              style={[
                styles.secondaryButton,
                styles.actionHalf,
              ]}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                {followLoading
                  ? "Bekle..."
                  : "Takibi bırak"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={
                0.8
              }
              onPress={() => {
                if (
                  !profileUserId
                ) {
                  return;
                }

                router.push({
                  pathname:
                    "/dm",
                  params: {
                    userId:
                      profileUserId,
                  },
                });
              }}
              style={[
                styles.secondaryButton,
                styles.actionHalf,
              ]}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Mesaj
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (
        relation ===
        "pending"
      ) {
        return (
          <TouchableOpacity
            activeOpacity={
              0.8
            }
            onPress={
              handleFollow
            }
            disabled={
              followLoading
            }
            style={
              styles.secondaryButton
            }
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              {followLoading
                ? "Bekle..."
                : "İstek gönderildi"}
            </Text>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          activeOpacity={
            0.8
          }
          onPress={
            handleFollow
          }
          disabled={
            followLoading
          }
          style={
            styles.primaryButton
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {followLoading
              ? "Bekle..."
              : user?.isPrivate
              ? "Takip et"
              : "Takip et"}
          </Text>
        </TouchableOpacity>
      );
    };

  /*
   * -------------------------------------------------------
   * Header
   * -------------------------------------------------------
   */

  const renderHeader =
    () => {
      const blockedByPrivacy =
        !isOwnProfile &&
        !!user?.isPrivate &&
        relation !==
          "following";

      return (
        <View
          style={
            styles.profileHeader
          }
        >
          {/* TOP BAR */}

          <View
            style={
              styles.topBar
            }
          >
            <Pressable
              onPress={() =>
                router.back()
              }
              style={
                styles.topIcon
              }
            >
              <Icon
                name="arrowLeft"
                size={22}
                strokeWidth={2}
              />
            </Pressable>

            <Text
              style={
                styles.username
              }
            >
              {user?.name ||
                "kullanıcı"}
            </Text>

            <View
              style={
                styles.topBarRight
              }
            >
              {isOwnProfile && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Çıkış yap",
                      "Çıkış yapmak istediğinize emin misiniz?",
                      [
                        {
                          text: "Vazgeç",
                          style: "cancel",
                        },
                        {
                          text: "Evet",
                          style: "destructive",
                          onPress: async () => {
                            await supabase.auth.signOut();
                          },
                        },
                      ]
                    );
                  }}
                  style={
                    styles.topIcon
                  }
                >
                  <Icon
                    name="logout"
                    size={22}
                    color={
                      theme.colors.textDark
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* PROFILE MAIN */}

          <View
            style={
              styles.profileMain
            }
          >
            <Avatar
              uri={
                user?.image
              }
              size={hp(10)}
              rounded={
                theme.radius.xxl *
                1.4
              }
            />

            <View
              style={
                styles.statsContainer
              }
            >
              <View
                style={
                  styles.statItem
                }
              >
                <Text
                  style={
                    styles.statNumber
                  }
                >
                  {posts.length}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Gönderi
                </Text>
              </View>

              <Pressable
                style={
                  styles.statItem
                }
                onPress={
                  openFollowers
                }
              >
                <Text
                  style={
                    styles.statNumber
                  }
                >
                  {
                    formatCount(
                      followersCount
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Takipçi
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.statItem
                }
                onPress={
                  openFollowing
                }
              >
                <Text
                  style={
                    styles.statNumber
                  }
                >
                  {
                    formatCount(
                      followingCount
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Takip
                </Text>
              </Pressable>
            </View>
          </View>

          {/* NAME + BIO */}

          <View
            style={
              styles.bioContainer
            }
          >
            <Text
              style={
                styles.displayName
              }
            >
              {user?.name ||
                "İsim eklenmemiş"}
            </Text>

            {user?.bio ? (
              <Text
                style={
                  styles.bioText
                }
              >
                {user.bio}
              </Text>
            ) : null}
          </View>

          {profileLinks.length > 0 && (
            <View
              style={
                styles.profileLinksSection
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Bağlantılar
              </Text>

              <View
                style={
                  styles.profileLinksList
                }
              >
                {profileLinks.map(
                  link => (
                    <Pressable
                      key={
                        link.id
                      }
                      onPress={() => {
                        void Linking.openURL(
                          link.url
                        );
                      }}
                      style={
                        styles.profileLinkButton
                      }
                    >
                      <View
                        style={
                          styles.profileLinkIcon
                        }
                      >
                        <Icon
                          name="backward"
                          size={18}
                        />
                      </View>

                      <View
                        style={
                          styles.profileLinkTextWrap
                        }
                      >
                        <Text
                          style={
                            styles.profileLinkTitle
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            link.title
                          }
                        </Text>

                        <Text
                          style={
                            styles.profileLinkUrl
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            link.url
                          }
                        </Text>
                      </View>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          )}

          {/* ACTION */}

          <View
            style={
              styles.actionContainer
            }
          >
            {renderPrimaryAction()}
          </View>

          {/* HIGHLIGHTS */}

          <View
            style={
              styles.highlightsSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Öne çıkanlar
            </Text>

            <View
              style={
                styles.highlightRow
              }
            >
              <TouchableOpacity
                style={
                  styles.highlightItem
                }
                onPress={() => {
                  if (
                    !isOwnProfile
                  ) {
                    return;
                  }

                  Alert.alert(
                    "Öne çıkan",
                    "Hikâye öne çıkarma özelliği sonraki aşamada eklenecek."
                  );
                }}
              >
                <View
                  style={
                    styles.highlightCircle
                  }
                >
                  <Text
                    style={
                      styles.highlightPlus
                    }
                  >
                    +
                  </Text>
                </View>

                <Text
                  style={
                    styles.highlightLabel
                  }
                >
                  Yeni
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TABS */}

          <View
            style={
              styles.tabs
            }
          >
            <View
              style={
                styles.activeTab
              }
            >
              <Icon
                name="image"
                size={21}
              />
            </View>
          </View>

          {blockedByPrivacy && (
            <View
              style={
                styles.privateContainer
              }
            >
              <View
                style={
                  styles.privateIconCircle
                }
              >
                <Icon
                  name="lock"
                  size={28}
                />
              </View>

              <Text
                style={
                  styles.privateTitle
                }
              >
                Bu hesap gizli
              </Text>

              <Text
                style={
                  styles.privateDescription
                }
              >
                Bu hesabın paylaşımlarını
                görmek için takip isteği
                gönder.
              </Text>
            </View>
          )}
        </View>
      );
    };

  if (
    otherUserLoading ||
    initialLoading &&
      !user
  ) {
    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={
            styles.loadingScreen
          }
        >
          <Loading
            size="large"
          />
        </View>
      </ScreenWarpper>
    );
  }

  const hidePosts =
    !isOwnProfile &&
    !!user?.isPrivate &&
    relation !==
      "following";

  return (
    <ScreenWarpper
      autoDismissKeyboard={
        false
      }
    >
      <FlatList
        data={
          hidePosts
            ? []
            : posts
        }
        ListHeaderComponent={
          renderHeader()
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.listStyle
        }
        keyExtractor={(
          item
        ) =>
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
          hidePosts
            ? null
            : !hasMore
            ? (
                <View
                  style={
                    styles.footer
                  }
                >
                  <Text
                    style={
                      styles.footerText
                    }
                  >
                    {posts.length >
                    0
                      ? "Bütün gönderileri gördün"
                      : "Henüz gönderi yok"}
                  </Text>
                </View>
              )
            : posts.length >
              0
            ? (
                <View
                  style={
                    styles.footer
                  }
                >
                  <Loading />
                </View>
              )
            : null
        }
        onEndReachedThreshold={
          0.5
        }
        onEndReached={() => {
          if (
            hidePosts
          ) {
            return;
          }

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
      <BottomNav />
    </ScreenWarpper>
  );
};

export default Profile;

const styles =
  StyleSheet.create({
    loadingScreen: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.background,
    },

    listStyle: {
      paddingBottom: hp(11),
      backgroundColor:
        theme.colors.background,
    },

    profileHeader: {
      backgroundColor:
        theme.colors.background,
      paddingHorizontal:
        wp(4),
      paddingBottom: hp(1.5),
    },

    topBar: {
      minHeight: hp(7),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    topIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    topBarRight: {
      width: 44,
      alignItems:
        "flex-end",
    },

    username: {
      flex: 1,
      textAlign:
        "center",
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
      marginHorizontal:
        wp(3),
    },

    profileMain: {
      marginTop: hp(1),
      padding:
        wp(4),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    statsContainer: {
      flex: 1,
      flexDirection:
        "row",
      justifyContent:
        "space-evenly",
      marginLeft:
        wp(3),
    },

    statItem: {
      minWidth:
        wp(17),
      minHeight: 56,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        theme.radius.lg,
    },

    statNumber: {
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    statLabel: {
      marginTop: 3,
      fontSize:
        hp(1.3),
      color:
        "#94A3B8",
    },

    bioContainer: {
      marginTop: hp(1.3),
      paddingHorizontal:
        wp(1),
      gap: 5,
    },

    displayName: {
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    bioText: {
      fontSize:
        hp(1.45),
      lineHeight:
        hp(2.1),
      color:
        "#CBD5E1",
    },

    profileLinksSection: {
      marginTop:
        hp(1.3),
      padding:
        wp(4),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    profileLinksList: {
      gap: 8,
      marginTop: 8,
    },

    profileLinkButton: {
      minHeight: 56,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        12,
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    profileLinkIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
      marginRight: 10,
    },

    profileLinkTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    profileLinkTitle: {
      fontSize:
        hp(1.45),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    profileLinkUrl: {
      marginTop: 2,
      fontSize:
        hp(1.1),
      color:
        "#94A3B8",
    },

    actionContainer: {
      marginTop:
        hp(1.3),
    },

    primaryButton: {
      minHeight: 48,
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        20,
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.14)",
    },

    primaryButtonText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.55),
      fontWeight:
        theme.fonts.bold,
    },

    secondaryButton: {
      minHeight: 48,
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        20,
    },

    secondaryButtonText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts.semibold,
    },

    actionRow: {
      flexDirection:
        "row",
      gap: 8,
    },

    actionHalf: {
      flex: 1,
    },

    highlightsSection: {
      marginTop:
        hp(2),
      padding:
        wp(4),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    sectionTitle: {
      fontSize:
        hp(1.6),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
      marginBottom:
        hp(1.2),
    },

    highlightRow: {
      flexDirection:
        "row",
    },

    highlightItem: {
      alignItems:
        "center",
      width: 72,
    },

    highlightCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 1,
      borderColor:
        theme.colors.primary,
      backgroundColor:
        theme.colors.background,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    highlightPlus: {
      fontSize: 28,
      fontWeight:
        theme.fonts.medium,
      color:
        theme.colors.primary,
    },

    highlightLabel: {
      marginTop: 6,
      fontSize:
        hp(1.25),
      color:
        "#94A3B8",
    },

    tabs: {
      marginTop:
        hp(1.5),
      height: 48,
      backgroundColor:
        theme.colors.card,
      borderRadius:
        theme.radius.lg,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    activeTab: {
      height: 48,
      minWidth: 60,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderBottomWidth: 2,
      borderBottomColor:
        theme.colors.primary,
    },

    privateContainer: {
      marginTop:
        hp(1.5),
      paddingVertical:
        hp(5),
      paddingHorizontal:
        wp(8),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    privateIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        theme.colors.background,
      borderWidth: 1,
      borderColor:
        theme.colors.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    privateTitle: {
      marginTop: 18,
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    privateDescription: {
      marginTop: 7,
      fontSize:
        hp(1.4),
      lineHeight:
        hp(2),
      color:
        "#94A3B8",
      textAlign:
        "center",
    },

    footer: {
      paddingVertical:
        30,
      alignItems:
        "center",
      backgroundColor:
        theme.colors.background,
    },

    footerText: {
      fontSize:
        hp(1.4),
      color:
        "#64748B",
    },
  });

