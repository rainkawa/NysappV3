import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import ScreenWarpper from "@/components/ScreenWrapper";
import Icon from "@/assets/icons";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";
import BottomNav from "@/components/BottomNav";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  FollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  followUser,
  unfollowUser,
  removeFollower,
} from "@/services/followService";

const FollowList = () => {
  const router =
    useRouter();

  const params =
    useLocalSearchParams();

  const authContext =
    useAuth();

  const userId =
    typeof params.userId ===
    "string"
      ? params.userId
      : "";

  const type =
    params.type ===
    "following"
      ? "following"
      : "followers";

  const currentUserId =
    authContext?.user
      ?.authInfo?.id || "";

  const [
    users,
    setUsers,
  ] =
    useState<
      FollowUser[]
    >([]);

  /*
   * Bu map:
   * "Ben bu kullanıcıyı takip ediyor muyum?"
   */
  const [
    followingMap,
    setFollowingMap,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    actionUserId,
    setActionUserId,
  ] =
    useState<
      string | null
    >(null);

  const loadUsers =
    useCallback(
      async () => {
        if (!userId) {
          return;
        }

        setLoading(true);

        try {
          const result =
            type ===
            "followers"
              ? await getFollowers(
                  userId
                )
              : await getFollowing(
                  userId
                );

          if (
            !result.success
          ) {
            console.warn(
              "Follow List:",
              result.message
            );

            setUsers([]);

            return;
          }

          const list =
            (
              result.data ||
              []
            ) as FollowUser[];

          setUsers(list);

          if (
            currentUserId
          ) {
            const entries =
              await Promise.all(
                list.map(
                  async (
                    item
                  ) => {
                    if (
                      item.id ===
                      currentUserId
                    ) {
                      return [
                        item.id,
                        false,
                      ] as const;
                    }

                    const result =
                      await isFollowing(
                        currentUserId,
                        item.id
                      );

                    return [
                      item.id,
                      !!result.data,
                    ] as const;
                  }
                )
              );

            setFollowingMap(
              Object.fromEntries(
                entries
              )
            );
          }
        } catch (
          error
        ) {
          console.warn(
            "Follow List load error:",
            error
          );

          setUsers([]);
        } finally {
          setLoading(false);
        }
      },
      [
        currentUserId,
        type,
        userId,
      ]
    );

  useEffect(() => {
    loadUsers();
  }, [
    loadUsers,
  ]);

  const onRefresh =
    useCallback(
      async () => {
        if (
          refreshing
        ) {
          return;
        }

        setRefreshing(true);

        try {
          await loadUsers();
        } finally {
          setRefreshing(false);
        }
      },
      [
        loadUsers,
        refreshing,
      ]
    );

  /*
   * TAKİP EDİLENLER:
   * currentUser -> targetUser
   *
   * TAKİPÇİLER:
   * targetUser -> currentUser
   */
  const handleFollowAction =
    async (
      targetUserId: string,
      targetIsPrivate: boolean
    ) => {
      if (
        !currentUserId ||
        currentUserId ===
          targetUserId ||
        actionUserId
      ) {
        return;
      }

      setActionUserId(
        targetUserId
      );

      try {
        let result;

        /*
         * TAKİPÇİLER SEKMÉSİ
         *
         * Bu kullanıcı beni takip ediyor.
         * Onu takipçilerimden çıkar.
         */
        if (
          type ===
          "followers"
        ) {
          result =
            await removeFollower(
              currentUserId,
              targetUserId
            );
        } else {
          /*
           * TAKİP SEKMÉSİ
           *
           * Ben bu kullanıcıyı takip ediyorum.
           * Takibi bırak.
           */
          result =
            await unfollowUser(
              currentUserId,
              targetUserId
            );
        }

        if (
          !result.success
        ) {
          return;
        }

        /*
         * İşlem başarılıysa kullanıcı
         * mevcut listeden anında çıkar.
         */
        setUsers(
          (
            previous
          ) =>
            previous.filter(
              (
                item
              ) =>
                item.id !==
                targetUserId
            )
        );

        setFollowingMap(
          (
            previous
          ) => {
            const next = {
              ...previous,
            };

            delete next[
              targetUserId
            ];

            return next;
          }
        );
      } catch (
        error
      ) {
        console.warn(
          "Follow action error:",
          error
        );
      } finally {
        setActionUserId(
          null
        );
      }
    };

  const handleFollowNew =
    async (
      targetUserId: string,
      targetIsPrivate: boolean
    ) => {
      if (
        !currentUserId ||
        currentUserId ===
          targetUserId ||
        actionUserId
      ) {
        return;
      }

      setActionUserId(
        targetUserId
      );

      const previous =
        !!followingMap[
          targetUserId
        ];

      setFollowingMap(
        (prev) => ({
          ...prev,
          [targetUserId]:
            true,
        })
      );

      try {
        const result =
          await followUser(
            currentUserId,
            targetUserId,
            targetIsPrivate
          );

        if (
          !result.success
        ) {
          setFollowingMap(
            (prev) => ({
              ...prev,
              [targetUserId]:
                previous,
            })
          );
        }
      } catch {
        setFollowingMap(
          (prev) => ({
            ...prev,
            [targetUserId]:
              previous,
          })
        );
      } finally {
        setActionUserId(
          null
        );
      }
    };

  const openProfile =
    (
      targetUserId: string
    ) => {
      if (
        targetUserId ===
        currentUserId
      ) {
        router.push(
          "/profile"
        );

        return;
      }

      router.push({
        pathname:
          "/profile",
        params: {
          userId:
            targetUserId,
        },
      });
    };

  const renderItem =
    ({
      item,
    }: {
      item: FollowUser;
    }) => {
      const isSelf =
        item.id ===
        currentUserId;

      const isUserFollowing =
        !!followingMap[
          item.id
        ];

      const isActionLoading =
        actionUserId ===
        item.id;

      /*
       * Takipçiler:
       * Eğer ben onu takip etmiyorsam
       * "Takip et" göster.
       *
       * Eğer takip ediyorsam
       * yine takip ilişkisini yönetebiliriz.
       */
      const buttonText =
        type ===
        "followers"
          ? isUserFollowing
            ? "Takipten çıkar"
            : "Takip et"
          : isUserFollowing
            ? "Takibi bırak"
            : "Takip et";

      return (
        <View
          style={
            styles.userRow
          }
        >
          <Pressable
            style={
              styles.userMain
            }
            onPress={() =>
              openProfile(
                item.id
              )
            }
          >
            <Avatar
              uri={
                item.image
              }
              size={hp(6)}
              rounded={
                theme.radius
                  .md
              }
            />

            <View
              style={
                styles.userInfo
              }
            >
              <Text
                numberOfLines={
                  1
                }
                style={
                  styles.userName
                }
              >
                {item.name ||
                  "İsimsiz kullanıcı"}
              </Text>

              {item.bio ? (
                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.userBio
                  }
                >
                  {
                    item.bio
                  }
                </Text>
              ) : null}
            </View>
          </Pressable>

          {!isSelf && (
            <Pressable
              disabled={
                isActionLoading
              }
              onPress={() => {
                if (
                  type ===
                  "followers"
                ) {
                  if (
                    isUserFollowing
                  ) {
                    handleFollowAction(
                      item.id,
                      !!item.isPrivate
                    );
                  } else {
                    handleFollowNew(
                      item.id,
                      !!item.isPrivate
                    );
                  }
                } else {
                  if (
                    isUserFollowing
                  ) {
                    handleFollowAction(
                      item.id,
                      !!item.isPrivate
                    );
                  } else {
                    handleFollowNew(
                      item.id,
                      !!item.isPrivate
                    );
                  }
                }
              }}
              style={[
                styles.followButton,
                isUserFollowing &&
                  styles.followingButton,
              ]}
            >
              {isActionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    isUserFollowing
                      ? theme.colors
                          .text
                      : "white"
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.followButtonText,
                    isUserFollowing &&
                      styles.followingButtonText,
                  ]}
                >
                  {
                    buttonText
                  }
                </Text>
              )}
            </Pressable>
          )}
        </View>
      );
    };

  return (
    <ScreenWarpper
      autoDismissKeyboard={
        false
      }
    >
      <View
        style={
          styles.container
        }
      >
        <Header
          title={
            type ===
            "followers"
              ? "Takipçiler"
              : "Takip"
          }
          marginBottom={15}
        />

        {loading ? (
          <View
            style={
              styles.center
            }
          >
            <ActivityIndicator
              size="large"
              color={
                theme.colors
                  .primary
              }
            />
          </View>
        ) : (
          <FlatList
            data={
              users
            }
            keyExtractor={(
              item
            ) =>
              item.id
            }
            showsVerticalScrollIndicator={
              false
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
            renderItem={
              renderItem
            }
            contentContainerStyle={
              [
                styles.list,
                users.length ===
                  0 &&
                  styles.emptyList,
              ]
            }
            ListEmptyComponent={
              <View
                style={
                  styles.empty
                }
              >
                <Icon
                  name="user"
                  size={
                    hp(5)
                  }
                  color={
                    theme.colors
                      .textLight
                  }
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {type ===
                  "followers"
                    ? "Henüz takipçi yok"
                    : "Henüz kimseyi takip etmiyor"}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Kullanıcılar
                  burada görünecek.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNav />
    </ScreenWarpper>
  );
};

export default FollowList;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal:
        wp(4),
    },

    list: {
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
    },

    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    empty: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(8),
    },

    emptyTitle: {
      marginTop: 14,
      fontSize:
        hp(2.1),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .text,
      textAlign:
        "center",
    },

    emptyText: {
      marginTop: 6,
      fontSize:
        hp(1.6),
      color:
        theme.colors
          .textLight,
      textAlign:
        "center",
    },

    userRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingVertical: 10,
      borderBottomWidth:
        0.5,
      borderBottomColor:
        theme.colors
          .gray,
    },

    userMain: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
      marginRight: 10,
    },

    userInfo: {
      flex: 1,
    },

    userName: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .text,
    },

    userBio: {
      marginTop: 3,
      fontSize:
        hp(1.45),
      color:
        theme.colors
          .textLight,
    },

    followButton: {
      minWidth:
        wp(25),
      minHeight: 38,
      paddingHorizontal:
        12,
      borderRadius:
        theme.radius
          .md,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
    },

    followingButton: {
      backgroundColor:
        theme.colors
          .mistyRose,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
    },

    followButtonText: {
      fontSize:
        hp(1.45),
      fontWeight:
        theme.fonts
          .semibold,
      color: "white",
      textAlign:
        "center",
    },

    followingButtonText: {
      color:
        theme.colors
          .text,
    },
  });
