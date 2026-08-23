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

import { theme } from "@/constants/theme";
import { hp, wp } from "@/helpers/common";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface BottomNavProps {
  hide?: boolean;
}

const BottomNav = ({
  hide = false,
}: BottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const authContext = useAuth();

  const userId =
    authContext?.user?.authInfo?.id;

  const [
    unreadDmCount,
    setUnreadDmCount,
  ] = useState(0);

  const refreshUnread =
    async () => {
      if (!userId) {
        return;
      }

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_unread_dm_count"
        );

      if (!error) {
        setUnreadDmCount(
          Number(data || 0)
        );
      }
    };

  useEffect(() => {
    if (
      !userId ||
      hide ||
      pathname === "/dm"
    ) {
      return;
    }

    refreshUnread();

    const channel =
      supabase
        .channel(
          `dm-badge-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          () => {
            refreshUnread();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    userId,
    hide,
    pathname,
  ]);

  if (
    hide ||
    pathname === "/dm" ||
    pathname?.includes(
      "postDetails"
    )
  ) {
    return null;
  }

  const image =
    authContext?.user
      ?.userData?.image;

  const isHome =
    pathname === "/home";

  const isSearch =
    pathname === "/search";

  const isProfile =
    pathname === "/profile";

  return (
    <View
      style={
        styles.wrapper
      }
    >
      <View
        style={
          styles.bar
        }
      >
        {/* HOME */}
        <Pressable
          onPress={() =>
            router.replace(
              "/home"
            )
          }
          style={
            styles.item
          }
          hitSlop={8}
        >
          <Icon
            name="home"
            size={hp(3.2)}
            strokeWidth={
              isHome
                ? 2.2
                : 1.7
            }
            color={
              isHome
                ? theme.colors
                    .textDark
                : theme.colors
                    .textLight
            }
          />
        </Pressable>

        {/* SEARCH */}
        <Pressable
          onPress={() =>
            router.push(
              "./search" as any
            )
          }
          style={
            styles.item
          }
          hitSlop={8}
        >
          <Icon
            name="search"
            size={hp(3.2)}
            strokeWidth={
              isSearch
                ? 2.2
                : 1.7
            }
            color={
              isSearch
                ? theme.colors
                    .textDark
                : theme.colors
                    .textLight
            }
          />
        </Pressable>

        {/* CREATE */}
        <Pressable
          onPress={() =>
            router.push(
              "/newPosts"
            )
          }
          style={
            styles.item
          }
          hitSlop={8}
        >
          <View
            style={
              styles.createButton
            }
          >
            <Icon
              name="plus"
              size={hp(3.2)}
              strokeWidth={2.2}
              color="white"
            />
          </View>
        </Pressable>

        {/* DM */}
        <Pressable
          onPress={() =>
            router.push(
              "/dm" as any
            )
          }
          style={
            styles.item
          }
          hitSlop={8}
        >
          <View
            style={
              styles.iconWrap
            }
          >
            <Icon
              name="mail"
              size={hp(3.2)}
              strokeWidth={1.7}
              color={
                theme.colors
                  .textLight
              }
            />

            {unreadDmCount > 0 && (
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

        {/* PROFILE */}
        <Pressable
          onPress={() =>
            router.push(
              "/profile"
            )
          }
          style={
            styles.item
          }
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
              }}
            />
          ) : (
            <Icon
              name="user"
              size={hp(3.2)}
              strokeWidth={
                isProfile
                  ? 2.2
                  : 1.7
              }
              color={
                isProfile
                  ? theme.colors
                      .textDark
                  : theme.colors
                      .textLight
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
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7),
      zIndex: 1000,
      elevation: 1000,
    },

    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7),
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: wp(4),
      backgroundColor: "white",
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        theme.colors.gray,
    },

    item: {
      flex: 1,
      height: hp(7),
      alignItems: "center",
      justifyContent:
        "center",
    },

    iconWrap: {
      position: "relative",
    },

    badge: {
      position: "absolute",
      right: -8,
      top: -8,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        theme.colors.rose,
      borderWidth: 1.5,
      borderColor: "white",
    },

    badgeText: {
      color: "white",
      fontSize: 9,
      fontWeight: "700",
      lineHeight: 10,
    },

    createButton: {
      width: hp(4.8),
      height: hp(4.8),
      borderRadius: hp(2.4),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        theme.colors.primary,
    },
  });
