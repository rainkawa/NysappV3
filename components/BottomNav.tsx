import React, {
  useEffect,
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  usePathname,
  useRouter,
} from "expo-router";

import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  supabase,
} from "@/lib/supabase";

interface BottomNavProps {
  hide?: boolean;
}

const BottomNav = ({
  hide = false,
}: BottomNavProps) => {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const authContext =
    useAuth();

  const userId =
    authContext?.user
      ?.authInfo?.id;

  const [
    unreadDmCount,
    setUnreadDmCount,
  ] = useState(0);

  useEffect(() => {
    if (
      !userId ||
      hide
    ) {
      return;
    }

    let mounted = true;

    const refreshUnread =
      async () => {
        if (!mounted) {
          return;
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_unread_dm_count"
          );

        if (error) {
          console.warn(
            "BottomNav - unread DM error:",
            error.message
          );

          return;
        }

        if (mounted) {
          setUnreadDmCount(
            Number(data || 0)
          );
        }
      };

    void refreshUnread();

    const channel =
      supabase
        .channel(
          `dm-badge-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",
            schema:
              "public",
            table:
              "messages",
            filter:
              `sender_id=neq.${userId}`,
          },
          () => {
            void refreshUnread();
          }
        )
        .subscribe();

    return () => {
      mounted = false;

      supabase.removeChannel(
        channel
      );
    };
  }, [
    userId,
    hide,
  ]);

  if (
    hide ||
    pathname?.includes(
      "postDetails"
    ) ||
    pathname?.includes(
      "storyViewer"
    ) ||
    pathname?.includes(
      "storyShare"
    ) ||
    pathname?.includes(
      "editProfile"
    ) ||
    pathname?.includes(
      "profileSettings"
    ) ||
    pathname?.includes(
      "notifications"
    ) ||
    pathname?.includes(
      "followList"
    )
  ) {
    return null;
  }

  const image =
    authContext?.user
      ?.userData?.image;

  const isHome =
    pathname?.endsWith(
      "/home"
    ) ||
    pathname ===
      "/home";

  const isSearch =
    pathname?.endsWith(
      "/search"
    ) ||
    pathname ===
      "/search";

  const isNewPosts =
    pathname?.endsWith(
      "/newPosts"
    ) ||
    pathname ===
      "/newPosts";

  const isDm =
    pathname?.endsWith(
      "/dm"
    ) ||
    pathname ===
      "/dm";

  const isProfile =
    pathname?.endsWith(
      "/profile"
    ) ||
    pathname ===
      "/profile";

  const inactive =
    "#94A3B8";

  /*
   * Tabs route'larına navigate ediyoruz.
   * push/replace kullanılmadığı için her basışta
   * yeni ekran instance'ı oluşturulmaz.
   */

  const goToTab = (
    route:
      | "/home"
      | "/search"
      | "/newPosts"
      | "/dm"
      | "/profile"
  ) => {
    router.navigate(
      route
    );
  };

  return (
    <View
      style={styles.wrapper}
    >
      <View
        style={styles.bar}
      >
        <Pressable
          onPress={() =>
            goToTab(
              "/home"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <Icon
            name="home"
            size={hp(3)}
            strokeWidth={
              isHome
                ? 2.2
                : 1.7
            }
            color={
              isHome
                ? theme.colors
                    .primary
                : inactive
            }
          />
        </Pressable>

        <Pressable
          onPress={() =>
            goToTab(
              "/search"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <Icon
            name="search"
            size={hp(3)}
            strokeWidth={
              isSearch
                ? 2.2
                : 1.7
            }
            color={
              isSearch
                ? theme.colors
                    .primary
                : inactive
            }
          />
        </Pressable>

        <Pressable
          onPress={() =>
            goToTab(
              "/newPosts"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <View
            style={
              styles.createButton
            }
          >
            <Icon
              name="plus"
              size={hp(3)}
              strokeWidth={2.2}
              color={
                theme.colors
                  .text
              }
            />
          </View>
        </Pressable>

        <Pressable
          onPress={() =>
            goToTab(
              "/dm"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <View
            style={
              styles.iconWrap
            }
          >
            <Icon
              name="mail"
              size={hp(3)}
              strokeWidth={
                isDm
                  ? 2.2
                  : 1.7
              }
              color={
                isDm
                  ? theme.colors
                      .primary
                  : inactive
              }
            />

            {unreadDmCount >
              0 && (
              <View
                style={
                  styles.badge
                }
              >
                <Text
                  style={
                    styles.badgeText
                  }
                >
                  {unreadDmCount >
                  99
                    ? "99+"
                    : unreadDmCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() =>
            goToTab(
              "/profile"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          {image ? (
            <Avatar
              uri={image}
              size={hp(4.1)}
              rounded={
                theme.radius.sm
              }
              style={{
                borderWidth: 2,
                borderColor:
                  isProfile
                    ? theme.colors
                        .primary
                    : theme.colors
                        .gray,
              }}
            />
          ) : (
            <Icon
              name="user"
              size={hp(3)}
              strokeWidth={
                isProfile
                  ? 2.2
                  : 1.7
              }
              color={
                isProfile
                  ? theme.colors
                      .primary
                  : inactive
              }
            />
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default BottomNav;

const styles =
  StyleSheet.create({
    wrapper: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7.5),
      zIndex: 1000,
      elevation: 1000,
    },

    bar: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        wp(4),
      backgroundColor:
        theme.colors.card,
      borderTopWidth: 1,
      borderTopColor:
        theme.colors.gray,
    },

    item: {
      flex: 1,
      height: hp(7.5),
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    iconWrap: {
      position:
        "relative",
    },

    badge: {
      position:
        "absolute",
      right: -8,
      top: -8,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.rose,
      borderWidth: 1.5,
      borderColor:
        theme.colors.card,
    },

    badgeText: {
      color:
        theme.colors.text,
      fontSize: 9,
      fontWeight: "700",
      lineHeight: 10,
    },

    createButton: {
      width: hp(4.8),
      height: hp(4.8),
      borderRadius:
        hp(2.4),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
      borderWidth: 1,
      borderColor:
        theme.colors.primaryLight,
    },
  });
